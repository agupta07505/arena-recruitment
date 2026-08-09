import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/syne";
import "./globals.css";

export const metadata: Metadata = {
  title: "A.R.E.N.A — Build the game beyond the game",
  description:
    "Recruitment for the operational team behind sports and esports at IIIT Bhopal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
