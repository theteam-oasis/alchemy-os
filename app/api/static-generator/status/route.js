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
