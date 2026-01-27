import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

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
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{programRes.data.name}</h1>
          <div className="label" style={{ marginTop: 6 }}>
            Active run · completed {completedCount}/48
          </div>
          <div className="label" style={{ marginTop: 2 }}>
            Next up: Week {week}, Workout {workoutIndex}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href={`/app/template/${week}`}>
            View week {week}
          </Link>
          <Link className="btn" href="/app">
            Dashboard
          </Link>
        </div>
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
          <div style={{ fontWeight: 600 }}>Error</div>
          <div className="label" style={{ marginTop: 4 }}>
            {error}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Next workout</h2>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btnPrimary" href={`/app/workout?week=${week}&workout=${workoutIndex}`}>
            Start workout
          </Link>
          <Link className="btn" href="/app/history">
            History
          </Link>
        </div>
      </div>
    </div>
  );
}
