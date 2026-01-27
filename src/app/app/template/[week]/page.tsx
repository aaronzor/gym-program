import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { TemplateWeekClient, TemplateWorkout } from "./TemplateWeekClient";

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
      "id, workout_template_id, order_index, name, warmup_sets_target, working_sets_target, reps_target, rpe_target, rest_target, notes, primary_video_url, sub1_name, sub1_video_url, sub2_name, sub2_video_url"
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

  const workouts: TemplateWorkout[] = workoutsRes.data.map((w) => ({
    id: w.id,
    workout_index: w.workout_index,
    label: w.label,
    exercises: (exByWorkout.get(w.id) ?? []).map((ex) => ({
      id: ex.id,
      order_index: ex.order_index,
      name: ex.name,
      warmup_sets_target: ex.warmup_sets_target,
      working_sets_target: ex.working_sets_target,
      reps_target: ex.reps_target,
      rpe_target: ex.rpe_target,
      rest_target: ex.rest_target,
      notes: ex.notes,
      primary_video_url: ex.primary_video_url,
      sub1_name: ex.sub1_name,
      sub1_video_url: ex.sub1_video_url,
      sub2_name: ex.sub2_name,
      sub2_video_url: ex.sub2_video_url
    }))
  }));

  return <TemplateWeekClient weekNumber={weekNumber} programName={programRes.data.name} workouts={workouts} />;
}
