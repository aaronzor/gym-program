import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Icon } from "../../components/Icon";

function computeWeekAndWorkoutIndex(workoutNumber: number): { week: number; workoutIndex: number } {
  const week = Math.floor((workoutNumber - 1) / 4) + 1;
  const workoutIndex = ((workoutNumber - 1) % 4) + 1;
  return { week, workoutIndex };
}

async function signOutAction() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Invite gate: if user isn't invited, RLS blocks template reads.
  const program = await supabase
    .from("program_templates")
    .select("id, slug, name, weeks")
    .eq("slug", "essentials-4x")
    .maybeSingle();

  if (program.error) {
    return (
      <div className="container" style={{ paddingTop: 34 }}>
        <div className="card" style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>Access blocked</h1>
          <div className="label">
            Your account exists, but you’re not on the allowlist (or Supabase returned an error). Ask the admin to add
            your email to `invited_emails`.
          </div>
          <div className="label" style={{ marginTop: 10 }}>
            Error: {program.error.message}
          </div>
          <form action={signOutAction} style={{ marginTop: 16 }}>
            <button className="btn btnDanger" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  const programId = program.data?.id as string | undefined;

  const activeRun = programId
    ? await supabase
        .from("user_programs")
        .select("id")
        .eq("user_id", user.id)
        .eq("program_template_id", programId)
        .eq("status", "active")
        .maybeSingle()
    : { data: null, error: null };

  if (activeRun.error) {
    throw new Error(activeRun.error.message);
  }

  const completedCount = activeRun.data
    ? (
        await supabase
          .from("workout_instances")
          .select("id", { count: "exact", head: true })
          .eq("user_program_id", activeRun.data.id)
      ).count ?? 0
    : 0;

  const nextWorkoutNumber = completedCount + 1;
  const next = computeWeekAndWorkoutIndex(nextWorkoutNumber);

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div className="appBar">
        <div style={{ minWidth: 0 }}>
          <div className="appTitle">Gym Program</div>
          <div className="label" style={{ marginTop: 4 }}>
            {user.email}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btnIcon" href="/app/settings" aria-label="Settings" title="Settings">
            <Icon name="settings" />
            <span className="srOnly">Settings</span>
          </Link>
          <form action={signOutAction}>
            <button className="btn btnIcon" type="submit" aria-label="Sign out" title="Sign out">
              <Icon name="x" />
              <span className="srOnly">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <div className="card cardActive" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{program.data?.name ?? "Essentials 4x"}</div>
              <div className="label" style={{ marginTop: 6 }}>
                {activeRun.data ? (
                  <>Progress {completedCount}/48 · Next Week {next.week} / Workout {next.workoutIndex}</>
                ) : (
                  <>No active run</>
                )}
              </div>
            </div>
            <Link className="btn btnIcon" href="/app/history" aria-label="History" title="History">
              <Icon name="history" />
              <span className="srOnly">History</span>
            </Link>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {activeRun.data ? (
              <Link
                className="btn btnPrimary btnLg"
                href={`/app/workout?week=${next.week}&workout=${next.workoutIndex}`}
                style={{ justifyContent: "center" }}
              >
                Start workout
              </Link>
            ) : (
              <Link className="btn btnPrimary btnLg" href="/app/start" style={{ justifyContent: "center" }}>
                Start program
              </Link>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link className="btn" href="/app/run" style={{ justifyContent: "center" }}>
                Run
              </Link>
              <Link className="btn" href="/app/template" style={{ justifyContent: "center" }}>
                Template
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
