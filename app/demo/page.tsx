"use client";

// Public walkthroughs: hand-built copies of the app's screens with a made-up
// family's sample data, played like a screen recording — no sign-in, nothing
// touches the database. The player and each walkthrough are in
// components/demo/. /demo#<id> opens that walkthrough full screen straight away.

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AuditPathPublic } from "@/components/AuditPathPublic";
import DashboardWalkthrough from "@/components/demo/DashboardWalkthrough";
import GettingStartedWalkthrough from "@/components/demo/GettingStartedWalkthrough";
import FamilyWalkthrough from "@/components/demo/FamilyWalkthrough";
import DocumentScanWalkthrough from "@/components/demo/DocumentScanWalkthrough";
import PlannerWalkthrough from "@/components/demo/PlannerWalkthrough";
import ReceiptsWalkthrough from "@/components/demo/ReceiptsWalkthrough";
import AiHelpersWalkthrough from "@/components/demo/AiHelpersWalkthrough";
import MoneyWalkthrough from "@/components/demo/MoneyWalkthrough";
import RemindersWalkthrough from "@/components/demo/RemindersWalkthrough";
import SafeWalkthrough from "@/components/demo/SafeWalkthrough";

type Walkthrough = ComponentType<{ autoStart?: boolean }>;

const DEMOS: { id: string; title: string; blurb: string; device: "phone" | "browser" | "both"; Demo: Walkthrough }[] = [
  {
    id: "dashboard",
    title: "Your dashboard",
    blurb: "Everything at a glance — reminders, what to do next, your emergency information — and search that finds things even when you're not sure what they're called.",
    device: "both",
    Demo: DashboardWalkthrough,
  },
  {
    id: "start",
    title: "Getting started",
    blurb: "Sign in with Google, Microsoft or Apple, set your PIN, and land on your life at a glance.",
    device: "phone",
    Demo: GettingStartedWalkthrough,
  },
  {
    id: "family",
    title: "Your family, all in one place",
    blurb: "Add your partner and kids — everyone gets their own folders, and you can see what's done and what's next.",
    device: "browser",
    Demo: FamilyWalkthrough,
  },
  {
    id: "scan",
    title: "Fill in a document from a photo",
    blurb: "Photograph your passport or licence and the details fill themselves in — with a reminder before it expires.",
    device: "phone",
    Demo: DocumentScanWalkthrough,
  },
  {
    id: "planner",
    title: "Peace of Mind Planner",
    blurb: "Your wishes, letters and important contacts — shared only with the people you choose, like your next of kin.",
    device: "browser",
    Demo: PlannerWalkthrough,
  },
  {
    id: "receipts",
    title: "Receipts and bills from a photo",
    blurb: "Snap a receipt and it becomes a record — store, amount, GST and category — and your bills paid add up for you.",
    device: "phone",
    Demo: ReceiptsWalkthrough,
  },
  {
    id: "ai",
    title: "AI that helps you write",
    blurb: "A résumé and cover letter in minutes, answers to your adulting questions, and talk instead of typing.",
    device: "browser",
    Demo: AiHelpersWalkthrough,
  },
  {
    id: "money",
    title: "Money made simple",
    blurb: "Build a budget from your pay, see how long a loan will take to pay off, and watch savings grow.",
    device: "browser",
    Demo: MoneyWalkthrough,
  },
  {
    id: "reminders",
    title: "Stay on top of everything",
    blurb: "Reminders before things expire, tasks, emergency details on hand, and life skills to learn as you go.",
    device: "phone",
    Demo: RemindersWalkthrough,
  },
  {
    id: "safe",
    title: "Safe, private and yours",
    blurb: "Your own PIN and Face ID, and download everything — documents and all — whenever you like.",
    device: "browser",
    Demo: SafeWalkthrough,
  },
];

export default function DemoPage() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash.replace("#", "").toLowerCase());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <AuditPathPublic />
      <header className="border-b border-tal-line bg-[#fffdfb]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="https://www.theadultinglife.com.au" aria-label="The Adulting Life website">
            <BrandLogo wordmark priority className="h-10 w-auto" />
          </a>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/shop" className="rounded-full px-4 py-2 text-tal-plum-dark hover:bg-tal-cream-soft">
              Shop
            </Link>
            <Link href="/login" className="rounded-full bg-black px-4 py-2 font-medium text-white">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-light text-tal-plum-dark sm:text-5xl">See The Adulting Life in action</h1>
          <p className="mt-4 text-lg text-tal-plum-soft">
            Short walkthroughs of the app with a made-up family, the Taylors. No sign-in needed — press play on any of them.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            {DEMOS.map((d) => (
              <li key={d.id}>
                <a href={`#${d.id}`} className="inline-block rounded-full border border-tal-line px-3 py-1.5 text-tal-plum-dark hover:bg-tal-cream-soft">
                  {d.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {DEMOS.map(({ id, title, blurb, device, Demo }) => (
          <section key={id} id={id} className="mt-20 scroll-mt-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-light text-tal-plum-dark">{title}</h2>
              <p className="mt-3 text-tal-plum-soft">{blurb}</p>
            </div>
            <div className={`mx-auto mt-8 ${device === "phone" ? "max-w-md" : device === "both" ? "max-w-md md:max-w-5xl" : "max-w-5xl"}`}>
              <Demo key={`${id}-${hash}`} autoStart={hash === id} />
            </div>
          </section>
        ))}

        <div className="mt-20 text-center">
          <Link href="/login" className="inline-flex h-12 items-center rounded-full bg-black px-8 font-medium text-white">
            Get started
          </Link>
          <p className="mt-3 text-sm text-tal-plum-soft">
            The people and documents in these walkthroughs are made up.{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
