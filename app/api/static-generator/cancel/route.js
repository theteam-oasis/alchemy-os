// Cancel a running Static Studio job. Sets status='cancelled' on the job row.
// In-flight chunk workers check this status at the top of each task and bail
// out cleanly, so any tasks already in mid-Gemini-call still finish (we don't
// abort fetches mid-flight to avoid orphaned uploads), but no new tasks start.
//
// Body: { jobId }

import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { jobId } = body || {};
    if (!jobId) return Response.json({ error: "jobId required" }, { status: 400 });

    // Only flip status if currently running — don't stomp 'done' or already-cancelled.
    const { data: job } = await supabase
      .from("static_gen_jobs")
      .select("id, status, completed, failed, total")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return Response.json({ error: "job not found" }, { status: 404 });
    if (job.status !== "running") {
      return Response.json({ ok: true, status: job.status, alreadySettled: true });
    }

    await supabase
      .from("static_gen_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return Response.json({ ok: true, status: "cancelled" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
