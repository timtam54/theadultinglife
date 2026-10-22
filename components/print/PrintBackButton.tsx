"use client";

// "Back" on the print / Save-as-PDF screens. These open as their own page
// (often a new tab), and on an iPad — especially when the app is installed
// to the home screen — there's no browser back button, so without this the
// only way out is closing the app.
//
// Goes back if there's somewhere to go back to; otherwise closes the tab if
// the browser allows it; otherwise returns to the page they came from (or
// the dashboard).
export function PrintBackButton({ className = "" }: { className?: string }) {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
    // Still here? The browser didn't let us close it — go to the app instead.
    setTimeout(() => {
      let href = "/dashboard";
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (ref && ref.origin === window.location.origin) href = ref.pathname + ref.search;
      } catch {
        /* keep the dashboard */
      }
      window.location.href = href;
    }, 150);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`no-print print:hidden shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-tal-line bg-white text-tal-plum text-sm font-medium hover:bg-tal-cream-soft ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
