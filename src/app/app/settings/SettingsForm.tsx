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
  saveSettingsAction
}: {
  initialTheme: ThemePreference;
  initialUnit: UnitPreference;
  saveSettingsAction: (formData: FormData) => Promise<void>;
}) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [unit, setUnit] = useState<UnitPreference>(initialUnit);

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

      <button className="btn btnPrimary btnLg" type="submit" style={{ justifyContent: "center" }}>
        Save settings
      </button>
    </form>
  );
}
