"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname.startsWith("/app");

  return (
    <>
      {children}
      {showNav ? (
        <nav className="bottomNav" aria-label="Primary">
          <Link className={pathname === "/app" ? "bottomNavItem active" : "bottomNavItem"} href="/app">
            <Icon name="barbell" />
            <span className="srOnly">Dashboard</span>
          </Link>
          <Link className={pathname.startsWith("/app/run") ? "bottomNavItem active" : "bottomNavItem"} href="/app/run">
            <Icon name="play" />
            <span className="srOnly">Run</span>
          </Link>
          <Link
            className={pathname.startsWith("/app/history") ? "bottomNavItem active" : "bottomNavItem"}
            href="/app/history"
          >
            <Icon name="history" />
            <span className="srOnly">History</span>
          </Link>
          <Link
            className={pathname.startsWith("/app/settings") ? "bottomNavItem active" : "bottomNavItem"}
            href="/app/settings"
          >
            <Icon name="settings" />
            <span className="srOnly">Settings</span>
          </Link>
        </nav>
      ) : null}
    </>
  );
}
