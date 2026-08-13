"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function authRedirect(path: "/auth/sign-in", kind: "error" | "message", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function assertConfigured(path: "/auth/sign-in") {
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
  redirect("/staff");
}

export async function requestPasswordResetAction(formData: FormData) {
  assertConfigured("/auth/sign-in");
  const parsed = z.email("Enter a valid staff email address.").safeParse(formData.get("email"));
  if (!parsed.success) authRedirect("/auth/sign-in", "error", parsed.error.issues[0]?.message ?? "Enter a valid email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/reset-password`,
  });
  if (error) authRedirect("/auth/sign-in", "error", "The password reset email could not be sent. Try again shortly.");
  authRedirect("/auth/sign-in", "message", "Password reset link sent. Check the staff email inbox.");
}

export async function updatePasswordAction(formData: FormData) {
  assertConfigured("/auth/sign-in");
  const parsed = z.object({
    password: z.string().min(10, "Use at least 10 characters."),
    confirmation: z.string(),
  }).refine((value) => value.password === value.confirmation, { message: "The passwords do not match." }).safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) redirect(`/auth/reset-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid password.")}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?error=Open%20the%20password%20reset%20link%20from%20your%20email%20again.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/staff");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
