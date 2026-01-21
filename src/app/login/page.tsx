import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/app");
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div className="card" style={{ padding: 18, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Log in</h1>
          <Link className="btn" href="/">
            Home
          </Link>
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
            <div style={{ fontWeight: 600 }}>Login failed</div>
            <div className="label" style={{ marginTop: 4 }}>
              {error}
            </div>
          </div>
        ) : null}

        <form action={loginAction} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div>
            <div className="label">Email</div>
            <input className="input" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btnPrimary" type="submit">
            Log in
          </button>
        </form>

        <div className="label" style={{ marginTop: 12 }}>
          No account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
