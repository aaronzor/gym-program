type IconName =
  | "play"
  | "history"
  | "timer"
  | "swap"
  | "warmup"
  | "sets"
  | "target"
  | "barbell"
  | "chevronDown"
  | "chevronUp"
  | "chevronLeft"
  | "chevronRight"
  | "x";

export function Icon({
  name,
  size = 18
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (name) {
    case "play":
      return (
        <svg {...common}>
          <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v5h5" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "timer":
      return (
        <svg {...common}>
          <path d="M10 2h4" />
          <path d="M12 14l3-3" />
          <path d="M12 22a8 8 0 1 0-8-8" />
          <path d="M4 14a8 8 0 0 1 8-8" />
        </svg>
      );
    case "swap":
      return (
        <svg {...common}>
          <path d="M16 3h5v5" />
          <path d="M21 3l-7 7" />
          <path d="M8 21H3v-5" />
          <path d="M3 21l7-7" />
        </svg>
      );
    case "warmup":
      return (
        <svg {...common}>
          {/* flame-ish warmup */}
          <path d="M12 2c1.2 2 1.2 3.8 0 5.4 2-.4 4 1.4 4 4.1 0 2.9-1.9 5-4 5s-4-2.1-4-5c0-1.4.6-2.6 1.5-3.4C11 7.9 10.8 5.5 12 2z" />
          <path d="M9 20c.9 1.2 1.9 2 3 2s2.1-.8 3-2" />
        </svg>
      );
    case "sets":
      return (
        <svg {...common}>
          {/* stacked blocks */}
          <path d="M7 7h10v4H7z" />
          <path d="M6 13h12v4H6z" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 12l4-4" />
        </svg>
      );
    case "barbell":
      return (
        <svg {...common}>
          <path d="M4 10v4" />
          <path d="M6 9v6" />
          <path d="M18 9v6" />
          <path d="M20 10v4" />
          <path d="M7 12h10" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg {...common}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...common}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "chevronUp":
      return (
        <svg {...common}>
          <path d="M18 15l-6-6-6 6" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
  }
}
