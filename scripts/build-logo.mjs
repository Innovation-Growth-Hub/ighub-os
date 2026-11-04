// Builds public/img-assets/ig-logo-animated.svg from the VTracer trace.
// Lettering comes from the trace; nodes + connectors are rebuilt as geometry
// (the trace stacks a green base layer under everything, so nodes can't be
// animated independently otherwise).
import fs from "node:fs";

const [, , srcPath, outPath] = process.argv;
const src = fs.readFileSync(srcPath, "utf8");
const re = /<path d="([^"]*)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"\/>/g;

const NAVY = "#2A2B6F", GREEN = "#89BE2C", ORANGE = "#FB571D";

const nodes = {
  navy: { cx: 790, cy: 90, r: 53, ri: 30, color: NAVY },
  green: { cx: 923, cy: 301, r: 157, ri: 94.5, color: GREEN },
  orange: { cx: 665, cy: 423, r: 103, ri: 59.5, color: ORANGE },
};
// Connectors start inside the "b" so the b covers the joint.
const links = {
  navy: { x1: 690, y1: 132, x2: 752, y2: 98, w: 14 },
  green: { x1: 700, y1: 232, x2: 790, y2: 262, w: 14 },
  orange: { x1: 664, y1: 280, x2: 664, y2: 330, w: 24 },
};

function bbox(d, tx, ty) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = n[i] + tx, y = n[i + 1] + ty;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

function isNavy(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return b >= r && b >= g && !(r > 235 && g > 235 && b > 235);
}

const letters = [], tagline = [];
let bPath = "";
for (const [, d, fillRaw, txs, tys] of src.matchAll(re)) {
  if (!d.trim()) continue;
  const fill = fillRaw.toUpperCase();
  if (!isNavy(fill)) continue; // green/orange layers are rebuilt below
  const tx = +txs, ty = +tys;
  const box = bbox(d, tx, ty);
  const tag = `<path d="${d}" fill="${fill}" transform="translate(${tx},${ty})"`;
  if (fill === "#2A2B6F" && box.x1 > 800) { bPath = `${tag}/>`; continue; } // b + navy node + link
  if (box.x0 > 700) continue; // anti-alias crumbs around the rebuilt nodes/links
  if (box.y0 > 380) { tagline.push(`${tag}/>`); continue; }
  // Stagger letters left → right.
  const delay = (Math.max(0, box.x0) / 700) * 0.45;
  letters.push(`<g class="l" style="animation-delay:${delay.toFixed(3)}s">${tag}/></g>`);
}
if (!bPath) throw new Error("b path not found");

const len = (l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

function person(n, id) {
  const r = n.ri;
  // Head + shoulders, proportions measured from the logo; clipped to the inner disc.
  return `
    <clipPath id="clip-${id}"><circle cx="${n.cx}" cy="${n.cy}" r="${r}"/></clipPath>
    <g clip-path="url(#clip-${id})">
      <ellipse cx="${n.cx}" cy="${(n.cy + 0.98 * r).toFixed(1)}" rx="${(0.69 * r).toFixed(1)}" ry="${(0.82 * r).toFixed(1)}" fill="${n.color}"/>
      <circle cx="${n.cx}" cy="${(n.cy - 0.42 * r).toFixed(1)}" r="${(0.47 * r).toFixed(1)}" fill="${n.color}" stroke="#FFFFFF" stroke-width="${(0.09 * r).toFixed(1)}"/>
    </g>`;
}

const order = ["navy", "green", "orange"];
const linkSvg = order.map((k, i) => {
  const l = links[k], L = len(l).toFixed(1);
  return `
  <g class="link" style="--len:${L};animation-delay:${(0.7 + i * 0.12).toFixed(2)}s">
    <line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${nodes[k].color}" stroke-width="${l.w}" stroke-dasharray="${L}" class="draw" style="animation-delay:inherit"/>
    <line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="${Math.round(l.w * 0.45)}" stroke-linecap="round" stroke-dasharray="6 ${L}" class="signal" style="--len:${L};animation-delay:${(1.7 + i * 0.8).toFixed(2)}s"/>
  </g>`;
}).join("");

const nodeSvg = order.map((k, i) => {
  const n = nodes[k];
  const origin = `transform-origin:${n.cx}px ${n.cy}px`;
  return `
  <g class="node" style="${origin};animation-delay:${(0.85 + i * 0.14).toFixed(2)}s,${(1.95 + i * 0.8).toFixed(2)}s">
    <circle class="ripple" cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="none" stroke="${n.color}" stroke-width="${Math.max(4, n.r * 0.06).toFixed(1)}" style="${origin};animation-delay:${(1.95 + i * 0.8).toFixed(2)}s"/>
    <circle cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="${n.color}"/>
    <circle cx="${n.cx}" cy="${n.cy}" r="${n.ri}" fill="#FFFFFF"/>${person(n, k)}
  </g>`;
}).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- IGHub logo, animated. Generated from the VTracer trace; nodes rebuilt as geometry.
     Intro (~1.4s): letters rise in, connectors draw out of the "b", nodes pop.
     Loop (2.4s): a signal travels each connector and the node it reaches pulses.
     prefers-reduced-motion: renders the finished logo with no motion. -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-8 12 1124 548" width="1124" height="548" role="img" aria-label="IGHub, Innovation Growth Hub">
<style>
  .l { animation: rise .55s cubic-bezier(.2,.9,.3,1.2) both; }
  .tag { animation: fade .6s ease-out .6s both; }
  .b { animation: rise .55s cubic-bezier(.2,.9,.3,1.2) .42s both; }
  .draw { stroke-dashoffset: 0; animation: draw .4s ease-out both; }
  .signal { opacity: 0; animation: signal 2.4s linear infinite; }
  .node { animation: pop .55s cubic-bezier(.3,1.6,.5,1) both, pulse 2.4s ease-in-out infinite; transform-box: view-box; }
  .ripple { opacity: 0; transform-box: view-box; animation: ripple 2.4s ease-out infinite; }
  @keyframes rise { from { opacity: 0; transform: translateY(40px); } }
  @keyframes fade { from { opacity: 0; } }
  @keyframes draw { from { stroke-dashoffset: var(--len); } }
  @keyframes pop { from { transform: scale(0); } }
  @keyframes pulse { 0%, 30%, 100% { transform: scale(1); } 12% { transform: scale(1.07); } }
  @keyframes ripple { 0% { opacity: .55; transform: scale(1); } 40%, 100% { opacity: 0; transform: scale(1.16); } }
  @keyframes signal {
    0% { opacity: 1; stroke-dashoffset: 6; }
    10% { opacity: 1; stroke-dashoffset: calc(var(--len) * -1); }
    10.01%, 100% { opacity: 0; stroke-dashoffset: calc(var(--len) * -1); }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
<defs>
  <!-- Keep the "b" from the trace but cut away its fused node + connector. -->
  <clipPath id="clip-b"><polygon points="560,0 705,0 705,118 690,150 760,150 760,300 560,300"/></clipPath>
</defs>
<g class="links">${linkSvg}
</g>
<g class="word">
${letters.join("\n")}
</g>
<g class="b" clip-path="url(#clip-b)">${bPath}</g>
<g class="tag">
${tagline.join("\n")}
</g>
<g class="nodes">${nodeSvg}
</g>
</svg>
`;
fs.writeFileSync(outPath, svg);
console.log("wrote", outPath, (svg.length / 1024).toFixed(1), "KB,", letters.length, "letter paths,", tagline.length, "tagline paths");
