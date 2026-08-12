import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const emailType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = requestUrl.searchParams.get("next") ?? "/applicant";
  const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/applicant";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=Supabase%20is%20not%20configured", requestUrl));
  }

  const supabase = await createClient();

  if (tokenHash && emailType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: emailType,
    });
    if (!error) return NextResponse.redirect(new URL(safeNext, requestUrl));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, requestUrl));

    // A confirmation link can verify the address before the PKCE exchange fails
    // (for example when an email app opens it in a different browser). In that
    // case the account is valid, but the user still needs to sign in normally.
    return NextResponse.redirect(new URL(
      "/auth/sign-in?message=Email%20verified.%20Sign%20in%20to%20continue.",
      requestUrl,
    ));
  }

  return NextResponse.redirect(new URL("/auth/sign-in?error=Authentication%20could%20not%20be%20completed", requestUrl));
}
