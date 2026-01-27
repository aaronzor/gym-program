"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function BottomSheet({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!portalEl) return null;

  const sheet = open ? (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 10, 14, 0.55)",
        zIndex: 2147483646,
        display: "grid",
        alignItems: "end"
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card cardInset"
        style={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          width: "100%",
          maxHeight: "78vh",
          overflow: "hidden",
          transform: "translateY(0)",
          animation: "sheetIn 170ms ease-out"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            padding: "14px 14px 10px",
            borderBottom: "1px solid var(--line)"
          }}
        >
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ padding: 14, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  ) : null;

  return createPortal(sheet, portalEl);
}
