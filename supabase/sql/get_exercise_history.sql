-- Returns recent workout sessions for a single exercise name.
-- Order is newest -> oldest.
-- "Last set" is defined as the last WORKING set logged (max set_number) for that session.

create or replace function public.get_exercise_history(
  program_template_id uuid,
  exercise_name text,
  limit_n int default 12,
  offset_n int default 0
)
returns table (
  performed_exercise_name text,
  performed_at timestamptz,
  workout_instance_id uuid,
  last_set jsonb,
  sets jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with user_runs as (
    select up.id
    from public.user_programs up
    where up.user_id = auth.uid()
      and up.program_template_id = get_exercise_history.program_template_id
  ),
  sessions as (
    select
      ei.performed_exercise_name,
      wi.performed_at,
      wi.id as workout_instance_id,
      ei.id as exercise_instance_id
    from public.workout_instances wi
    join user_runs ur on ur.id = wi.user_program_id
    join public.exercise_instances ei on ei.workout_instance_id = wi.id
    where ei.performed_exercise_name = get_exercise_history.exercise_name
    order by wi.performed_at desc
    limit greatest(1, get_exercise_history.limit_n)
    offset greatest(0, get_exercise_history.offset_n)
  ),
  working as (
    select
      s.performed_exercise_name,
      s.performed_at,
      s.workout_instance_id,
      jsonb_agg(
        jsonb_build_object(
          'set_number', sl.set_number,
          'weight', sl.weight,
          'reps', sl.reps,
          'rpe', sl.rpe,
          'unit', sl.unit
        )
        order by sl.set_number asc
      ) filter (where sl.set_number is not null) as sets,
      (jsonb_agg(
        jsonb_build_object(
          'set_number', sl.set_number,
          'weight', sl.weight,
          'reps', sl.reps,
          'rpe', sl.rpe,
          'unit', sl.unit
        )
        order by sl.set_number desc
      ) filter (where sl.set_number is not null)->0) as last_set
    from sessions s
    left join public.set_logs sl
      on sl.exercise_instance_id = s.exercise_instance_id
     and sl.kind = 'working'
     and (sl.weight is not null or sl.reps is not null or sl.rpe is not null)
    group by s.performed_exercise_name, s.performed_at, s.workout_instance_id
  )
  select
    w.performed_exercise_name,
    w.performed_at,
    w.workout_instance_id,
    w.last_set,
    coalesce(w.sets, '[]'::jsonb) as sets
  from working w
  order by w.performed_at desc;
$$;

revoke all on function public.get_exercise_history(uuid, text, int, int) from public;
grant execute on function public.get_exercise_history(uuid, text, int, int) to authenticated;
