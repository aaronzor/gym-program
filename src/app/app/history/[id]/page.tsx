import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { Icon } from "../../../../components/Icon";

type SetLog = {
  id: string;
  exercise_instance_id: string;
  set_number: number;
  kind: string;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
};

export default async function WorkoutHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const wiRes = await supabase
    .from("workout_instances")
    .select("id, workout_number, week_number, workout_index, performed_at")
    .eq("id", id)
    .single();
  if (wiRes.error) throw new Error(wiRes.error.message);

  const exRes = await supabase
    .from("exercise_instances")
    .select(
      "id, order_index, substitution_choice, performed_exercise_name, performed_video_url, exercise_template_id"
    )
    .eq("workout_instance_id", wiRes.data.id)
    .order("order_index", { ascending: true });
  if (exRes.error) throw new Error(exRes.error.message);

  const exIds = (exRes.data ?? []).map((e) => e.id);

  const setsRes = exIds.length
    ? await supabase
        .from("set_logs")
        .select("id, exercise_instance_id, set_number, kind, weight, unit, reps, rpe, notes")
        .in("exercise_instance_id", exIds)
        .order("kind", { ascending: true })
        .order("set_number", { ascending: true })
    : { data: [], error: null };

  if (setsRes.error) throw new Error(setsRes.error.message);

  const setsByExercise = new Map<string, SetLog[]>();
  for (const s of (setsRes.data ?? []) as SetLog[]) {
    const arr = setsByExercise.get(s.exercise_instance_id) ?? [];
    arr.push(s);
    setsByExercise.set(s.exercise_instance_id, arr);
  }

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div className="appBar">
        <div style={{ minWidth: 0 }}>
          <div className="appTitle">Workout</div>
          <div className="label" style={{ marginTop: 4 }}>
            Week {wiRes.data.week_number} · Workout {wiRes.data.workout_index} · {new Date(wiRes.data.performed_at).toLocaleString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btnIcon" href="/app/history" aria-label="Back" title="Back">
            <Icon name="chevronLeft" />
            <span className="srOnly">Back</span>
          </Link>
          <Link className="btn btnIcon" href="/app/run" aria-label="Run" title="Run">
            <Icon name="play" />
            <span className="srOnly">Run</span>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {(exRes.data ?? []).map((ex) => {
          const sets = setsByExercise.get(ex.id) ?? [];
          return (
            <div key={ex.id} className="card cardInset" style={{ padding: 14, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{ex.performed_exercise_name ?? "(unnamed)"}</div>
                <div className="label">{sets.length} logged sets</div>
              </div>

              {ex.substitution_choice && ex.substitution_choice !== "primary" ? (
                <div className="label" style={{ marginTop: 6 }}>
                  Substitution: {ex.substitution_choice}
                </div>
              ) : null}

              {ex.performed_video_url ? (
                <div style={{ marginTop: 10 }}>
                  <a className="btn" href={ex.performed_video_url} target="_blank" rel="noreferrer noopener">
                    Video
                  </a>
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {sets
                  .filter((s) => s.kind === "working")
                  .map((s) => (
                    <div key={s.id} className="label">
                      Set {s.set_number}: {s.weight ?? "-"}
                      {s.unit ?? ""} x {s.reps ?? "-"} @ {s.rpe ?? "-"}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
