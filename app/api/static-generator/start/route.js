// Static Studio orchestrator. Creates a job row, returns its id immediately,
// then uses waitUntil() to fan out chunk requests server-side. Because the
// fan-out runs on Vercel (not the browser), it survives the user closing
// the tab, switching tabs, or backgrounding the window — all the things
// that throttle/kill in-browser parallel fetches.
//
// The UI polls /api/static-generator/status?id=<jobId> to render progress.

import { supabase } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      clientId, productId,
      headlines = [], imagePrompts = [],
      aspectRatio = "1:1",
    } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

    // We don't validate/derive defaults here — the chunk worker does that
    // anyway, and total can be safely computed as max(headlines,1) * max(prompts,1)
    // with brand-kit defaults filling in 5×5=25 when both are empty.
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

    // Fan out chunks server-side. Each chunk is its own serverless invocation
    // with its own 60s budget. Browser tab state is irrelevant — these are
    // server→server fetches inside Vercel's network.
    const CHUNK = 2;
    const offsets = [];
    for (let o = 0; o < total; o += CHUNK) offsets.push(o);

    const baseUrl = new URL(req.url);
    const chunkUrl = `${baseUrl.protocol}//${baseUrl.host}/api/static-generator`;

    waitUntil((async () => {
      try {
        await Promise.all(offsets.map(async (offset) => {
          try {
            const res = await fetch(chunkUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId, productId, headlines, imagePrompts, aspectRatio,
                offset, limit: CHUNK, jobId: job.id,
              }),
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              console.error(`[gen/start] chunk ${offset} HTTP ${res.status}: ${txt.slice(0, 200)}`);
            }
          } catch (e) {
            console.error(`[gen/start] chunk ${offset} threw`, e.message);
          }
        }));

        // After all chunks settle, mark the job done and copy the portal slug
        // (the chunk worker stamped portal_id on the portal_projects row but
        // not on the job — we look it up from the latest job state).
        const { data: latest } = await supabase
          .from("static_gen_jobs")
          .select("client_id, product_id, completed, failed, total")
          .eq("id", job.id)
          .maybeSingle();
        let portalSlug = null;
        let portalId = null;
        if (latest) {
          let q = supabase.from("portal_projects").select("id, slug").eq("client_id", latest.client_id);
          if (latest.product_id) q = q.eq("product_id", latest.product_id);
          const { data: portals } = await q;
          if (portals?.[0]) { portalSlug = portals[0].slug; portalId = portals[0].id; }
        }
        await supabase.from("static_gen_jobs").update({
          status: "done",
          portal_slug: portalSlug,
          portal_id: portalId,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
      } catch (e) {
        console.error("[gen/start] orchestrator failed", e);
        await supabase.from("static_gen_jobs").update({
          status: "error",
          error: e.message,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
      }
    })());

    return Response.json({ jobId: job.id, total });
  } catch (e) {
    console.error("[gen/start]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
