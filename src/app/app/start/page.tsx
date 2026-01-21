import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

async function startProgramAction(formData: FormData) {
  "use server";
  const startedAt = String(formData.get("started_at") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const programRes = await supabase
    .from("program_templates")
    .select("id")
    .eq("slug", "essentials-4x")
    .single();
  if (programRes.error) redirect(`/app/start?error=${encodeURIComponent(programRes.error.message)}`);

  // Avoid multiple active runs for now
  const existing = await supabase
    .from("user_programs")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_template_id", programRes.data.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing.error) redirect(`/app/start?error=${encodeURIComponent(existing.error.message)}`);

  if (existing.data) {
    redirect("/app/run");
  }

  const ins = await supabase.from("user_programs").insert({
    user_id: user.id,
    program_template_id: programRes.data.id,
    started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
    status: "active"
  });
  if (ins.error) redirect(`/app/start?error=${encodeURIComponent(ins.error.message)}`);

  redirect("/app/run");
}

export default async function StartProgramPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div className="card" style={{ padding: 18, maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Start program</h1>
          <Link className="btn" href="/app">
            Back
          </Link>
        </div>

        {error ? (
          <div
            className="card"
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "rgba(179, 83, 43, 0.10)",
              borderColor: "rgba(179, 83, 43, 0.25)",
              boxShadow: "none"
            }}
          >
            <div style={{ fontWeight: 600 }}>Couldn’t start program</div>
            <div className="label" style={{ marginTop: 4 }}>
              {error}
            </div>
          </div>
        ) : null}

        <form action={startProgramAction} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div>
            <div className="label">Start date</div>
            <input className="input" name="started_at" type="date" defaultValue={defaultDate} />
          </div>
          <button className="btn btnPrimary" type="submit">
            Start
          </button>
        </form>

        <div className="label" style={{ marginTop: 12 }}>
          Completion-based progression: week advances after 4 workouts.
        </div>
      </div>
    </div>
  );
}
