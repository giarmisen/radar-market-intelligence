"use client";

import { useState } from "react";
import type { GroupedSignalSource } from "@/lib/group-signals";

interface GroupedSourcesProps {
  sourceCount: number;
  sources: GroupedSignalSource[];
  linkClassName?: string;
}

function formatSourceLabel(url: string): string {
  const trimmed = url.replace(/^https?:\/\//, "");
  return trimmed.length > 56 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export function GroupedSources({
  sourceCount,
  sources,
  linkClassName = "text-source-url radar-signal-source",
}: GroupedSourcesProps) {
  const [expanded, setExpanded] = useState(false);
  const primary = sources[0];

  if (!primary) {
    return null;
  }

  if (sourceCount <= 1) {
    return (
      <a
        href={primary.source_url}
        className={linkClassName}
        target="_blank"
        rel="noopener noreferrer"
      >
        {formatSourceLabel(primary.source_url)}
      </a>
    );
  }

  return (
    <div className="radar-grouped-sources">
      <div className="radar-grouped-sources-primary">
        <a
          href={primary.source_url}
          className={linkClassName}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatSourceLabel(primary.source_url)}
        </a>
        <button
          type="button"
          className="radar-grouped-sources-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide sources" : "Show all sources"}
        </button>
      </div>
      {expanded ? (
        <ul className="radar-grouped-sources-list">
          {sources.map((source) => (
            <li key={source.id}>
              <a
                href={source.source_url}
                className={linkClassName}
                target="_blank"
                rel="noopener noreferrer"
              >
                {formatSourceLabel(source.source_url)}
              </a>
              <span className="radar-grouped-sources-meta">
                Score {source.relevance}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
