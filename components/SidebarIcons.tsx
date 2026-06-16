interface IconProps {
  className?: string;
}

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconPulse({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

export function IconTimeline({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M4 7h16M4 12h10M4 17h14" />
    </svg>
  );
}

export function IconReport({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

export function IconActors({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
      <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

export function IconProposals({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg {...iconProps} className={className} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
