import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function computeWeekAndWorkoutIndex(workoutNumber: number): { week: number; workoutIndex: number } {
  const week = Math.floor((workoutNumber - 1) / 4) + 1;
  const workoutIndex = ((workoutNumber - 1) % 4) + 1;
  return { week, workoutIndex };
}

async function completeWorkoutAction(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userProgramId = String(formData.get("user_program_id") ?? "");
  if (!userProgramId) redirect("/app/run?error=Missing%20user_program_id");

  const workoutNumber = Number(formData.get("workout_number") ?? NaN);
  if (!Number.isFinite(workoutNumber)) redirect("/app/run?error=Invalid%20workout_number");

  const ins = await supabase.from("workout_instances").insert({
    user_program_id: userProgramId,
    workout_number: workoutNumber,
    performed_at: new Date().toISOString()
  });
  if (ins.error) redirect(`/app/run?error=${encodeURIComponent(ins.error.message)}`);
  redirect("/app/run");
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
        <h2 style={{ margin: 0, fontSize: 18 }}>Quick progress</h2>
        <div className="label" style={{ marginTop: 10 }}>
          Start the next workout to log sets, substitutions, and watch form videos in a modal.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btnPrimary" href={`/app/workout?week=${week}&workout=${workoutIndex}`}>
            Start workout
          </Link>
          <Link className="btn" href="/app/history">
            History
          </Link>
          <form action={completeWorkoutAction}>
            <input type="hidden" name="user_program_id" value={runRes.data.id} />
            <input type="hidden" name="workout_number" value={String(nextWorkoutNumber)} />
            <button className="btn" type="submit">
              Quick-complete (debug)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
