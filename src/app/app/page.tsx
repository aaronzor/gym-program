import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

async function signOutAction() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Invite gate: if user isn't invited, RLS blocks template reads.
  const program = await supabase
    .from("program_templates")
    .select("id, slug, name, weeks")
    .eq("slug", "essentials-4x")
    .maybeSingle();

  if (program.error) {
    return (
      <div className="container" style={{ paddingTop: 34 }}>
        <div className="card" style={{ padding: 18, maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>Access blocked</h1>
          <div className="label">
            Your account exists, but you’re not on the allowlist (or Supabase returned an error). Ask the admin to add
            your email to `invited_emails`.
          </div>
          <div className="label" style={{ marginTop: 10 }}>
            Error: {program.error.message}
          </div>
          <form action={signOutAction} style={{ marginTop: 16 }}>
            <button className="btn btnDanger" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="title" style={{ fontSize: 34 }}>
            Dashboard
          </h1>
          <div className="label" style={{ marginTop: 6 }}>
            Signed in as {user.email}
          </div>
        </div>
        <form action={signOutAction}>
          <button className="btn" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Program template</h2>
          <div className="label" style={{ marginTop: 10 }}>
            {program.data ? (
              <>
                <div style={{ fontWeight: 600 }}>{program.data.name}</div>
                <div className="label" style={{ marginTop: 4 }}>
                  slug: {program.data.slug} · weeks: {program.data.weeks}
                </div>
              </>
            ) : (
              "Template not found (slug essentials-4x)."
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btnPrimary" href="/app/start">
              Start program
            </Link>
            <Link className="btn" href="/app/run">
              Continue run
            </Link>
            <Link className="btn" href="/app/template">
              Browse template
            </Link>
            <Link className="btn" href="/app/history">
              History
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Coming next</h2>
          <div className="label" style={{ marginTop: 10 }}>
            Completion-based “next workout”, workout runner, set logging, and video modal.
          </div>
        </div>
      </div>
    </div>
  );
}
