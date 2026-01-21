import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { VideoModal } from "../../../../components/VideoModal";

function weekNumberFromParam(param: string): number {
  const n = Number(param);
  if (!Number.isFinite(n) || n < 1 || n > 12) throw new Error("Invalid week number");
  return Math.trunc(n);
}

export default async function WeekTemplatePage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekParam } = await params;
  const weekNumber = weekNumberFromParam(weekParam);

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

  const weekRes = await supabase
    .from("week_templates")
    .select("id")
    .eq("program_template_id", programRes.data.id)
    .eq("week_number", weekNumber)
    .single();
  if (weekRes.error) throw new Error(weekRes.error.message);

  const workoutsRes = await supabase
    .from("workout_templates")
    .select("id, workout_index, label")
    .eq("week_template_id", weekRes.data.id)
    .order("workout_index", { ascending: true });
  if (workoutsRes.error) throw new Error(workoutsRes.error.message);

  // fetch all exercises for those workouts, grouped by workout id
  const workoutIds = workoutsRes.data.map((w) => w.id);
  const exercisesRes = await supabase
    .from("exercise_templates")
    .select(
      "workout_template_id, order_index, name, warmup_sets_target, working_sets_target, reps_target, rpe_target, rest_target, notes, primary_video_url, sub1_name, sub1_video_url, sub2_name, sub2_video_url"
    )
    .in("workout_template_id", workoutIds)
    .order("order_index", { ascending: true });
  if (exercisesRes.error) throw new Error(exercisesRes.error.message);

  const exByWorkout = new Map<string, typeof exercisesRes.data>();
  for (const ex of exercisesRes.data) {
    const arr = exByWorkout.get(ex.workout_template_id) ?? [];
    arr.push(ex);
    exByWorkout.set(ex.workout_template_id, arr);
  }

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{programRes.data.name}</h1>
          <div className="label" style={{ marginTop: 6 }}>
            Week {weekNumber}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn" href="/app/template">
            All weeks
          </Link>
          <Link className="btn" href="/app">
            Dashboard
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
        {workoutsRes.data.map((w) => (
          <div key={w.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                Workout {w.workout_index}: {w.label}
              </h2>
              <div className="label">{(exByWorkout.get(w.id) ?? []).length} exercises</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {(exByWorkout.get(w.id) ?? []).map((ex) => (
                <div
                  key={`${w.id}:${ex.order_index}`}
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: 10
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    <div className="label">
                      warmups {ex.warmup_sets_target ?? "-"} · sets {ex.working_sets_target ?? "-"} · reps{" "}
                      {ex.reps_target ?? "-"} · RPE {ex.rpe_target ?? "-"}
                    </div>
                  </div>
                  {ex.notes ? (
                    <div className="label" style={{ marginTop: 6 }}>
                      {ex.notes}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <VideoModal url={ex.primary_video_url} label="Primary" />
                    {ex.sub1_name ? <VideoModal url={ex.sub1_video_url} label={ex.sub1_name} /> : null}
                    {ex.sub2_name ? <VideoModal url={ex.sub2_video_url} label={ex.sub2_name} /> : null}
                    {ex.rest_target ? <span className="label">Rest: {ex.rest_target}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
