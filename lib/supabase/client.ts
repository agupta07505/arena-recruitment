import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const { publishableKey, url } = getSupabasePublicConfig();
  return createBrowserClient(url, publishableKey, {
    cookieOptions: { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  });
}
