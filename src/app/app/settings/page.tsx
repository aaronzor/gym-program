import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { DEFAULT_SETTINGS, getUserSettings, ThemePreference, UnitPreference } from "../../../lib/settings";
import { SettingsForm } from "./SettingsForm";

async function saveSettingsAction(formData: FormData) {
  "use server";

  const theme = String(formData.get("theme") ?? "system") as ThemePreference;
  const defaultUnit = String(formData.get("default_unit") ?? "kg") as UnitPreference;
  const autoRestOnSetDone = formData.get("auto_rest_on_set_done") === "on";
  const focusMode = formData.get("focus_mode") === "on";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const safeTheme: ThemePreference = theme === "dark" || theme === "light" || theme === "system" ? theme : "system";
  const safeUnit: UnitPreference = defaultUnit === "lb" || defaultUnit === "kg" ? defaultUnit : "kg";

  const res = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      theme: safeTheme,
      default_unit: safeUnit,
      auto_rest_on_set_done: autoRestOnSetDone,
      focus_mode: focusMode
    },
    { onConflict: "user_id" }
  );

  if (res.error) {
    redirect(`/app/settings?error=${encodeURIComponent(res.error.message)}`);
  }

  redirect("/app/settings?saved=1");
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const saved = sp.saved === "1";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getUserSettings();
  const theme = current.theme ?? DEFAULT_SETTINGS.theme;
  const unit = current.defaultUnit ?? DEFAULT_SETTINGS.defaultUnit;
  const autoRestOnSetDone = current.autoRestOnSetDone ?? false;
  const focusMode = current.focusMode ?? false;

  return (
    <div className="container" style={{ paddingTop: 34 }}>
      <div className="appBar">
        <div style={{ minWidth: 0 }}>
          <div className="appTitle">Settings</div>
          <div className="label" style={{ marginTop: 4 }}>
            {user.email}
          </div>
        </div>
        <Link className="btn" href="/app">
          Back
        </Link>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {error ? (
          <div className="card cardInset" style={{ padding: 12, boxShadow: "none", borderColor: "rgba(239, 68, 68, 0.28)", background: "rgba(239, 68, 68, 0.08)" }}>
            <div style={{ fontWeight: 800 }}>Couldn’t save</div>
            <div className="label" style={{ marginTop: 4 }}>
              {error}
            </div>
          </div>
        ) : null}

        {saved ? (
          <div className="card cardInset" style={{ padding: 12, boxShadow: "none", borderColor: "rgba(74, 222, 128, 0.30)", background: "rgba(74, 222, 128, 0.08)" }}>
            <div style={{ fontWeight: 800 }}>Saved</div>
            <div className="label" style={{ marginTop: 4 }}>
              Your settings will apply immediately.
            </div>
          </div>
        ) : null}

        <div className="card" style={{ padding: 16 }}>
          <SettingsForm
            initialTheme={theme}
            initialUnit={unit}
            initialAutoRestOnSetDone={autoRestOnSetDone}
            initialFocusMode={focusMode}
            saveSettingsAction={saveSettingsAction}
          />
        </div>
      </div>
    </div>
  );
}
