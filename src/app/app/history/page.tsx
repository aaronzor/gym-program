import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function labelForWorkoutIndex(workoutIndex: number): "Upper" | "Lower" {
  return workoutIndex % 2 === 1 ? "Upper" : "Lower";
}

export default async function HistoryPage() {
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

  const runsRes = await supabase
    .from("user_programs")
    .select("id, started_at, status")
    .eq("user_id", user.id)
    .eq("program_template_id", programRes.data.id)
    .order("started_at", { ascending: false });
  if (runsRes.error) throw new Error(runsRes.error.message);

  const runIds = (runsRes.data ?? []).map((r) => r.id);
  if (runIds.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 34 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>History</h1>
            <div className="label" style={{ marginTop: 6 }}>
              No program runs yet.
            </div>
          </div>
          <Link className="btn" href="/app">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const workoutsRes = await supabase
    .from("workout_instances")
    .select("id, user_program_id, workout_number, week_number, workout_index, performed_at")
    .in("user_program_id", runIds)
    .order("performed_at", { ascending: false })
    .limit(200);
  if (workoutsRes.error) throw new Error(workoutsRes.error.message);

  const runMetaById = new Map<string, { started_at: string; status: string }>();
  for (const r of runsRes.data ?? []) {
    runMetaById.set(r.id, { started_at: r.started_at, status: r.status });
  }

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>History</h1>
          <div className="label" style={{ marginTop: 6 }}>
            {programRes.data.name} · across all runs
          </div>
        </div>
        <Link className="btn" href="/app">
          Dashboard
        </Link>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {(workoutsRes.data ?? []).map((w) => {
          const meta = runMetaById.get(w.user_program_id);
          const label = labelForWorkoutIndex(w.workout_index);
          return (
            <Link
              key={w.id}
              href={`/app/history/${w.id}`}
              className="card cardInset"
              style={{
                padding: 14,
                textDecoration: "none",
                boxShadow: "none",
                display: "grid",
                gap: 6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>
                  Week {w.week_number}, Workout {w.workout_index}: {label}
                </div>
                <div className="label">{new Date(w.performed_at).toLocaleString()}</div>
              </div>
              {meta ? (
                <div className="label">
                  Run started: {new Date(meta.started_at).toLocaleDateString()} · status: {meta.status}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
