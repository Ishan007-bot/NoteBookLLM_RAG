/* Editorial background ornaments — decorative SVGs and typographic marks
 * scattered across the viewport. Everything is `fixed`, `pointer-events: none`,
 * but with explicit z-index 0 so it sits above the body's pseudo-element
 * gradients and below the actual content (which we ensure with z-10 on the
 * page wrapper's children). The mix:
 *   - Large concentric rings in the top-right (like a celestial diagram)
 *   - A graph-paper dot grid in the bottom-left
 *   - A long hairline arc crossing the upper third
 *   - Floating serif ornaments (¶ § ※ ❦) at strategic positions
 *   - L-shaped corner brackets like archival page marks
 *   - A small "editor's seal" near the bottom-right
 *   - A vertical hairline column rule on wide viewports
 */
export function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Concentric rings — top-right, like a celestial diagram. Pulled down
          and inward a bit so it isn't fully hidden behind the header. */}
      <svg
        className="absolute"
        style={{
          top: "2rem",
          right: "-180px",
          width: "560px",
          height: "560px",
          opacity: 0.32,
          animation: "slow-drift 18s var(--ease-in-out) infinite",
        }}
        viewBox="0 0 560 560"
        fill="none"
      >
        <circle cx="280" cy="280" r="260" stroke="var(--accent)" strokeWidth="1" />
        <circle cx="280" cy="280" r="200" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="280" cy="280" r="140" stroke="var(--ink-faint)" strokeWidth="1" />
        <circle cx="280" cy="280" r="80" stroke="var(--accent)" strokeWidth="1" />
        <circle cx="280" cy="280" r="3" fill="var(--accent)" />
        {/* Cardinal tick marks */}
        <line x1="280" y1="20" x2="280" y2="40" stroke="var(--accent)" strokeWidth="1" />
        <line x1="280" y1="520" x2="280" y2="540" stroke="var(--accent)" strokeWidth="1" />
        <line x1="20" y1="280" x2="40" y2="280" stroke="var(--accent)" strokeWidth="1" />
        <line x1="520" y1="280" x2="540" y2="280" stroke="var(--accent)" strokeWidth="1" />
      </svg>

      {/* Hairline arc crossing the upper-mid area */}
      <svg
        className="absolute hidden lg:block"
        style={{
          top: "32%",
          left: "-10%",
          width: "120vw",
          height: "200px",
          opacity: 0.25,
        }}
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 180 Q 300 20 600 80 T 1200 40"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <path
          d="M0 200 Q 400 60 700 110 T 1200 80"
          stroke="var(--ink-faint)"
          strokeWidth="0.7"
        />
      </svg>

      {/* Graph-paper dot grid — bottom-left */}
      <svg
        className="absolute hidden md:block"
        style={{
          bottom: "10vh",
          left: "2vw",
          width: "260px",
          height: "260px",
          opacity: 0.4,
        }}
        viewBox="0 0 260 260"
      >
        <defs>
          <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--ink-faint)" />
          </pattern>
          <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="grid-mask">
            <rect width="260" height="260" fill="url(#grid-fade)" />
          </mask>
        </defs>
        <rect width="260" height="260" fill="url(#grid-pattern)" mask="url(#grid-mask)" />
      </svg>

      {/* Page corner brackets — archival marks */}
      <svg
        className="absolute hidden sm:block"
        style={{ top: "5.5rem", left: "1.25rem", width: "44px", height: "44px", opacity: 0.4 }}
        viewBox="0 0 44 44"
        fill="none"
      >
        <path d="M2 14 V 2 H 14" stroke="var(--ink-faint)" strokeWidth="1" />
      </svg>
      <svg
        className="absolute hidden sm:block"
        style={{ top: "5.5rem", right: "1.25rem", width: "44px", height: "44px", opacity: 0.4 }}
        viewBox="0 0 44 44"
        fill="none"
      >
        <path d="M30 2 H 42 V 14" stroke="var(--ink-faint)" strokeWidth="1" />
      </svg>
      <svg
        className="absolute hidden sm:block"
        style={{ bottom: "5.5rem", left: "1.25rem", width: "44px", height: "44px", opacity: 0.4 }}
        viewBox="0 0 44 44"
        fill="none"
      >
        <path d="M2 30 V 42 H 14" stroke="var(--ink-faint)" strokeWidth="1" />
      </svg>
      <svg
        className="absolute hidden sm:block"
        style={{ bottom: "5.5rem", right: "1.25rem", width: "44px", height: "44px", opacity: 0.4 }}
        viewBox="0 0 44 44"
        fill="none"
      >
        <path d="M30 42 H 42 V 30" stroke="var(--ink-faint)" strokeWidth="1" />
      </svg>

      {/* Floating serif ornaments at strategic positions */}
      <Ornament glyph="¶" top="22%" left="3vw" rotate="-8deg" size="3rem" />
      <Ornament glyph="§" top="58%" right="5vw" rotate="6deg" size="3.4rem" />
      <Ornament glyph="※" bottom="22vh" left="44vw" rotate="0deg" size="2.6rem" hideOnMobile />
      <Ornament glyph="❦" top="12vh" right="32vw" rotate="-12deg" size="2.8rem" hideOnMobile />
      <Ornament glyph="*" bottom="32vh" right="14vw" rotate="20deg" size="2.2rem" hideOnMobile />

      {/* A geometric editor's seal in the lower-right */}
      <svg
        className="absolute hidden md:block"
        style={{
          bottom: "14vh",
          right: "6vw",
          width: "130px",
          height: "130px",
          opacity: 0.28,
          animation: "slow-drift 24s var(--ease-in-out) infinite reverse",
        }}
        viewBox="0 0 130 130"
        fill="none"
      >
        <rect x="10" y="10" width="110" height="110" stroke="var(--ink-faint)" strokeWidth="1" />
        <rect x="22" y="22" width="86" height="86" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="10" y1="10" x2="120" y2="120" stroke="var(--ink-faint)" strokeWidth="0.5" />
        <line x1="120" y1="10" x2="10" y2="120" stroke="var(--ink-faint)" strokeWidth="0.5" />
        <circle cx="65" cy="65" r="7" fill="var(--accent)" />
        <text x="65" y="125" textAnchor="middle" fontSize="6" fill="var(--ink-faint)" fontFamily="var(--font-geist-mono)" letterSpacing="2">FOLIO · I</text>
      </svg>

      {/* Vertical column rule — like a manuscript margin */}
      <div
        className="absolute hidden xl:block"
        style={{
          top: 0,
          right: "calc((100vw - 1280px) / 2 - 32px)",
          width: "1px",
          height: "100vh",
          background:
            "linear-gradient(to bottom, transparent, var(--rule) 18%, var(--rule) 82%, transparent)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

function Ornament({
  glyph,
  top,
  bottom,
  left,
  right,
  rotate,
  size,
  hideOnMobile,
}: {
  glyph: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate: string;
  size: string;
  hideOnMobile?: boolean;
}) {
  return (
    <span
      className={`font-display absolute select-none italic ${hideOnMobile ? "hidden md:inline" : ""}`}
      style={{
        top,
        bottom,
        left,
        right,
        transform: `rotate(${rotate})`,
        fontSize: size,
        color: "var(--accent)",
        opacity: 0.2,
        lineHeight: 1,
        fontVariationSettings: '"opsz" 144',
      }}
    >
      {glyph}
    </span>
  );
}
