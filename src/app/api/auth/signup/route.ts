import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, password } = BodySchema.parse(json);

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Check allowlist
    const invitedRes = await admin
      .from("invited_emails")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (invitedRes.error) {
      return NextResponse.json({ error: invitedRes.error.message }, { status: 500 });
    }
    if (!invitedRes.data) {
      return NextResponse.json({ error: "Invite required" }, { status: 403 });
    }

    // Create auth user
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });
    if (created.error) {
      return NextResponse.json({ error: created.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
