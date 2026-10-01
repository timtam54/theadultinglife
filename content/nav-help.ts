// Short "where is X?" descriptions, one per navigation destination in the
// app. Fed to scripts/embed-nav-help.ts to produce one row per entry in the
// help_embeddings table so TAL AI can answer "where is …?" questions with
// specific menu-path instructions rather than generic web advice.
//
// Each entry generates a help doc whose slug is `nav.<key>`, title is a
// question-shaped string ("Where is the Privacy policy?"), and body lists
// the menu path + one-line description. Keep the body short — the whole
// doc gets embedded as a single vector, and shorter + more focused = better
// match quality on specific "where is" questions.

export interface NavHelpEntry {
  /** Slug suffix. Full help_embeddings slug is `nav.<key>`. */
  key: string;
  /** Human name used in the title. */
  pageName: string;
  /** Where the user clicks to get there, written as a readable path. */
  menuPath: string;
  /** One or two sentences describing what the page is for. */
  description: string;
  /** Extra phrasings a user might search for. Baked into the embedding so
   *  non-literal queries ("ToS", "legals", "privacy notice") still match. */
  synonyms?: string[];
  /** Optional explicit route for citation links. Falls back to blank. */
  route?: string;
}

export const NAV_HELP: NavHelpEntry[] = [
  // Main sidebar — primary nav
  {
    key: "dashboard",
    pageName: "Dashboard",
    menuPath: "Left sidebar → Dashboard (the first item).",
    description: "The home screen. Shows your Life at a Glance, upcoming reminders, outstanding tasks, and a snapshot of how set up your Organiser is.",
    synonyms: ["home", "landing page", "start page", "life at a glance"],
    route: "/dashboard",
  },
  {
    key: "setup-guide",
    pageName: "Setup Guide",
    menuPath: "Left sidebar → Setup guide.",
    description: "A step-by-step walkthrough of your Organiser. Takes you through each section (Personal, Health, Education, Employment, Admin) one at a time so you can fill things in without feeling overwhelmed.",
    synonyms: ["welcome wizard", "onboarding", "getting started", "first-time setup"],
    route: "/welcome",
  },
  {
    key: "organiser",
    pageName: "The Adulting Life Organiser",
    menuPath: "Left sidebar → The Adulting Life Organiser.",
    description: "The main Organiser — five big sections (Personal, Health, Education, Employment, Admin & Bookkeeping) full of folders where you keep your life information and scanned documents.",
    synonyms: ["records", "folders", "my info", "my organiser"],
    route: "/records",
  },
  {
    key: "documents",
    pageName: "Documents",
    menuPath: "Left sidebar → Documents.",
    description: "A single list of every file you've ever uploaded across all folders. Search and filter here when you can't remember which folder a document is in.",
    synonyms: ["files", "all files", "uploads", "document library"],
    route: "/documents",
  },
  {
    key: "receipts",
    pageName: "Receipts",
    menuPath: "Left sidebar → Receipts.",
    description: "Snap or upload purchase receipts. TAL extracts the vendor, amount, date, and category so you can search them later and export at tax time.",
    synonyms: ["purchases", "expenses", "spending", "tax receipts"],
    route: "/receipts",
  },
  {
    key: "peace-of-mind-planner",
    pageName: "Peace of Mind Planner",
    menuPath: "Left sidebar → Peace of Mind Planner.",
    description: "A guided template that pulls together everything a trusted person would need if something happened to you — IDs, accounts, insurances, important contacts, and wishes. Prints as a single document.",
    synonyms: ["pom planner", "emergency plan", "estate plan", "if something happens to me"],
    route: "/templates/peace-of-mind-planner",
  },
  {
    key: "learn",
    pageName: "Learn",
    menuPath: "Left sidebar → Learn.",
    description: "Short articles, videos, and quizzes that teach you how to look after each part of your life admin. Earn certificates as you work through a section.",
    synonyms: ["course", "lessons", "education", "articles", "videos", "quizzes"],
    route: "/learn",
  },
  {
    key: "learn.articles",
    pageName: "Learn — Articles",
    menuPath: "Left sidebar → Learn → Articles tab.",
    description: "All Learn articles in one list, filterable by section.",
    route: "/learn/articles",
  },
  {
    key: "learn.videos",
    pageName: "Learn — Videos",
    menuPath: "Left sidebar → Learn → Videos tab.",
    description: "All Learn videos in one list.",
    route: "/learn/videos",
  },
  {
    key: "learn.quizzes",
    pageName: "Learn — Quizzes",
    menuPath: "Left sidebar → Learn → Quizzes tab.",
    description: "All quizzes in one list. Passing a quiz counts toward the section certificate.",
    route: "/learn/quizzes",
  },
  {
    key: "tal-ai",
    pageName: "TAL AI (Ask anything)",
    menuPath: "Left sidebar → TAL AI.",
    description: "Chat with TAL about anything in the app — where things are, how a folder works, what a form field means. Always answers in context of TAL's help guide.",
    synonyms: ["chat", "assistant", "ask tal", "chatbot", "help ai"],
    route: "/tal-ai",
  },
  {
    key: "tasks",
    pageName: "Tasks",
    menuPath: "Left sidebar → Tasks.",
    description: "A simple to-do list for life-admin items. Create tasks, mark them done, and see what's outstanding on your Dashboard.",
    synonyms: ["todo", "to-do list", "jobs"],
    route: "/tasks",
  },
  {
    key: "reminders",
    pageName: "Reminders",
    menuPath: "Left sidebar → Reminders.",
    description: "Date-based alerts (passport expiry, car rego, insurance renewal). Can be one-off or recurring; shows on your Dashboard and can send push notifications.",
    synonyms: ["alerts", "notifications", "due dates", "renewals"],
    route: "/reminders",
  },
  {
    key: "emergency",
    pageName: "Emergency",
    menuPath: "Left sidebar → Emergency.",
    description: "Fast-access screen for emergencies: emergency contacts, allergies, blood group, Medicare number — the things a paramedic or trusted person needs quickly.",
    synonyms: ["ice", "in case of emergency", "medical info", "emergency contacts"],
    route: "/emergency",
  },
  {
    key: "settings",
    pageName: "Settings",
    menuPath: "Left sidebar → Settings.",
    description: "Your account settings: profile, notification preferences, PIN lock, data export, delete account, reset Setup Guide.",
    synonyms: ["preferences", "options", "account settings"],
    route: "/settings",
  },
  {
    key: "subscription",
    pageName: "Subscription",
    menuPath: "Left sidebar → Subscription.",
    description: "Your TAL Premium subscription — current plan, billing, upgrade or cancel.",
    synonyms: ["billing", "plan", "premium", "payment"],
    route: "/subscription",
  },
  {
    key: "maps",
    pageName: "Maps",
    menuPath: "Left sidebar → Maps.",
    description: "A map view of locations you've saved against records (addresses on licences, properties, schools, workplaces).",
    synonyms: ["locations", "addresses", "map view"],
  },
  {
    key: "security",
    pageName: "Security & Vault",
    menuPath: "Open directly at /security. (Also linked from the Organiser landing page.)",
    description: "PIN lock, biometric unlock, session timeout, and the encrypted Vault for extra-sensitive items.",
    synonyms: ["pin", "lock", "vault", "biometric", "privacy settings"],
    route: "/security",
  },

  // User avatar menu (top-right)
  {
    key: "profile-menu",
    pageName: "Your profile menu",
    menuPath: "Top-right of any page → click your avatar.",
    description: "A dropdown menu with your account info and links to Family groups, admin tools, Privacy policy, Terms & conditions, Take the tour, and Sign out.",
    synonyms: ["avatar menu", "user menu", "account menu", "profile dropdown"],
  },
  {
    key: "privacy-policy",
    pageName: "Privacy policy",
    menuPath: "Top-right avatar menu → Privacy policy.",
    description: "Explains what personal data TAL collects, how it's stored, who can see it, and your rights. Read before signing up or granting access to family members.",
    synonyms: ["privacy", "privacy statement", "privacy notice", "data policy", "gdpr", "privacy page"],
    route: "/legal/privacy",
  },
  {
    key: "terms-conditions",
    pageName: "Terms & conditions",
    menuPath: "Top-right avatar menu → Terms & conditions.",
    description: "The legal agreement for using The Adulting Life — what you agree to, how we handle your subscription, cancellation, and liability.",
    synonyms: ["terms", "tos", "t&cs", "terms of service", "terms of use", "legals", "legal", "user agreement"],
    route: "/legal/terms",
  },
  {
    key: "sign-out",
    pageName: "Sign out",
    menuPath: "Top-right avatar menu → Sign out (the last item).",
    description: "Signs you out of TAL on this device. Your data stays in your account; sign in again any time.",
    synonyms: ["log out", "logout", "exit", "leave"],
  },
  {
    key: "take-the-tour",
    pageName: "Take the tour",
    menuPath: "Top-right avatar menu → Take the tour.",
    description: "A guided click-through of the main parts of the app — handy if you haven't used TAL for a while.",
    synonyms: ["product tour", "walkthrough", "retake the tour"],
  },

  // Admin / super-user pages (visible to admin users in the profile menu)
  {
    key: "admin.family-groups",
    pageName: "Family groups (admin)",
    menuPath: "Top-right avatar menu → Super → Family groups.",
    description: "Admin view of all family groups in the system. Manage members, roles, and sharing between accounts.",
    synonyms: ["family admin", "households", "family management"],
    route: "/admin/family-groups",
  },
  {
    key: "admin.users",
    pageName: "All users (admin)",
    menuPath: "Top-right avatar menu → Super → All users (flat).",
    description: "Admin flat list of every user account — search, inspect, impersonate.",
    route: "/admin/users",
  },
  {
    key: "admin.audit",
    pageName: "Audit log (admin)",
    menuPath: "Top-right avatar menu → Super → Audit.",
    description: "A chronological log of significant actions taken in the system — logins, data changes, exports.",
    route: "/admin/audit",
  },
  {
    key: "admin.analytics",
    pageName: "Analytics (admin)",
    menuPath: "Top-right avatar menu → Super → Analytics.",
    description: "Usage and engagement metrics for the TAL app.",
    route: "/admin/analytics",
  },
  {
    key: "admin.error-logs",
    pageName: "Error logs (admin)",
    menuPath: "Top-right avatar menu → Super → Error logs.",
    description: "Server error log for debugging recent failures.",
    route: "/admin/error-logs",
  },
  {
    key: "admin.ai",
    pageName: "AI (admin)",
    menuPath: "Top-right avatar menu → Super → AI.",
    description: "AI usage stats, rate limits, spend ledger, and model config.",
    route: "/admin/ai",
  },
  {
    key: "admin.privacy-requests",
    pageName: "Privacy requests (admin)",
    menuPath: "Top-right avatar menu → Super → Privacy requests.",
    description: "Queue of user data access / deletion requests to action.",
    route: "/admin/privacy-requests",
  },
  {
    key: "admin.data-breach-procedure",
    pageName: "Data breach procedure (admin)",
    menuPath: "Top-right avatar menu → Super → Data breach procedure.",
    description: "The documented steps to follow if a data breach is suspected or confirmed.",
    route: "/admin/data-breach-procedure",
  },
  {
    key: "admin.scope-inventory",
    pageName: "Scope inventory (admin)",
    menuPath: "Top-right avatar menu → Super → Scope inventory.",
    description: "Inventory of what data the app collects, where it lives, and who has access — part of the privacy compliance tooling.",
    route: "/admin/scope-inventory",
  },
  {
    key: "admin.videos",
    pageName: "Videos (admin)",
    menuPath: "Top-right avatar menu → Super → Videos.",
    description: "Admin tool to upload and manage the Learn section's videos.",
    route: "/admin/videos",
  },
  {
    key: "admin.folder-forms",
    pageName: "Folder forms (admin)",
    menuPath: "Top-right avatar menu → Super → Folder forms.",
    description: "Admin view / editor for every page-form in the Organiser — labels, question types, order, options.",
    route: "/admin/folder-forms",
  },
];
