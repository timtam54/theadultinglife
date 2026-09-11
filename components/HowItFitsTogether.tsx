"use client";

/*
 * How the four main app concepts connect — Setup Guide feeds the Organiser,
 * which pairs with the Peace of Mind Planner, and both can be shared with
 * chosen people. A dot travels along the arrows so users see the flow,
 * not just labels.
 *
 * Clicking a node opens an educational dialog explaining what that concept
 * is, with a plain-English example. Some concepts have a "Take me there"
 * link (Organiser, Planner). Setup Guide is where they already are, and
 * Sharing is a per-folder feature not a destination — those get an
 * explanation without a link, which is the point of a *teaching* diagram
 * (not a nav shortcut).
 */

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";

interface Node {
  color: "violet" | "amber" | "emerald" | "sky";
  label: string;
  body: string;
  icon: React.ReactNode;
  /** Plain-English explanation shown in the info dialog. */
  what: string;
  /** A concrete example ("For example: …") so it clicks for the user. */
  example: string;
  /** Optional deep-link — omit for concepts that don't have a page (Setup
   *  Guide = this page; Sharing = a per-folder button, not a page). */
  goto?: { href: string; label: string };
}

const NODES: Node[] = [
  {
    color: "violet",
    label: "Setup Guide",
    body: "Walks you through, section by section.",
    icon: <IconGuide />,
    what:
      "The Setup Guide is exactly what you're using right now — a step-by-step walkthrough of the essentials. Everything you type into it saves straight into your Organiser folders, so there's no double entry.",
    example:
      "For example: when you enter your Medicare number in the Setup Guide, it lands in the Health folder in your Organiser automatically.",
  },
  {
    color: "amber",
    label: "Organiser",
    body: "Everything you filled in lives here.",
    icon: <IconFolder />,
    what:
      "The Organiser is the heart of the app — folders for Personal, Health, Employment, Admin and more, with a column for every family member. Anything you enter (through the Setup Guide, forms, or uploads) lives here so you can find it fast when you need it.",
    example:
      "For example: passport expiry, private-health-fund details, car rego, kids' immunisation records — all filed by folder and by person.",
    goto: { href: "/records", label: "Open the Organiser" },
  },
  {
    color: "emerald",
    label: "Planner",
    body: "For the things that matter most.",
    icon: <IconHeart />,
    what:
      "The Peace of Mind Planner is different from the Organiser. This is for the things that matter most — letters to loved ones, funeral wishes, last words, who to call if something happens. Ready if your family ever needs them.",
    example:
      "For example: a letter to your kids, your preferred funeral songs, or where the will is kept.",
    goto: {
      href: "/templates/peace-of-mind-planner",
      label: "Open the Planner",
    },
  },
  {
    color: "sky",
    label: "Sharing",
    body: "Grant access to people you choose.",
    icon: <IconShare />,
    what:
      "Sharing isn't a separate page — it's a Share button on every folder and Planner section. You choose exactly what to share, with whom, and can revoke it any time. Nothing is ever shared unless you deliberately share it.",
    example:
      "For example: share the Emergency Contacts folder with a sibling, or the whole Planner with your partner.",
  },
];

export function HowItFitsTogether() {
  // Bumping this key remounts the SVG, which restarts the CSS animation from
  // scratch — simpler than fiddling with animation-play-state timing.
  const [replayKey, setReplayKey] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
        .tal-flow-node-btn {
          cursor: pointer;
        }
        .tal-flow-node-btn:focus { outline: none; }
        .tal-flow-node-btn:focus-visible circle:first-of-type {
          stroke: #4c1d95;
          stroke-width: 2;
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
              onOpen={() => setOpenIndex(i)}
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
          Tap any circle to learn more.{" "}
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
            <MobileNode node={n} onOpen={() => setOpenIndex(i)} />
            {i < NODES.length - 1 && <MobileArrow />}
          </Fragment>
        ))}
      </ol>

      {openIndex !== null && (
        <NodeInfoDialog
          node={NODES[openIndex]}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

function SvgNode({
  x,
  node,
  onOpen,
}: {
  x: number;
  node: Node;
  onOpen: () => void;
}) {
  const bg = colorHex(node.color);
  return (
    <g
      className="tal-flow-node tal-flow-node-btn"
      style={{ transformOrigin: `${x}px 60px` }}
      role="button"
      tabIndex={0}
      aria-label={`Learn about ${node.label}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <circle cx={x} cy={60} r={30} fill={bg} />
      <foreignObject x={x - 12} y={48} width={24} height={24}>
        <div className="text-tal-plum flex items-center justify-center w-full h-full pointer-events-none">
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
    </g>
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

function MobileNode({
  node,
  onOpen,
}: {
  node: Node;
  onOpen: () => void;
}) {
  const bg =
    node.color === "violet"  ? "bg-violet-100"
    : node.color === "amber"   ? "bg-amber-100"
    : node.color === "emerald" ? "bg-emerald-100"
    :                            "bg-sky-100";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-tal-cream-soft transition-colors text-left"
        aria-label={`Learn about ${node.label}`}
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
        <span
          className="text-[11px] text-tal-plum-soft shrink-0"
          aria-hidden
        >
          Learn →
        </span>
      </button>
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

function NodeInfoDialog({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chip =
    node.color === "violet"  ? "bg-violet-100"
    : node.color === "amber"   ? "bg-amber-100"
    : node.color === "emerald" ? "bg-emerald-100"
    :                            "bg-sky-100";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-fits-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <span
            className={
              "shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-tal-plum " +
              chip
            }
            aria-hidden
          >
            {node.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-semibold">
              How the pieces fit
            </div>
            <h3
              id="how-it-fits-dialog-title"
              className="font-display text-xl text-tal-plum leading-tight"
            >
              {node.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-lg text-tal-plum-soft hover:bg-tal-cream-soft inline-flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="text-sm text-tal-plum leading-relaxed">
          {node.what}
        </p>
        <p className="text-sm text-tal-plum-soft leading-relaxed mt-3 italic">
          {node.example}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Got it
          </button>
          {node.goto && (
            <Link
              href={node.goto.href}
              className="h-9 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium inline-flex items-center gap-1.5"
            >
              {node.goto.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
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
