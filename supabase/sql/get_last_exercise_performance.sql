-- Returns the most recent logged performance for each requested exercise name.
-- "Last set" is defined as the last WORKING set logged (max set_number) for that last session.

create or replace function public.get_last_exercise_performance(
  program_template_id uuid,
  exercise_names text[]
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
      and up.program_template_id = get_last_exercise_performance.program_template_id
  ),
  matches as (
    select
      ei.performed_exercise_name,
      wi.performed_at,
      wi.id as workout_instance_id,
      ei.id as exercise_instance_id
    from public.workout_instances wi
    join user_runs ur on ur.id = wi.user_program_id
    join public.exercise_instances ei on ei.workout_instance_id = wi.id
    where ei.performed_exercise_name = any(get_last_exercise_performance.exercise_names)
  ),
  latest as (
    select distinct on (m.performed_exercise_name)
      m.performed_exercise_name,
      m.performed_at,
      m.workout_instance_id,
      m.exercise_instance_id
    from matches m
    order by m.performed_exercise_name, m.performed_at desc
  ),
  working as (
    select
      l.performed_exercise_name,
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
    from latest l
    left join public.set_logs sl
      on sl.exercise_instance_id = l.exercise_instance_id
     and sl.kind = 'working'
     and (sl.weight is not null or sl.reps is not null or sl.rpe is not null)
    group by l.performed_exercise_name
  )
  select
    l.performed_exercise_name,
    l.performed_at,
    l.workout_instance_id,
    w.last_set,
    coalesce(w.sets, '[]'::jsonb) as sets
  from latest l
  left join working w on w.performed_exercise_name = l.performed_exercise_name;
$$;

revoke all on function public.get_last_exercise_performance(uuid, text[]) from public;
grant execute on function public.get_last_exercise_performance(uuid, text[]) to authenticated;
