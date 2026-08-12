"use client";

import Script from "next/script";
import { useEffect } from "react";

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string | undefined; onToken?: (token: string) => void }) {
  if (!siteKey) return null;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-callback={onToken ? "arenaTurnstileCallback" : undefined} data-sitekey={siteKey} data-theme="dark" /><TurnstileCallback callback={onToken} /></>;
}

function TurnstileCallback({ callback }: { callback?: (token: string) => void }) {
  useEffect(() => {
    if (!callback) return;
    const target = window as typeof window & { arenaTurnstileCallback?: (token: string) => void };
    target.arenaTurnstileCallback = callback;
    return () => { delete target.arenaTurnstileCallback; };
  }, [callback]);
  return null;
}
