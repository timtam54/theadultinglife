import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline — pages you've already loaded will still work.",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-tal-plum mb-3">
        You&rsquo;re offline
      </h1>
      <p className="text-tal-plum-soft max-w-md">
        We couldn&rsquo;t reach the server. Pages you&rsquo;ve already loaded
        will still work. Try again once you&rsquo;re back online.
      </p>
    </main>
  );
}
