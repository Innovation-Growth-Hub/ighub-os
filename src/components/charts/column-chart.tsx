"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Datum {
  label: string;
  value: number;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Single-series column chart. One hue (no legend — the card title names the
 * series), ≤24px columns with 4px rounded caps, hairline recessive gridlines,
 * the extreme value direct-labeled, and a per-column hover tooltip.
 */
export function ColumnChart({
  data,
  format = (v) => v.toLocaleString(),
  height = 200,
  caption,
}: {
  data: Datum[];
  format?: (v: number) => string;
  height?: number;
  caption: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <figure>
      <div className="flex gap-3">
        {/* y-axis */}
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-muted" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {format(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: height - 24 }}>
            {ticks.map((t) => (
              <div key={t} className="h-px bg-surface-3" />
            ))}
          </div>
          <div className="relative flex items-end justify-around gap-0.5" style={{ height: height - 24 }}>
            {data.map((d, i) => {
              const h = (d.value / max) * (height - 24);
              const active = hover === i;
              return (
                <div
                  key={d.label}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`}
                >
                  {(i === peak || active) && (
                    <span
                      className={cn(
                        "absolute z-10 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
                        active ? "bg-ink text-white" : "text-ink",
                      )}
                      style={{ bottom: h + 6 }}
                    >
                      {format(d.value)}
                    </span>
                  )}
                  <div
                    className={cn("w-full max-w-6 rounded-t-[4px] transition-colors", active ? "bg-primary-ink" : "bg-primary")}
                    style={{ height: Math.max(h, 2) }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-around gap-0.5">
            {data.map((d) => (
              <span key={d.label} className="flex-1 text-center text-[11px] font-semibold text-muted">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
