"use client";

/*
 * How the four main app concepts connect — Setup Guide feeds the Organiser,
 * which pairs with the Peace of Mind Planner, and both can be shared with
 * chosen people. A dot travels along the arrows so users see the flow,
 * not just labels.
 *
 * Each node is a real link so users can peek at the section in a new tab
 * without leaving the Setup Guide. "Watch again" replays the animation.
 */

import { Fragment, useState } from "react";

interface Node {
  href: string;
  color: "violet" | "amber" | "emerald" | "sky";
  label: string;
  body: string;
  icon: React.ReactNode;
}

const NODES: Node[] = [
  {
    href: "/welcome",
    color: "violet",
    label: "Setup Guide",
    body: "Walks you through, section by section.",
    icon: <IconGuide />,
  },
  {
    href: "/records",
    color: "amber",
    label: "Organiser",
    body: "Everything you filled in lives here.",
    icon: <IconFolder />,
  },
  {
    href: "/templates/peace-of-mind-planner",
    color: "emerald",
    label: "Planner",
    body: "For the things that matter most.",
    icon: <IconHeart />,
  },
  {
    // Sharing is a feature, not a page — send them to the Organiser where the
    // Share button lives on every folder.
    href: "/records",
    color: "sky",
    label: "Sharing",
    body: "Grant access to people you choose.",
    icon: <IconShare />,
  },
];

export function HowItFitsTogether() {
  // Bumping this key remounts the SVG, which restarts the CSS animation from
  // scratch — simpler than fiddling with animation-play-state timing.
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="mt-5 rounded-2xl border border-tal-line bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[11px] uppercase tracking-widest text-tal-plum-soft font-semibold">
          How the pieces fit together
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="inline-flex items-center gap-1 text-[11px] text-tal-plum-soft hover:text-tal-plum underline underline-offset-2"
          aria-label="Replay the flow animation"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Watch again
        </button>
      </div>

      {/* Injected CSS for the dot. Kept inline so this component works
          standalone without touching the Tailwind config. */}
      <style>{`
        @keyframes talFlowDot {
          0%   { offset-distance: 0%;   opacity: 0; }
          6%   { opacity: 1; }
          25%  { offset-distance: 33%;  opacity: 1; }
          50%  { offset-distance: 66%;  opacity: 1; }
          75%  { offset-distance: 100%; opacity: 1; }
          88%  { opacity: 0; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes talFlowPulse {
          0%, 100% { transform: scale(1);   filter: brightness(1); }
          50%      { transform: scale(1.06); filter: brightness(1.06); }
        }
        .tal-flow-dot {
          offset-path: path("M 60 60 L 510 60");
          offset-rotate: 0deg;
          animation: talFlowDot 6s ease-in-out infinite;
        }
        .tal-flow-node {
          animation: talFlowPulse 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tal-flow-dot,
          .tal-flow-node { animation: none; }
        }
      `}</style>

      {/* Desktop / tablet — horizontal flow. */}
      <div className="hidden sm:block">
        <svg
          key={`svg-${replayKey}`}
          viewBox="0 0 570 120"
          className="w-full h-auto"
          role="img"
          aria-label="Setup Guide feeds the Organiser. The Organiser pairs with the Peace of Mind Planner. Both can be shared with people you choose."
        >
          {/* Connecting arrows */}
          <line x1="90" y1="60" x2="180" y2="60" stroke="currentColor" strokeWidth="1.5" className="text-tal-line" />
          <line x1="240" y1="60" x2="330" y2="60" stroke="currentColor" strokeWidth="1.5" className="text-tal-line" />
          <line x1="390" y1="60" x2="480" y2="60" stroke="currentColor" strokeWidth="1.5" className="text-tal-line" />

          {/* Small arrowheads at each segment end */}
          {[180, 330, 480].map((cx) => (
            <polyline
              key={cx}
              points={`${cx - 6},55 ${cx},60 ${cx - 6},65`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-tal-line"
            />
          ))}

          {/* Nodes — coloured chip + white icon disc, matching the tile colours below. */}
          {NODES.map((n, i) => (
            <SvgNode
              key={n.label}
              x={60 + i * 150}
              node={n}
            />
          ))}

          {/* The travelling dot */}
          <circle
            className="tal-flow-dot text-tal-plum"
            r="6"
            fill="currentColor"
          />
        </svg>
        <div className="text-xs text-tal-plum-soft leading-snug mt-2">
          <span className="font-medium text-tal-plum">Setup</span> fills your{" "}
          <span className="font-medium text-tal-plum">Organiser</span>. Your{" "}
          <span className="font-medium text-tal-plum">Planner</span> holds
          what matters most. You choose who to{" "}
          <span className="font-medium text-tal-plum">share</span> with.
        </div>
      </div>

      {/* Mobile — vertical stack of the four nodes. Same colours + icons. */}
      <ol className="sm:hidden space-y-2">
        {NODES.map((n, i) => (
          <Fragment key={n.label}>
            <MobileNode node={n} />
            {i < NODES.length - 1 && <MobileArrow />}
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

function SvgNode({ x, node }: { x: number; node: Node }) {
  const bg = colorHex(node.color);
  return (
    <a
      href={node.href}
      target="_blank"
      rel="noreferrer"
      className="tal-flow-node"
      style={{ transformOrigin: `${x}px 60px`, cursor: "pointer" }}
      aria-label={`Open ${node.label} in a new tab`}
    >
      <circle cx={x} cy={60} r={30} fill={bg} />
      <foreignObject x={x - 12} y={48} width={24} height={24}>
        <div className="text-tal-plum flex items-center justify-center w-full h-full">
          {node.icon}
        </div>
      </foreignObject>
      <text
        x={x}
        y={108}
        textAnchor="middle"
        className="fill-tal-plum text-[10px] font-semibold"
        style={{ fontFamily: "inherit" }}
      >
        {node.label}
      </text>
    </a>
  );
}

function colorHex(c: Node["color"]): string {
  switch (c) {
    case "violet":  return "#ede9fe";
    case "amber":   return "#fef3c7";
    case "emerald": return "#d1fae5";
    case "sky":     return "#e0f2fe";
  }
}

function MobileNode({ node }: { node: Node }) {
  const bg =
    node.color === "violet"  ? "bg-violet-100"
    : node.color === "amber"   ? "bg-amber-100"
    : node.color === "emerald" ? "bg-emerald-100"
    :                            "bg-sky-100";
  return (
    <li>
      <a
        href={node.href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-tal-cream-soft transition-colors"
      >
        <span className={"shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-tal-plum " + bg}>
          {node.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-tal-plum leading-tight">
            {node.label}
          </div>
          <div className="text-xs text-tal-plum-soft leading-snug">
            {node.body}
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="text-tal-plum-soft"
        >
          <path
            d="M7 17L17 7M7 7h10v10"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </li>
  );
}

function MobileArrow() {
  return (
    <li aria-hidden className="pl-5 text-tal-plum-soft">
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
        <path d="M6 1v11M2 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </li>
  );
}

/* Icons — matched to the corresponding Hello step tiles for consistency. */
function IconGuide() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
      />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
      />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
