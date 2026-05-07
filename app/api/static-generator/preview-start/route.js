// Preview-phase orchestrator. Generates 5 distinct scene previews — one per
// shot type (Bold Claim / Product Hero / Social Proof / Editorial / Lifestyle)
// using the ported SAMPLES_SYSTEM_PROMPT from /samples. Each preview has NO
// headline overlay — the team approves a scene and a separate /approve-scene
// run produces 5 ad variants for it (one per headline).
//
// Body: { clientId, productId?, aspectRatio?, productImageUrl? }
// Returns: { jobId, total: 5, prompts: string[5], shots: string[5] }

import { supabase } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHUNK = 1; // 1 image per invocation — keeps each call short
const LANES = 5; // all 5 previews fan out in parallel

export async function POST(req) {
  try {
    const body = await req.json();
    const { clientId, productId, aspectRatio = "1:1", productImageUrl = "" } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    // Step 1: ask Claude for 5 distinct scene prompts.
    const baseUrl = new URL(req.url);
    const promptsRes = await fetch(`${baseUrl.protocol}//${baseUrl.host}/api/static-generator/generate-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, productId, hasReferenceImage: !!productImageUrl }),
    });
    const promptsJson = await promptsRes.json();
    if (!promptsRes.ok || !Array.isArray(promptsJson?.prompts) || promptsJson.prompts.length < 5) {
      return Response.json({ error: promptsJson?.error || "Failed to generate scene prompts" }, { status: 500 });
    }
    const scenePrompts = promptsJson.prompts.slice(0, 5);
    const shots = promptsJson.shots || ["BOLD CLAIM", "PRODUCT HERO", "SOCIAL PROOF", "EDITORIAL", "LIFESTYLE"];

    // Step 2: create the job row.
    const total = scenePrompts.length;
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
      console.error("[preview-start] job insert failed", jobErr);
      return Response.json({ error: jobErr?.message || "Could not create job" }, { status: 500 });
    }

    // Stash phase + inputs on the job's `input` JSONB column. The status
    // route reads this back so the UI knows whether each row is a preview
    // or variants job and which scene it belongs to.
    try {
      await supabase.from("static_gen_jobs").update({
        input: { phase: "preview", scenePrompts, productImageUrl, shots },
      }).eq("id", job.id);
    } catch (e) { console.error("[preview-start] input column update failed", e?.message); }

    const chunkUrl = `${baseUrl.protocol}//${baseUrl.host}/api/static-generator`;
    const stride = LANES * CHUNK;
    for (let lane = 0; lane < LANES && lane * CHUNK < total; lane++) {
      const startOffset = lane * CHUNK;
      waitUntil(
        fetch(chunkUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId, productId, aspectRatio,
            phase: "preview",
            scenePrompts,
            shots,
            productImageUrl,
            offset: startOffset, limit: CHUNK,
            jobId: job.id,
            chain: { stride, total },
          }),
        }).catch((e) => console.error(`[preview-start] lane ${lane} failed`, e?.message))
      );
    }

    return Response.json({ jobId: job.id, total, prompts: scenePrompts, shots });
  } catch (e) {
    console.error("[preview-start]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
