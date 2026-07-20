"use client";

import { useEffect, useState } from "react";
import type { CelebrateBadge } from "@/lib/celebrate";

// Lightweight, dependency-free confetti — 30 coloured squares that fall
// with a bit of horizontal drift and rotation. All CSS, no canvas.
const CONFETTI_COLOURS = [
  "#a78bfa", // violet-400
  "#fbbf24", // amber-400
  "#38bdf8", // sky-400
  "#fb7185", // rose-400
  "#34d399", // emerald-400
  "#f9a8d4", // pink-300
];

export function CelebrationLayer() {
  const [active, setActive] = useState<CelebrateBadge | null>(null);

  useEffect(() => {
    function onEvt(e: Event) {
      const ce = e as CustomEvent<CelebrateBadge[]>;
      const badges = ce.detail;
      if (!badges || badges.length === 0) return;
      // Only celebrate the first badge — showing 6 modals in a row is annoying.
      setActive((current) => current ?? badges[0]);
    }
    window.addEventListener("tal:celebrate", onEvt);
    return () => window.removeEventListener("tal:celebrate", onEvt);
  }, []);

  if (!active) return null;
  return (
    <CelebrationModal badge={active} onClose={() => setActive(null)} />
  );
}

function CelebrationModal({
  badge,
  onClose,
}: {
  badge: CelebrateBadge;
  onClose: () => void;
}) {
  // Auto-dismiss after 6s so the flow keeps moving.
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-live="polite"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <Confetti />
      <div className="relative z-10 max-w-sm w-full rounded-3xl bg-white shadow-2xl p-8 text-center">
        <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-medium mb-1">
          New badge earned
        </div>
        <div className="text-6xl mb-3" aria-hidden>
          {emojiFor(badge.icon)}
        </div>
        <h2 className="font-display text-2xl text-tal-plum leading-tight">
          {badge.label}
        </h2>
        <p className="text-sm text-tal-plum-soft mt-2 leading-relaxed">
          {badge.description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium hover:bg-tal-plum-dark"
          >
            Nice one
          </button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  // 30 pieces with random left position, delay, colour, rotation.
  const pieces = Array.from({ length: 30 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2 + Math.random() * 2;
    const colour = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
    const rotate = Math.random() * 360;
    const size = 8 + Math.random() * 6;
    return { left, delay, duration, colour, rotate, size, key: i };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute top-0 confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.colour,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes talConfettiFall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          border-radius: 2px;
          animation-name: talConfettiFall;
          animation-timing-function: linear;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}

function emojiFor(icon: string): string {
  switch (icon) {
    case "sparkle":
      return "✨";
    case "star":
      return "⭐";
    case "flame":
      return "🔥";
    case "trophy":
      return "🏆";
    case "target":
      return "🎯";
    case "check":
      return "✅";
    case "book":
      return "📚";
    case "medal":
      return "🥇";
    case "rocket":
      return "🚀";
    default:
      return "🎉";
  }
}
