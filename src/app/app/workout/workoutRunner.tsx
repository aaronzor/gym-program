import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { WorkoutRunnerClient } from "./workoutRunnerClient";

export type ExerciseRow = {
  id: string;
  order_index: number;
  name: string;
  warmup_sets_target: string | null;
  working_sets_target: number | null;
  reps_target: string | null;
  rpe_target: string | null;
  rest_target: string | null;
  notes: string | null;
  primary_video_url: string | null;
  sub1_name: string | null;
  sub1_video_url: string | null;
  sub2_name: string | null;
  sub2_video_url: string | null;
};

async function completeWorkoutAction(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userProgramId = String(formData.get("user_program_id") ?? "");
  const workoutNumber = Number(formData.get("workout_number") ?? NaN);
  const unit = String(formData.get("unit") ?? "lb");

  if (!userProgramId) redirect("/app/run?error=Missing%20user_program_id");
  if (!Number.isFinite(workoutNumber)) redirect("/app/run?error=Invalid%20workout_number");

  // Insert workout instance
  const wi = await supabase
    .from("workout_instances")
    .insert({
      user_program_id: userProgramId,
      workout_number: workoutNumber,
      performed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (wi.error) {
    redirect(`/app/run?error=${encodeURIComponent(wi.error.message)}`);
  }

  const workoutInstanceId = wi.data.id as string;

  // Collect exercise choices + build exercise_instances rows.
  const exerciseRows: Array<{
    workout_instance_id: string;
    exercise_template_id: string;
    order_index: number;
    substitution_choice: string;
    performed_exercise_name: string | null;
    performed_video_url: string | null;
  }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("ex_")) continue;
    // key format: ex_<orderIndex>_template_id
    const m = key.match(/^ex_(\d+)_template_id$/);
    if (!m) continue;
    const orderIndex = Number(m[1]);
    const templateId = String(value);
    const choice = String(formData.get(`ex_${orderIndex}_choice`) ?? "primary");
    const primaryName = String(formData.get(`ex_${orderIndex}_primary_name`) ?? "");
    const primaryVideo = String(formData.get(`ex_${orderIndex}_primary_video`) ?? "");
    const sub1Name = String(formData.get(`ex_${orderIndex}_sub1_name`) ?? "");
    const sub1Video = String(formData.get(`ex_${orderIndex}_sub1_video`) ?? "");
    const sub2Name = String(formData.get(`ex_${orderIndex}_sub2_name`) ?? "");
    const sub2Video = String(formData.get(`ex_${orderIndex}_sub2_video`) ?? "");

    let performedName: string | null = primaryName || null;
    let performedVideo: string | null = primaryVideo || null;

    if (choice === "sub1") {
      performedName = sub1Name || performedName;
      performedVideo = sub1Video || performedVideo;
    } else if (choice === "sub2") {
      performedName = sub2Name || performedName;
      performedVideo = sub2Video || performedVideo;
    }

    exerciseRows.push({
      workout_instance_id: workoutInstanceId,
      exercise_template_id: templateId,
      order_index: orderIndex,
      substitution_choice: choice,
      performed_exercise_name: performedName,
      performed_video_url: performedVideo
    });
  }

  exerciseRows.sort((a, b) => a.order_index - b.order_index);

  const ei = await supabase
    .from("exercise_instances")
    .insert(exerciseRows)
    .select("id, order_index")
    .order("order_index", { ascending: true });
  if (ei.error) {
    redirect(`/app/run?error=${encodeURIComponent(ei.error.message)}`);
  }

  const exerciseInstanceIdByOrder = new Map<number, string>();
  for (const row of ei.data ?? []) {
    exerciseInstanceIdByOrder.set(row.order_index as number, row.id as string);
  }

  // Collect working set logs
  const setRows: Array<Record<string, unknown>> = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^log_(\d+)_set_(\d+)_(weight|reps|rpe)$/);
    if (!m) continue;
    const orderIndex = Number(m[1]);
    const setNumber = Number(m[2]);
    const field = m[3];

    const eiId = exerciseInstanceIdByOrder.get(orderIndex);
    if (!eiId) continue;

    // We'll assemble rows by composite key
    const rowKey = `${eiId}:working:${setNumber}`;
    let row = setRows.find((r) => r.__key === rowKey);
    if (!row) {
      row = {
        __key: rowKey,
        exercise_instance_id: eiId,
        kind: "working",
        set_number: setNumber,
        unit
      };
      setRows.push(row);
    }

    const str = String(value).trim();
    if (str === "") continue;
    if (field === "weight") {
      const n = Number(str);
      if (Number.isFinite(n)) row.weight = n;
    } else if (field === "reps") {
      const n = Number(str);
      if (Number.isFinite(n)) row.reps = Math.trunc(n);
    } else if (field === "rpe") {
      const n = Number(str);
      if (Number.isFinite(n)) row.rpe = n;
    }
  }

  const filtered = setRows
    .map(({ __key, ...rest }) => rest)
    .filter((r) => (r.weight ?? r.reps ?? r.rpe) != null);

  if (filtered.length) {
    const ins = await supabase.from("set_logs").insert(filtered);
    if (ins.error) {
      redirect(`/app/run?error=${encodeURIComponent(ins.error.message)}`);
    }
  }

  redirect("/app/run");
}

export function WorkoutRunner({
  userProgramId,
  workoutNumber,
  label,
  exercises
}: {
  userProgramId: string;
  workoutNumber: number;
  label: string;
  exercises: ExerciseRow[];
}) {
  return (
    <WorkoutRunnerClient
      userProgramId={userProgramId}
      workoutNumber={workoutNumber}
      label={label}
      exercises={exercises}
      completeWorkoutAction={completeWorkoutAction}
    />
  );
}
