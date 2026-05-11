"use client";

import { useRef, useState, useEffect } from "react";

interface ExpandableTextProps {
  text: string;
  lines?: number;
}

export function ExpandableText({ text, lines = 4 }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scrollHeight > clientHeight means text is actually clamped
    setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text, lines]);

  const clampClass = !expanded ? `line-clamp-${lines}` : "";

  return (
    <div>
      <p
        ref={ref}
        className={`font-sans text-sm text-[var(--cream-muted)] leading-relaxed transition-all duration-300 ${clampClass}`}
        style={expanded ? { WebkitLineClamp: "unset" } : undefined}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="font-mono text-[11px] tracking-wider uppercase text-[var(--accent-dim)] hover:text-[var(--cream)] transition-colors mt-2"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
