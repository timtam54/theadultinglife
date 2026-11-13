import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-built PDFs (complete download, emailed form PDFs) read their
  // fonts and logo from disk.
  outputFileTracingIncludes: {
    "/api/export/complete": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/export/folder-pdf/email": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/export/folder-pdf": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/planner/share-email": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/planner/pdf": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/export/doc": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    "/api/export/doc/email": ["./lib/export-fonts/**/*", "./public/Logo.png", "./public/PlannerLotus.png"],
    // Shop invoices (made when an order is paid, and on download).
    "/api/shop/invoice/[id]": ["./lib/export-fonts/**/*", "./public/Logo.png"],
    "/api/shop/checkout": ["./lib/export-fonts/**/*", "./public/Logo.png"],
    "/api/stripe/webhook": ["./lib/export-fonts/**/*", "./public/Logo.png"],
    "/shop/order/[id]": ["./lib/export-fonts/**/*", "./public/Logo.png"],
  },
};

export default nextConfig;
