"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["bg-seq-1", "bg-seq-2", "bg-seq-3", "bg-seq-4", "bg-seq-5"];

/**
 * Sequential heatmap (one hue, light → dark). Cells separated by a 2px surface
 * gap. Hover/focus shows the exact value; a legend explains the ramp.
 */
export function Heatmap({
  rows,
  columns,
  values,
  format = (v) => `${v}%`,
  caption,
}: {
  rows: string[];
  columns: string[];
  /** values[row][col], 0–100; null = no data */
  values: Array<Array<number | null>>;
  format?: (v: number) => string;
  caption: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const step = (v: number | null) =>
    v === null ? "bg-surface-2" : STEPS[Math.min(STEPS.length - 1, Math.floor((v / 100) * STEPS.length))];
  const text = (v: number | null) => (v === null ? "No data" : format(v));

  return (
    <figure>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max gap-0.5"
          style={{ gridTemplateColumns: `4.5rem repeat(${columns.length}, minmax(1.75rem, 1fr))` }}
        >
          <span />
          {columns.map((c) => (
            <span key={c} className="pb-1 text-center text-[11px] font-semibold text-muted">
              {c}
            </span>
          ))}
          {rows.map((r, ri) => (
            <div key={r} className="contents">
              <span className="self-center pr-2 text-xs font-semibold text-muted">{r}</span>
              {columns.map((c, ci) => {
                const v = values[ri][ci];
                const id = `${ri}-${ci}`;
                return (
                  <div
                    key={c}
                    tabIndex={0}
                    aria-label={`${r}, ${c}: ${text(v)}`}
                    onMouseEnter={() => setHover(id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(id)}
                    onBlur={() => setHover(null)}
                    className={cn("relative h-8 rounded-md", step(v))}
                  >
                    {hover === id && (
                      <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
                        {r} · {c}: {text(v)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted">
        <span>Lower</span>
        {STEPS.map((s) => (
          <span key={s} className={cn("h-3 w-6 rounded-sm", s)} />
        ))}
        <span>Higher</span>
        <span className="ml-3 h-3 w-6 rounded-sm bg-surface-2" />
        <span>No data</span>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {values[ri].map((v, ci) => (
                <td key={ci}>{text(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
