// Maps a Next.js pathname to a help content slug.
// Returns null if this route has no help content.
//
// Records routes: /records/{category}/{category}.{sub}  →  {category}.{sub}
// Non-records:    /dashboard, /learn/articles, etc.     →  matches STATIC_ROUTES
//
// The presence of a matching row in the help_embeddings table (keyed by slug)
// is what ultimately decides whether the help button is shown — this resolver
// just produces the *candidate* slug.

const STATIC_ROUTES: Record<string, string> = {
  "/dashboard": "dashboard",
  "/records": "records",
  "/learn": "learn",
  "/learn/articles": "learn.articles",
  "/learn/quizzes": "learn.quizzes",
  "/learn/videos": "learn.videos",
  "/emergency": "emergency",
  "/receipts": "receipts",
  "/reminders": "reminders",
  "/documents": "documents",
  "/tasks": "tasks",
  "/settings": "settings",
  "/subscription": "subscription",
  "/security": "security",
  "/tal-ai": "tal-ai",
  "/templates/peace-of-mind-planner": "templates.peace-of-mind-planner",
};

export function routeToHelpSlug(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (STATIC_ROUTES[clean]) return STATIC_ROUTES[clean];

  // Peace of mind planner sub-sections all share the parent help.
  if (clean.startsWith("/templates/peace-of-mind-planner/")) {
    return "templates.peace-of-mind-planner";
  }
  // Learn deep pages fall back to the learn root.
  if (clean.startsWith("/learn/")) {
    for (const [route, slug] of Object.entries(STATIC_ROUTES)) {
      if (clean === route || clean.startsWith(route + "/")) return slug;
    }
    return "learn";
  }

  // Records: /records/{category}/{subcategorySlug}
  const recordsMatch = clean.match(/^\/records\/[^/]+\/([^/]+)/);
  if (recordsMatch) {
    return recordsMatch[1]; // subcategory id is already "category.sub"
  }

  return null;
}

// Reverse: given a help slug (e.g. "personal.passport_travel" or "dashboard"),
// return the app URL where that help page lives. Used by TAL AI citations
// to link users straight to the relevant section.
export function helpSlugToRoute(slug: string): string | null {
  // Static routes: reverse the STATIC_ROUTES map.
  for (const [route, s] of Object.entries(STATIC_ROUTES)) {
    if (s === slug) return route;
  }
  // Records: "category.sub" → "/records/category/category.sub"
  const dot = slug.indexOf(".");
  if (dot > 0) {
    const category = slug.slice(0, dot);
    if (["personal", "health", "education", "employment", "admin"].includes(category)) {
      return `/records/${category}/${slug}`;
    }
  }
  return null;
}
