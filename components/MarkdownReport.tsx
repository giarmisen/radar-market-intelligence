import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownReport({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) {
      nodes.push(
        <p key={key++} className="radar-report-p">
          {renderInline(text)}
        </p>,
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    nodes.push(
      <ul key={key++} className="radar-report-list">
        {listItems.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h3 key={key++} className="radar-report-h3">
          {trimmed.slice(4)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h2 key={key++} className="radar-report-h2">
          {trimmed.slice(3)}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h1 key={key++} className="radar-report-h1">
          {trimmed.slice(2)}
        </h1>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushList();
  flushParagraph();

  return <article className="radar-report-markdown">{nodes}</article>;
}

export { MarkdownReport };
