"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function authRedirect(path: "/auth/sign-in" | "/auth/sign-up", kind: "error" | "message", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function assertConfigured(path: "/auth/sign-in" | "/auth/sign-up") {
  if (!isSupabaseConfigured()) {
    authRedirect(path, "error", "Supabase must be configured before authentication can be used.");
  }
}

export async function signInAction(formData: FormData) {
  assertConfigured("/auth/sign-in");
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) authRedirect("/auth/sign-in", "error", parsed.error.issues[0]?.message ?? "Invalid credentials.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) authRedirect("/auth/sign-in", "error", error.message);
  redirect("/applicant");
}

export async function signUpAction(formData: FormData) {
  assertConfigured("/auth/sign-up");
  const parsed = credentialsSchema.extend({
    fullName: z.string().trim().min(2, "Enter your full name."),
  }).safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  if (!parsed.success) authRedirect("/auth/sign-up", "error", parsed.error.issues[0]?.message ?? "Invalid signup details.");
  if (isTurnstileConfigured() && !await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""))) authRedirect("/auth/sign-up", "error", "Complete the anti-bot check and try again.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/applicant`,
    },
  });
  if (error) authRedirect("/auth/sign-up", "error", error.message);
  authRedirect("/auth/sign-in", "message", "Check your email to verify your account, then sign in.");
}

export async function signInWithGoogleAction(formData: FormData) {
  const path = formData.get("authMode") === "sign-up" ? "/auth/sign-up" : "/auth/sign-in";
  assertConfigured(path);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback?next=/applicant` },
  });
  if (error || !data.url) authRedirect(path, "error", error?.message ?? "Google authentication could not start.");
  redirect(data.url);
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
