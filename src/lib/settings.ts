import { createSupabaseServerClient } from "./supabase/server";

export type ThemePreference = "system" | "dark" | "light";
export type UnitPreference = "kg" | "lb";

export type UserSettings = {
  theme: ThemePreference;
  defaultUnit: UnitPreference;
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  defaultUnit: "kg"
};

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return DEFAULT_SETTINGS;

  const res = await supabase
    .from("user_settings")
    .select("theme, default_unit")
    .eq("user_id", user.id)
    .maybeSingle();

  if (res.error) {
    // If table doesn't exist yet in a new env, fail soft.
    return DEFAULT_SETTINGS;
  }

  if (!res.data) return DEFAULT_SETTINGS;

  const theme = (res.data.theme ?? "system") as UserSettings["theme"];
  const defaultUnit = (res.data.default_unit ?? "kg") as UserSettings["defaultUnit"];

  if (theme !== "system" && theme !== "dark" && theme !== "light") return DEFAULT_SETTINGS;
  if (defaultUnit !== "kg" && defaultUnit !== "lb") return { ...DEFAULT_SETTINGS, theme };

  return { theme, defaultUnit };
}
