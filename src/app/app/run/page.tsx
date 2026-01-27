import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { Icon } from "../../../components/Icon";

function computeWeekAndWorkoutIndex(workoutNumber: number): { week: number; workoutIndex: number } {
  const week = Math.floor((workoutNumber - 1) / 4) + 1;
  const workoutIndex = ((workoutNumber - 1) % 4) + 1;
  return { week, workoutIndex };
}

export default async function ProgramRunPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const programRes = await supabase
    .from("program_templates")
    .select("id, name")
    .eq("slug", "essentials-4x")
    .single();
  if (programRes.error) throw new Error(programRes.error.message);

  const runRes = await supabase
    .from("user_programs")
    .select("id, started_at, status")
    .eq("user_id", user.id)
    .eq("program_template_id", programRes.data.id)
    .eq("status", "active")
    .maybeSingle();
  if (runRes.error) throw new Error(runRes.error.message);

  if (!runRes.data) redirect("/app/start");

  const countRes = await supabase
    .from("workout_instances")
    .select("id", { count: "exact", head: true })
    .eq("user_program_id", runRes.data.id);
  if (countRes.error) throw new Error(countRes.error.message);
  const completedCount = countRes.count ?? 0;
  const nextWorkoutNumber = completedCount + 1;

  const { week, workoutIndex } = computeWeekAndWorkoutIndex(nextWorkoutNumber);

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div className="appBar">
        <div style={{ minWidth: 0 }}>
          <div className="appTitle">Run</div>
          <div className="label" style={{ marginTop: 4 }}>
            {programRes.data.name}
          </div>
        </div>
        <Link className="btn btnIcon" href={`/app/template/${week}`} aria-label="Template" title="Template">
          <Icon name="sets" />
          <span className="srOnly">Template</span>
        </Link>
      </div>

      {error ? (
        <div
          className="card cardInset"
          style={{
            marginTop: 12,
            padding: 12,
            borderColor: "rgba(179, 83, 43, 0.25)",
            background: "rgba(179, 83, 43, 0.08)",
            boxShadow: "none"
          }}
        >
          <div style={{ fontWeight: 600 }}>Error</div>
          <div className="label" style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      ) : null}

      <div className="stack" style={{ marginTop: 16 }}>
        <div className="card cardActive" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Next workout</div>
              <div className="label" style={{ marginTop: 6 }}>
                Week {week} · Workout {workoutIndex} · completed {completedCount}/48
              </div>
            </div>
            <Link className="btn btnIcon" href="/app/history" aria-label="History" title="History">
              <Icon name="history" />
              <span className="srOnly">History</span>
            </Link>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <Link
              className="btn btnPrimary btnLg"
              href={`/app/workout?week=${week}&workout=${workoutIndex}`}
              style={{ justifyContent: "center" }}
            >
              Start workout
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link className="btn" href={`/app/template/${week}`} style={{ justifyContent: "center" }}>
                View week
              </Link>
              <Link className="btn" href="/app" style={{ justifyContent: "center" }}>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
