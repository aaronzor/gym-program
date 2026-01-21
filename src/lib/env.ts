import { z } from "zod";

const PublicEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    // Supabase has introduced "publishable" keys; older projects show "anon public".
    // Support both env var names so setup is less confusing.
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1).optional()
  })
  .superRefine((v, ctx) => {
    if (!v.NEXT_PUBLIC_SUPABASE_ANON_KEY && !v.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Missing Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy anon public) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (publishable)."
      });
    }
  });

export function getPublicEnv() {
  const parsed = PublicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  });

  return {
    NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  };
}
