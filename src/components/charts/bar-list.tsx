/**
 * Ranked horizontal bars for parts-of-a-whole / magnitude comparisons
 * (e.g. revenue by source). Single hue, value + share labeled at the tip,
 * label and value in text tokens (never the data colour).
 */
export function BarList({
  data,
  format = (v) => v.toLocaleString(),
  showShare = true,
  max: maxProp,
}: {
  data: Array<{ label: string; value: number }>;
  format?: (v: number) => string;
  showShare?: boolean;
  /** Fixed scale max (e.g. 100 for percentages). Defaults to the largest value. */
  max?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const max = maxProp ?? Math.max(...data.map((d) => d.value), 1);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <ul className="space-y-4">
      {sorted.map((d) => (
        <li key={d.label} title={`${d.label}: ${format(d.value)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">{d.label}</span>
            <span className="text-muted">
              <span className="font-bold text-ink">{format(d.value)}</span>
              {showShare && ` · ${Math.round((d.value / total) * 100)}%`}
            </span>
          </div>
          <div className="h-3 rounded-full bg-canvas">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
