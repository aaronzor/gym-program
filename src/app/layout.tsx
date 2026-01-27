import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getUserSettings } from "../lib/settings";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Gym Program",
  description: "Track your gym program and progress"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Intentionally server-side: ensures theme applies on first paint.
  // If the user selects "system", we omit the data attribute and let CSS media queries decide.
  const settings = await getUserSettings();
  const dataTheme = settings.theme === "system" ? undefined : settings.theme;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
    >
      <body className={sans.variable}>{children}</body>
    </html>
  );
}
