"use client";

import { useEffect, useRef, useState } from "react";
import { JOST_STACK } from "@/lib/fonts";

const COLLAPSED_LINES = 8;

const TEXT_STYLE = {
  color: "#000",
  fontFamily: JOST_STACK,
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: "normal" as const,
};

export function SummaryText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Measure whether the text overflows the 8-line clamp. Re-runs on text
  // change and on viewport resize (line wrapping is width-dependent).
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      // scrollHeight reflects the full content; clientHeight is the
      // currently-rendered (clamped) height. Difference => truncated.
      setIsOverflowing(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, expanded]);

  return (
    <div className="space-y-2">
      <p
        ref={ref}
        style={{
          ...TEXT_STYLE,
          ...(expanded
            ? {}
            : {
                display: "-webkit-box",
                WebkitLineClamp: COLLAPSED_LINES,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }),
        }}
      >
        {text}
      </p>
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-800"
          style={{ fontFamily: JOST_STACK }}
        >
          {expanded ? "View less" : "View more"}
        </button>
      )}
    </div>
  );
}
