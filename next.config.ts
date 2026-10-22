import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-built PDFs (complete download, emailed form PDFs) read their
  // fonts and logo from disk.
  outputFileTracingIncludes: {
    "/api/export/complete": ["./lib/export-fonts/**/*", "./public/Logo.png"],
    "/api/export/folder-pdf/email": ["./lib/export-fonts/**/*", "./public/Logo.png"],
  },
};

export default nextConfig;
