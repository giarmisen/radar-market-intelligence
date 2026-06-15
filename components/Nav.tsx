import Link from "next/link";

interface NavProps {
  active: "living" | "timeline" | "actors" | "reports" | "proposals";
  pendingProposals: number;
}

const LINKS = [
  { id: "living" as const, href: "/", label: "Market Pulse" },
  { id: "timeline" as const, href: "/timeline", label: "Timeline" },
  { id: "actors" as const, href: "/actors", label: "Actors" },
  { id: "reports" as const, href: "/reports", label: "Reports" },
  { id: "proposals" as const, href: "/proposals", label: "Proposals" },
];

export function Nav({ active, pendingProposals }: NavProps) {
  return (
    <nav className="radar-nav">
      <Link href="/" className="radar-nav-logo">
        Radar<span className="radar-nav-logo-dot">.</span>
      </Link>
      <div className="radar-nav-links">
        {LINKS.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className={`radar-nav-link${active === link.id ? " radar-nav-link-active" : ""}`}
          >
            {link.label}
            {link.id === "proposals" && pendingProposals > 0 ? (
              <span className="radar-nav-pill">{pendingProposals}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
