import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppChrome } from "../components/AppChrome";
import { cookies } from "next/headers";

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
  // Theme is read from a first-party cookie to avoid upstream calls
  // during SSR (improves reliability on mobile networks).
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
    >
      <body className={sans.variable}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
