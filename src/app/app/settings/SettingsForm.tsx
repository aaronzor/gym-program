"use client";

import { useEffect, useState } from "react";
import type { ThemePreference, UnitPreference } from "../../../lib/settings";

function applyTheme(theme: ThemePreference) {
  const el = document.documentElement;
  if (theme === "system") {
    el.removeAttribute("data-theme");
  } else {
    el.setAttribute("data-theme", theme);
  }
}

export function SettingsForm({
  initialTheme,
  initialUnit,
  initialAutoRestOnSetDone,
  initialFocusMode,
  saveSettingsAction
}: {
  initialTheme: ThemePreference;
  initialUnit: UnitPreference;
  initialAutoRestOnSetDone: boolean;
  initialFocusMode: boolean;
  saveSettingsAction: (formData: FormData) => Promise<void>;
}) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [unit, setUnit] = useState<UnitPreference>(initialUnit);
  const [autoRestOnSetDone, setAutoRestOnSetDone] = useState<boolean>(initialAutoRestOnSetDone);
  const [focusMode, setFocusMode] = useState<boolean>(initialFocusMode);

  // Ensure the UI reflects server-loaded preference on mount.
  useEffect(() => {
    applyTheme(initialTheme);
  }, [initialTheme]);

  return (
    <form action={saveSettingsAction} style={{ display: "grid", gap: 12 }}>
      <div>
        <div className="label">Theme</div>
        <select
          className="input"
          name="theme"
          value={theme}
          onChange={(e) => {
            const next = (e.target.value as ThemePreference) ?? "system";
            setTheme(next);
            applyTheme(next);
          }}
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div>
        <div className="label">Default unit</div>
        <select className="input" name="default_unit" value={unit} onChange={(e) => setUnit(e.target.value as UnitPreference)}>
          <option value="kg">kg</option>
          <option value="lb">lb</option>
        </select>
      </div>

      <label className="card cardInset" style={{ padding: 12, boxShadow: "none", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          name="auto_rest_on_set_done"
          checked={autoRestOnSetDone}
          onChange={(e) => setAutoRestOnSetDone(e.target.checked)}
        />
        <div>
          <div style={{ fontWeight: 800 }}>Auto-start rest timer</div>
          <div className="label" style={{ marginTop: 2 }}>
            When you mark a set done, start rest automatically.
          </div>
        </div>
      </label>

      <label className="card cardInset" style={{ padding: 12, boxShadow: "none", display: "flex", gap: 10, alignItems: "center" }}>
        <input type="checkbox" name="focus_mode" checked={focusMode} onChange={(e) => setFocusMode(e.target.checked)} />
        <div>
          <div style={{ fontWeight: 800 }}>Focus mode</div>
          <div className="label" style={{ marginTop: 2 }}>
            Expanding one exercise collapses the others.
          </div>
        </div>
      </label>

      <button className="btn btnPrimary btnLg" type="submit" style={{ justifyContent: "center" }}>
        Save settings
      </button>
    </form>
  );
}
