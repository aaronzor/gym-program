import { createClient } from "@supabase/supabase-js";
import { ProgramTemplate } from "./types.js";

type PersistOptions = {
  supabaseUrl: string;
  serviceRoleKey: string;
  force: boolean;
};

export async function persistTemplate(template: ProgramTemplate, opts: PersistOptions): Promise<void> {
  const supabase = createClient(opts.supabaseUrl, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const slug = template.program.slug;

  const existing = await supabase
    .from("program_templates")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data && !opts.force) {
    throw new Error(
      `program_templates with slug '${slug}' already exists. Re-run with --force to delete and re-import.`
    );
  }

  if (existing.data && opts.force) {
    const del = await supabase.from("program_templates").delete().eq("slug", slug);
    if (del.error) throw del.error;
  }

  const insProgram = await supabase
    .from("program_templates")
    .insert({
      slug: template.program.slug,
      name: template.program.name,
      weeks: template.program.weeks
    })
    .select("id")
    .single();
  if (insProgram.error) throw insProgram.error;
  const programId = insProgram.data.id as string;

  const weekRows = template.weeks.map((w) => ({
    program_template_id: programId,
    week_number: w.weekNumber
  }));

  const insWeeks = await supabase
    .from("week_templates")
    .insert(weekRows)
    .select("id, week_number");
  if (insWeeks.error) throw insWeeks.error;

  const weekIdByNumber = new Map<number, string>();
  for (const row of insWeeks.data ?? []) {
    weekIdByNumber.set(row.week_number as number, row.id as string);
  }

  const workoutRows: Array<{ week_template_id: string; workout_index: number; label: string }> = [];
  for (const week of template.weeks) {
    const weekId = weekIdByNumber.get(week.weekNumber);
    if (!weekId) throw new Error(`Missing week_templates id for week ${week.weekNumber}`);
    for (const wo of week.workouts) {
      workoutRows.push({ week_template_id: weekId, workout_index: wo.workoutIndex, label: wo.label });
    }
  }

  const insWorkouts = await supabase
    .from("workout_templates")
    .insert(workoutRows)
    .select("id, week_template_id, workout_index");
  if (insWorkouts.error) throw insWorkouts.error;

  const workoutIdByKey = new Map<string, string>();
  for (const row of insWorkouts.data ?? []) {
    const weekTemplateId = row.week_template_id as string;
    const workoutIndex = row.workout_index as number;
    workoutIdByKey.set(`${weekTemplateId}:${workoutIndex}`, row.id as string);
  }

  const exerciseRows: Array<Record<string, unknown>> = [];
  for (const week of template.weeks) {
    const weekId = weekIdByNumber.get(week.weekNumber);
    if (!weekId) throw new Error(`Missing week_templates id for week ${week.weekNumber}`);
    for (const wo of week.workouts) {
      const workoutId = workoutIdByKey.get(`${weekId}:${wo.workoutIndex}`);
      if (!workoutId) {
        throw new Error(`Missing workout_templates id for week ${week.weekNumber} workout ${wo.workoutIndex}`);
      }
      for (const ex of wo.exercises) {
        exerciseRows.push({
          workout_template_id: workoutId,
          order_index: ex.orderIndex,
          name: ex.name,
          warmup_sets_target: ex.warmupSetsTarget ?? null,
          working_sets_target: ex.workingSetsTarget ?? null,
          reps_target: ex.repsTarget ?? null,
          rpe_target: ex.rpeTarget ?? null,
          rest_target: ex.restTarget ?? null,
          notes: ex.notes ?? null,
          primary_video_url: ex.primaryVideoUrl ?? null,
          sub1_name: ex.sub1Name ?? null,
          sub1_video_url: ex.sub1VideoUrl ?? null,
          sub2_name: ex.sub2Name ?? null,
          sub2_video_url: ex.sub2VideoUrl ?? null
        });
      }
    }
  }

  // Insert in chunks to avoid payload limits.
  const chunkSize = 200;
  for (let i = 0; i < exerciseRows.length; i += chunkSize) {
    const chunk = exerciseRows.slice(i, i + chunkSize);
    const ins = await supabase.from("exercise_templates").insert(chunk);
    if (ins.error) throw ins.error;
  }
}
