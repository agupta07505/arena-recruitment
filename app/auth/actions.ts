"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function authRedirect(kind: "error" | "message", message: string): never {
  redirect(`/auth?${kind}=${encodeURIComponent(message)}`);
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    authRedirect("error", "Supabase must be configured before authentication can be used.");
  }
}

export async function signInAction(formData: FormData) {
  assertConfigured();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) authRedirect("error", parsed.error.issues[0]?.message ?? "Invalid credentials.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) authRedirect("error", error.message);
  redirect("/applicant");
}

export async function signUpAction(formData: FormData) {
  assertConfigured();
  const parsed = credentialsSchema.extend({
    fullName: z.string().trim().min(2, "Enter your full name."),
  }).safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  if (!parsed.success) authRedirect("error", parsed.error.issues[0]?.message ?? "Invalid signup details.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/applicant`,
    },
  });
  if (error) authRedirect("error", error.message);
  authRedirect("message", "Check your email to verify your account, then sign in.");
}

export async function signInWithGoogleAction() {
  assertConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback?next=/applicant` },
  });
  if (error || !data.url) authRedirect("error", error?.message ?? "Google sign-in could not start.");
  redirect(data.url);
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
