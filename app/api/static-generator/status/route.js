// Polled by Static Studio UI to render live progress. The orchestrator
// (/api/static-generator/start) writes to this row from a waitUntil() block
// that runs server-side, so the row keeps updating even when the user closes
// or backgrounds the browser tab.

import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    const { data: job, error } = await supabase
      .from("static_gen_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!job) return Response.json({ error: "job not found" }, { status: 404 });

    // Self-heal stale jobs: if status is "running" but every task has resolved
    // (completed + failed === total), the orchestrator's waitUntil() must have
    // been cut short before the final "done" write. Mark it done now so the
    // UI stops polling. Same heal if the row hasn't been touched in 10 min.
    if (job.status === "running") {
      const settled = (job.completed || 0) + (job.failed || 0) >= (job.total || 0) && (job.total || 0) > 0;
      const stale = job.updated_at && Date.now() - new Date(job.updated_at).getTime() > 10 * 60 * 1000;
      if (settled || stale) {
        let portalSlug = job.portal_slug;
        let portalId = job.portal_id;
        if (!portalSlug) {
          let q = supabase.from("portal_projects").select("id, slug").eq("client_id", job.client_id);
          if (job.product_id) q = q.eq("product_id", job.product_id);
          const { data: portals } = await q;
          if (portals?.[0]) { portalSlug = portals[0].slug; portalId = portals[0].id; }
        }
        await supabase.from("static_gen_jobs").update({
          status: stale && !settled ? "error" : "done",
          error: stale && !settled ? "Generation timed out. Partial results saved." : null,
          portal_slug: portalSlug,
          portal_id: portalId,
          updated_at: new Date().toISOString(),
        }).eq("id", id);
        job.status = stale && !settled ? "error" : "done";
        job.portal_slug = portalSlug;
        job.portal_id = portalId;
      }
    }

    return Response.json({
      id: job.id,
      status: job.status,
      total: job.total,
      completed: job.completed,
      failed: job.failed,
      images: job.images || [],
      failures: job.failures || [],
      portalSlug: job.portal_slug,
      portalId: job.portal_id,
      aspectRatio: job.aspect_ratio,
      error: job.error,
      done: job.status !== "running",
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
