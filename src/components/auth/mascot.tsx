/**
 * The IGHub mascot: a friendly corporate character in a navy blazer, sky-blue
 * tie and orange trousers, with a growth sprout on its head. Flat IGHub
 * palette, no outlines or shadows.
 *
 * Motion is designed to be smooth: every loop uses sine-style easing and
 * returns to its start pose, the wave is jointed (shoulder + elbow) so it
 * moves like a real arm, and only transforms/opacity are animated.
 * Everything stops under prefers-reduced-motion.
 */

const NAVY = "#2A2B6F";
const NAVY_DEEP = "#1F2059";
const GREEN = "#89BE2C";
const GREEN_SHADE = "#78A923";
const LEAF_DARK = "#4F7A12";
const LEAF_LIGHT = "#A9D85E";
const ORANGE = "#FB571D";
const ORANGE_SHADE = "#DE4510";
const SKY = "#29ABE2";
const SKY_SHADE = "#1E8FC4";
const CHEEK = "#C5E58C";

const FONT = "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif";
const EASE = "cubic-bezier(.45,0,.55,1)"; // sine in-out

export function Mascot({ message = "Welcome!", className }: { message?: string; className?: string }) {
  // Bubble grows with the message; its tail stays pointed at the mascot.
  const bw = Math.min(250, Math.max(150, message.length * 15 + 44));
  const bx = Math.max(6, 172 - bw);

  return (
    <svg viewBox="0 0 420 520" className={className} role="img" aria-label={`IGHub mascot in a blue tie and orange trousers, waving and saying “${message}”`}>
      <style>{`
        .ms-breathe { animation: ms-breathe 3.6s ${EASE} infinite alternate; }
        .ms-head { transform-box: view-box; transform-origin: 210px 246px; animation: ms-tilt 5.2s ${EASE} infinite alternate; }
        .ms-shadow { transform-box: fill-box; transform-origin: center; animation: ms-shadow 3.6s ${EASE} infinite alternate; }
        .ms-shoulder { transform-box: view-box; transform-origin: 266px 268px; animation: ms-shoulder 3.4s ${EASE} infinite; }
        .ms-elbow { transform-box: view-box; transform-origin: 318px 236px; animation: ms-elbow 3.4s ${EASE} infinite; }
        .ms-sprout { transform-box: view-box; transform-origin: 210px 96px; animation: ms-sway 4.4s ${EASE} infinite alternate; }
        .ms-eye { transform-box: fill-box; transform-origin: center; animation: ms-blink 5.5s ease-in-out 1.4s infinite; }
        .ms-bubble { transform-box: view-box; transform-origin: 150px 112px; animation: ms-pop .7s cubic-bezier(.34,1.56,.64,1) .2s both, ms-drift 4s ${EASE} .9s infinite alternate; }
        .ms-spark { transform-box: fill-box; transform-origin: center; animation: ms-twinkle 3.2s ${EASE} infinite; }
        .ms-node { animation: ms-drift 3.8s ${EASE} infinite alternate; }

        @keyframes ms-breathe { from { transform: translateY(0); } to { transform: translateY(-4px); } }
        @keyframes ms-tilt { from { transform: rotate(-2.5deg); } to { transform: rotate(2.5deg); } }
        @keyframes ms-shadow { from { transform: scaleX(1); } to { transform: scaleX(.94); } }
        @keyframes ms-shoulder { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-5deg); } }
        @keyframes ms-elbow {
          0%, 100% { transform: rotate(0deg); }
          18% { transform: rotate(-20deg); }
          36% { transform: rotate(8deg); }
          54% { transform: rotate(-18deg); }
          72% { transform: rotate(6deg); }
        }
        @keyframes ms-sway { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }
        @keyframes ms-blink { 0%, 94%, 100% { transform: scaleY(1); } 96.5% { transform: scaleY(.08); } }
        @keyframes ms-pop { from { transform: scale(.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ms-drift { from { transform: translateY(0); } to { transform: translateY(-6px); } }
        @keyframes ms-twinkle { 0%, 100% { transform: scale(.5); opacity: .35; } 50% { transform: scale(1); opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .ms-breathe, .ms-head, .ms-shadow, .ms-shoulder, .ms-elbow, .ms-sprout, .ms-eye, .ms-bubble, .ms-spark, .ms-node { animation: none; }
        }
      `}</style>

      {/* backdrop + floating network nodes */}
      <circle cx="210" cy="290" r="182" fill="#E6F6FD" />
      <circle className="ms-node" cx="52" cy="250" r="9" fill={NAVY} />
      <circle className="ms-node" style={{ animationDelay: "1.2s" }} cx="378" cy="360" r="10" fill={GREEN} />
      <circle className="ms-node" style={{ animationDelay: "2.4s" }} cx="70" cy="420" r="7" fill={ORANGE} />

      {/* floor shadow */}
      <ellipse className="ms-shadow" cx="210" cy="490" rx="104" ry="11" fill="#D3EEFA" />

      {/* ---------- legs (static: feet stay planted) ---------- */}
      <path d="M168 360 H252 L255 466 Q255 472 249 472 H219 Q213 472 213 466 L210 392 L207 466 Q207 472 201 472 H171 Q165 472 165 466 Z" fill={ORANGE} />
      <path d="M232 380 L236 472 H219 Q213 472 213 466 L211 396 Z" fill={ORANGE_SHADE} opacity=".35" />
      {/* shoes */}
      <path d="M160 470 Q160 462 170 462 H204 Q212 462 212 472 Q212 484 200 484 H162 Q152 484 152 478 Q152 472 160 470 Z" fill={NAVY} />
      <path d="M260 470 Q260 462 250 462 H216 Q208 462 208 472 Q208 484 220 484 H258 Q268 484 268 478 Q268 472 260 470 Z" fill={NAVY} />

      {/* ---------- upper body breathes ---------- */}
      <g className="ms-breathe">
        {/* resting arm (behind torso) */}
        <path d="M158 272 Q138 300 140 338" stroke={NAVY_DEEP} strokeWidth="30" strokeLinecap="round" fill="none" />
        <path d="M128 336 L152 340" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <circle cx="141" cy="354" r="17" fill={GREEN} />

        {/* waving arm: shoulder → elbow, jointed */}
        <g className="ms-shoulder">
          <path d="M266 268 Q296 256 318 236" stroke={NAVY_DEEP} strokeWidth="30" strokeLinecap="round" fill="none" />
          <g className="ms-elbow">
            <path d="M318 236 Q332 206 336 182" stroke={NAVY_DEEP} strokeWidth="27" strokeLinecap="round" fill="none" />
            {/* white cuff */}
            <path d="M325 178 L348 186" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
            {/* hand */}
            <ellipse cx="342" cy="154" rx="20" ry="22" fill={GREEN} />
            <rect x="324" y="122" width="10" height="28" rx="5" fill={GREEN} />
            <rect x="335" y="114" width="10" height="32" rx="5" fill={GREEN} />
            <rect x="346" y="116" width="10" height="31" rx="5" fill={GREEN} />
            <rect x="356" y="125" width="9" height="25" rx="4.5" fill={GREEN} />
            <rect x="311" y="150" width="22" height="10" rx="5" fill={GREEN} transform="rotate(-38 322 155)" />
          </g>
        </g>

        {/* blazer */}
        <path d="M146 278 Q146 252 172 248 H248 Q274 252 274 278 L266 358 Q265 366 257 366 H163 Q155 366 154 358 Z" fill={NAVY} />
        {/* shirt */}
        <path d="M186 248 H234 L220 338 H200 Z" fill="#FFFFFF" />
        {/* lapels */}
        <path d="M186 248 L210 312 L196 320 L172 262 Z" fill={NAVY_DEEP} />
        <path d="M234 248 L210 312 L224 320 L248 262 Z" fill={NAVY_DEEP} />
        {/* tie */}
        <path d="M203 260 H217 L223 316 L210 332 L197 316 Z" fill={SKY} />
        <path d="M210 262 H217 L223 316 L210 332 Z" fill={SKY_SHADE} opacity=".45" />
        <path d="M201 249 H219 L216 262 H204 Z" fill={SKY_SHADE} />
        {/* collar points */}
        <path d="M188 246 L204 262 L196 270 Z" fill="#FFFFFF" />
        <path d="M232 246 L216 262 L224 270 Z" fill="#FFFFFF" />
        {/* pocket square + buttons */}
        <path d="M164 292 H184 L180 280 Z" fill={ORANGE} />
        <circle cx="226" cy="344" r="3.5" fill={NAVY_DEEP} />
        <circle cx="194" cy="344" r="3.5" fill={NAVY_DEEP} />

        {/* ---------- head tilts gently ---------- */}
        <g className="ms-head">
          {/* sprout */}
          <g className="ms-sprout">
            <path d="M210 98 C209 84 212 74 210 62" stroke={LEAF_DARK} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M210 70 C192 50 168 54 160 68 C176 82 198 84 210 70 Z" fill={LEAF_LIGHT} />
            <path d="M210 64 C224 40 252 40 262 54 C248 72 222 76 210 64 Z" fill={LEAF_DARK} />
          </g>
          {/* ears */}
          <circle cx="134" cy="176" r="16" fill={GREEN_SHADE} />
          <circle cx="286" cy="176" r="16" fill={GREEN_SHADE} />
          {/* head */}
          <circle cx="210" cy="172" r="78" fill={GREEN} />
          <path d="M268 120 A78 78 0 0 1 210 250 A82 82 0 0 0 268 120 Z" fill={GREEN_SHADE} opacity=".7" />
          {/* face plate */}
          <ellipse cx="210" cy="186" rx="56" ry="48" fill="#F4FBE9" />
          {/* brows */}
          <path d="M176 152 Q186 145 196 150" stroke={NAVY} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M224 150 Q234 145 244 152" stroke={NAVY} strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* eyes */}
          <g className="ms-eye">
            <ellipse cx="187" cy="176" rx="10" ry="13" fill={NAVY} />
            <circle cx="190.5" cy="171" r="3.8" fill="#FFFFFF" />
          </g>
          <g className="ms-eye">
            <ellipse cx="233" cy="176" rx="10" ry="13" fill={NAVY} />
            <circle cx="236.5" cy="171" r="3.8" fill="#FFFFFF" />
          </g>
          {/* cheeks */}
          <ellipse cx="169" cy="200" rx="11" ry="7" fill={CHEEK} />
          <ellipse cx="251" cy="200" rx="11" ry="7" fill={CHEEK} />
          {/* smile */}
          <path d="M192 202 Q210 228 228 202 Z" fill={NAVY} />
          <path d="M200 214 Q210 208 220 214 Q210 222 200 214 Z" fill={ORANGE} />
        </g>
      </g>

      {/* sparkles by the waving hand */}
      <path className="ms-spark" d="M372 110 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill={GREEN} />
      <path className="ms-spark" style={{ animationDelay: "1.6s" }} d="M366 226 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill={ORANGE} />

      {/* speech bubble */}
      <g className="ms-bubble">
        <rect x={bx} y="34" width={bw} height="62" rx="31" fill={NAVY} />
        <path d="M120 90 L150 118 L104 94 Z" fill={NAVY} />
        <text x={bx + bw / 2} y="74" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="26" fill="#FFFFFF">
          {message}
        </text>
      </g>
    </svg>
  );
}
