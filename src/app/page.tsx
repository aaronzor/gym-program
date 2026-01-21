import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="title">Gym Program</h1>
          <p className="subtitle">
            Essentials 4x is imported. Next step is login + program runs + workout logging.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Link className="btn" href="/login">
            Log in
          </Link>
          <Link className="btn btnPrimary" href="/signup">
            Sign up
          </Link>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>What’s wired up</h2>
            <span className="label">backend: Supabase</span>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Program template</div>
              <div className="label">`essentials-4x` is in the database (12 weeks, 48 workouts, 288 exercises).</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Invite-only (RLS)</div>
              <div className="label">
                You must be listed in `invited_emails` to read templates or write logs.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Videos + substitutions</div>
              <div className="label">
                Exercise rows include primary + substitution YouTube links; we’ll surface them in a modal in the workout
                runner.
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Next</h2>
          <div className="label" style={{ marginTop: 10 }}>
            Implement auth, session handling, and a dashboard that shows your “next workout” using completion-based
            progression.
          </div>
        </div>
      </div>
    </div>
  );
}
