const SKELETON_SECTIONS = [
  { title: "Executive Summary", lines: [92, 78, 64] },
  { title: "Movements by Actor", lines: [88, 72, 80, 68, 56] },
  { title: "Emerging Patterns", lines: [84, 76, 70] },
  { title: "Lifecycle Events", lines: [72, 58] },
  { title: "Worth Watching Highlights", lines: [86, 74, 62] },
  { title: "What to Watch Next Quarter", lines: [80, 68, 76, 54] },
];

interface ReportSkeletonProps {
  loading?: boolean;
}

export function ReportSkeleton({ loading = false }: ReportSkeletonProps) {
  return (
    <div
      className={`radar-report-skeleton${loading ? " radar-report-skeleton-loading" : ""}`}
      aria-busy={loading}
      aria-label={loading ? "Generating report" : "Report preview"}
    >
      <p className="radar-report-skeleton-note">
        Reports are not stored. Export to keep a copy.
      </p>
      {SKELETON_SECTIONS.map((section) => (
        <section
          key={section.title}
          className="radar-card radar-report-skeleton-section"
        >
          <h2 className="radar-report-skeleton-heading">{section.title}</h2>
          <div className="radar-report-skeleton-body">
            {section.lines.map((width, index) => (
              <div
                key={`${section.title}-${index}`}
                className={`radar-report-skeleton-line skeleton-block${
                  loading ? " skeleton-block--animating" : ""
                }`}
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
