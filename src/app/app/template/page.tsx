import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export default async function TemplatePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const programRes = await supabase
    .from("program_templates")
    .select("id, slug, name")
    .eq("slug", "essentials-4x")
    .single();
  if (programRes.error) throw new Error(programRes.error.message);

  const weeksRes = await supabase
    .from("week_templates")
    .select("id, week_number")
    .eq("program_template_id", programRes.data.id)
    .order("week_number", { ascending: true });
  if (weeksRes.error) throw new Error(weeksRes.error.message);

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{programRes.data.name}</h1>
          <div className="label" style={{ marginTop: 6 }}>
            Browse template (weeks/workouts)
          </div>
        </div>
        <Link className="btn" href="/app">
          Back
        </Link>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {weeksRes.data.map((w) => (
            <Link key={w.id} className="btn" href={`/app/template/${w.week_number}`}>
              Week {w.week_number}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
