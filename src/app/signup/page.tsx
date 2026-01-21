import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "../../lib/supabase/server";

async function signupAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Create invited accounts via server route (uses service role).
  // This avoids the "no session after signUp" edge-case and keeps the allowlist authoritative.
  const origin = (await headers()).get("origin") ?? "";
  const res = await fetch(`${origin}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    redirect(`/signup?error=${encodeURIComponent(body.error ?? "Signup failed")}`);
  }

  // Now log them in using normal client auth.
  const supabase = await createSupabaseServerClient();
  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) {
    redirect(`/login?error=${encodeURIComponent(login.error.message)}`);
  }
  redirect("/app");
}

export default async function SignupPage({
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
          <h1 style={{ margin: 0, fontSize: 22 }}>Sign up</h1>
          <Link className="btn" href="/">
            Home
          </Link>
        </div>

        <div className="label" style={{ marginTop: 10 }}>
          Invite-only. If you’re not on the allowlist, signup will be rejected.
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
            <div style={{ fontWeight: 600 }}>Signup failed</div>
            <div className="label" style={{ marginTop: 4 }}>
              {error}
            </div>
          </div>
        ) : null}

        <form action={signupAction} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div>
            <div className="label">Email</div>
            <input className="input" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" name="password" type="password" autoComplete="new-password" required />
          </div>
          <button className="btn btnPrimary" type="submit">
            Create account
          </button>
        </form>

        <div className="label" style={{ marginTop: 12 }}>
          Already have an account? <Link href="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
