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

export async function signInWithGoogleAction() {
  const path = "/auth/sign-in";
  assertConfigured(path);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback?next=/staff` },
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
