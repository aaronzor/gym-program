"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

function parseYouTube(url: string): { id: string; startSeconds: number } | null {
  try {
    const u = new URL(url);
    let id = "";

    if (u.hostname === "youtu.be") {
      id = u.pathname.replace(/^\//, "");
    } else if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        id = u.searchParams.get("v") ?? "";
      } else if (u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/embed/")[1] ?? "";
      }
    }

    if (!id) return null;

    const t = u.searchParams.get("t") ?? u.searchParams.get("start") ?? "";
    let startSeconds = 0;
    if (t) {
      const m = t.match(/^(\d+)(s)?$/i);
      if (m) startSeconds = Number(m[1]);
    }

    return { id, startSeconds: Number.isFinite(startSeconds) ? startSeconds : 0 };
  } catch {
    return null;
  }
}

function youtubeEmbedUrl(videoId: string, startSeconds: number): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  const params = new URLSearchParams();
  params.set("autoplay", "1");
  params.set("rel", "0");
  if (startSeconds > 0) params.set("start", String(startSeconds));
  return `${base}?${params.toString()}`;
}

export function VideoModal({
  url,
  label = "Video",
  variant = "text"
}: {
  url: string | null | undefined;
  label?: string;
  variant?: "text" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const info = useMemo(() => {
    if (!url) return null;
    return parseYouTube(url);
  }, [url]);

  if (!url) return null;

  const embed = info ? youtubeEmbedUrl(info.id, info.startSeconds) : null;

  const modal = open ? (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(20, 16, 10, 0.55)",
        display: "grid",
        placeItems: "center",
        padding: 14,
        zIndex: 2147483647
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="card"
        style={{
          width: "min(920px, 100%)",
          padding: 14
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>Form video</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a className="btn" href={url} target="_blank" rel="noreferrer noopener">
              Open in YouTube
            </a>
            <button className="btn" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {embed ? (
            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
              <iframe
                src={embed}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          ) : (
            <div className="label">Couldn’t embed this URL. Use “Open in YouTube”.</div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        className={variant === "icon" ? "btn btnIcon" : "btn"}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
      >
        {variant === "icon" ? (
          <>
            <Icon name="play" />
            <span className="srOnly">{label}</span>
          </>
        ) : (
          label
        )}
      </button>

      {portalEl ? createPortal(modal, portalEl) : null}
    </>
  );
}
