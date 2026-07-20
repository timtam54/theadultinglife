import type { Metadata } from "next";
import { TalAiChat } from "@/components/TalAiChat";

export const metadata: Metadata = {
  title: "TAL AI",
  description: "Ask The Adulting Life AI anything about life admin.",
};

export default function TalAiPage() {
  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            TAL AI
          </span>
          <h1 className="font-display text-2xl leading-tight">Ask anything</h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">Powered by ChatGPT</span>
        </div>
      </div>
      <TalAiChat />
    </div>
  );
}
