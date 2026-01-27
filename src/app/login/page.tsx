import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Icon } from "../../components/Icon";

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
    <div className="container">
      <div className="authShell">
        <div className="card authCard">
          <div className="authMark" aria-hidden="true">
            <Icon name="barbell" size={22} />
          </div>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Log in</h1>
            <div className="label" style={{ marginTop: 6 }}>
              Pick up right where you left off.
            </div>
          </div>

          {error ? (
            <div
              className="card cardInset"
              style={{
                marginTop: 14,
                padding: 12,
                boxShadow: "none",
                borderColor: "rgba(239, 68, 68, 0.28)",
                background: "rgba(239, 68, 68, 0.08)"
              }}
            >
              <div style={{ fontWeight: 700 }}>Login failed</div>
              <div className="label" style={{ marginTop: 4 }}>
                {error}
              </div>
            </div>
          ) : null}

          <form action={loginAction} style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div>
              <div className="label">Email</div>
              <input className="input" name="email" type="email" autoComplete="email" required />
            </div>
            <div>
              <div className="label">Password</div>
              <input className="input" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="btn btnPrimary btnLg" type="submit">
              Log in
            </button>
          </form>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            <span className="label">
              No account? <Link href="/signup">Sign up</Link>
            </span>
            <div style={{ marginTop: 10 }}>
              <Link className="btn" href="/" style={{ justifyContent: "center", width: "100%" }}>
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="label" style={{ textAlign: "center", marginTop: 18, opacity: 0.55 }}>
          By Aaron McMullan
        </div>
      </div>
    </div>
  );
}
