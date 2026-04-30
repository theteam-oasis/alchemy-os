// Static Studio orchestrator. Creates a job row, returns its jobId immediately,
// then kicks off N parallel "lanes" of chunk processing. Each chunk processes
// 2 images (~10-15s) then fires the NEXT chunk in its lane before returning,
// so each individual serverless invocation is short and well under the 60s
// function timeout. The chain runs entirely server-side and survives tab
// close, browser navigation, and backgrounding.
//
// UI polls /api/static-generator/status?id=<jobId> for live progress.

import { supabase } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";

export const runtime = "nodejs";
export const maxDuration = 30;

// Tuning knobs:
// - CHUNK: images per invocation. Keep small so each call is well under 60s.
// - LANES: parallel chains. More lanes = faster wall time but more concurrent
//   Gemini calls (watch the rate limit). 4 lanes × CHUNK=2 = 8 concurrent gens.
const CHUNK = 2;
const LANES = 4;

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      clientId, productId,
      headlines = [], imagePrompts = [],
      aspectRatio = "1:1",
    } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    const hCount = headlines.filter((h) => String(h || "").trim()).length || 5;
    const pCount = imagePrompts.filter((p) => String(p || "").trim()).length || 5;
    const total = hCount * pCount;

    const { data: job, error: jobErr } = await supabase
      .from("static_gen_jobs")
      .insert({
        client_id: clientId,
        product_id: productId || null,
        total,
        aspect_ratio: aspectRatio,
        status: "running",
      })
      .select()
      .single();
    if (jobErr || !job) {
      console.error("[gen/start] job insert failed", jobErr);
      return Response.json({ error: jobErr?.message || "Could not create job" }, { status: 500 });
    }

    // Stash inputs on the job so each chained chunk can read them without us
    // having to thread them through every fetch body. (We keep the inputs on
    // the body too as a fast path, but the job row is the source of truth.)
    // Note: this requires an `input` jsonb column. We tolerate missing column
    // by ignoring update errors — chunks then fall back to their fetch body.
    try {
      await supabase.from("static_gen_jobs").update({
        // @ts-ignore - tolerate missing column
        input: { headlines, imagePrompts },
      }).eq("id", job.id);
    } catch (e) { /* column may not exist; OK */ }

    const baseUrl = new URL(req.url);
    const chunkUrl = `${baseUrl.protocol}//${baseUrl.host}/api/static-generator`;

    // Kick off one fetch per lane. Each chunk handler will chain to the next
    // chunk in its lane via its own waitUntil() before returning.
    const offsets = [];
    for (let i = 0; i < total; i += CHUNK) offsets.push(i);
    const stride = LANES * CHUNK;

    for (let lane = 0; lane < LANES && lane * CHUNK < total; lane++) {
      const startOffset = lane * CHUNK;
      waitUntil(
        fetch(chunkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId, productId, headlines, imagePrompts, aspectRatio,
            offset: startOffset, limit: CHUNK,
            jobId: job.id,
            chain: { stride, total },
          }),
        }).catch((e) => console.error(`[gen/start] lane ${lane} dispatch failed`, e?.message))
      );
    }

    return Response.json({ jobId: job.id, total });
  } catch (e) {
    console.error("[gen/start]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
