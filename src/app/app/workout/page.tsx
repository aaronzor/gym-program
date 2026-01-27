import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { WorkoutRunner } from "./workoutRunner";
import { getUserSettings } from "../../../lib/settings";

function asInt(v: string | null, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  const i = Math.trunc(n);
  if (i < min || i > max) throw new Error("Out of range");
  return i;
}

export default async function WorkoutPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const week = asInt(typeof sp.week === "string" ? sp.week : null, 1, 12);
  const workoutIndex = asInt(typeof sp.workout === "string" ? sp.workout : null, 1, 4);

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

  // Ensure active run exists
  const runRes = await supabase
    .from("user_programs")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_template_id", programRes.data.id)
    .eq("status", "active")
    .maybeSingle();
  if (runRes.error) throw new Error(runRes.error.message);
  if (!runRes.data) redirect("/app/start");

  const weekRes = await supabase
    .from("week_templates")
    .select("id")
    .eq("program_template_id", programRes.data.id)
    .eq("week_number", week)
    .single();
  if (weekRes.error) throw new Error(weekRes.error.message);

  const workoutRes = await supabase
    .from("workout_templates")
    .select("id, label")
    .eq("week_template_id", weekRes.data.id)
    .eq("workout_index", workoutIndex)
    .single();
  if (workoutRes.error) throw new Error(workoutRes.error.message);

  const exercisesRes = await supabase
    .from("exercise_templates")
    .select(
      "id, order_index, name, warmup_sets_target, working_sets_target, reps_target, rpe_target, rest_target, notes, primary_video_url, sub1_name, sub1_video_url, sub2_name, sub2_video_url"
    )
    .eq("workout_template_id", workoutRes.data.id)
    .order("order_index", { ascending: true });
  if (exercisesRes.error) throw new Error(exercisesRes.error.message);

  const settings = await getUserSettings();

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{programRes.data.name}</h1>
          <div className="label" style={{ marginTop: 6 }}>
            Week {week}, Workout {workoutIndex}: {workoutRes.data.label}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href="/app/run">
            Back to run
          </Link>
          <Link className="btn" href={`/app/template/${week}`}>
            View template
          </Link>
        </div>
      </div>

      <WorkoutRunner
        programTemplateId={programRes.data.id}
        userProgramId={runRes.data.id}
        workoutNumber={(week - 1) * 4 + workoutIndex}
        label={workoutRes.data.label}
        exercises={exercisesRes.data}
        defaultUnit={settings.defaultUnit}
      />
    </div>
  );
}
