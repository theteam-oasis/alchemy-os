// Approve-scene orchestrator. Given a previously-approved preview scene
// (its scene prompt, the matching shot type, and the team's 5 headlines),
// generates 5 ad VARIANTS — same scene rendered with each headline overlaid.
//
// Body: {
//   clientId, productId?,
//   scenePrompt,                 // the prompt that produced the approved preview
//   shot,                        // shot label (BOLD CLAIM / PRODUCT HERO / etc.)
//   headlines: string[5],        // 5 headlines to overlay
//   aspectRatio?, productImageUrl?,
//   parentJobId?,                // preview job id (for traceability)
//   approvedSceneIndex?,         // 0..4 index of the approved scene
// }
// Returns: { jobId, total: 5 }

import { supabase } from "@/lib/supabase";
import { waitUntil } from "@vercel/functions";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHUNK = 1;
const LANES = 5;

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      clientId, productId,
      scenePrompt, shot,
      headlines = [],
      aspectRatio = "1:1",
      productImageUrl = "",
      parentJobId, approvedSceneIndex,
    } = body || {};
    if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });
    if (!scenePrompt) return Response.json({ error: "scenePrompt required" }, { status: 400 });

    // Filter + pad headlines so we ALWAYS render exactly 5 variants per
    // approved scene, displayed on one line in the UI.
    const validHeadlines = headlines.map((h) => String(h || "").trim()).filter(Boolean);
    const GENERIC_HEADLINES = ["Designed for you.", "Built different.", "Try it once.", "Made better.", "The everyday upgrade."];
    while (validHeadlines.length < 5) {
      const next = GENERIC_HEADLINES.find((g) => !validHeadlines.includes(g));
      if (!next) break;
      validHeadlines.push(next);
    }
    validHeadlines.length = 5; // hard cap

    const total = 5;
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
      console.error("[approve-scene] job insert failed", jobErr);
      return Response.json({ error: jobErr?.message || "Could not create job" }, { status: 500 });
    }

    try {
      await supabase.from("static_gen_jobs").update({
        input: {
          phase: "variants",
          scenePrompt, shot,
          headlines: validHeadlines,
          productImageUrl,
          parentJobId: parentJobId || null,
          approvedSceneIndex: Number.isFinite(approvedSceneIndex) ? approvedSceneIndex : null,
        },
      }).eq("id", job.id);
    } catch (e) { console.error("[approve-scene] input column update failed", e?.message); }

    const baseUrl = new URL(req.url);
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
            phase: "variants",
            scenePrompt, shot,
            headlines: validHeadlines,
            productImageUrl,
            offset: startOffset, limit: CHUNK,
            jobId: job.id,
            chain: { stride, total },
          }),
        }).catch((e) => console.error(`[approve-scene] lane ${lane} failed`, e?.message))
      );
    }

    return Response.json({ jobId: job.id, total });
  } catch (e) {
    console.error("[approve-scene]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
