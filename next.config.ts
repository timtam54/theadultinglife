import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The complete organiser download reads its fonts and logo from disk.
  outputFileTracingIncludes: {
    "/api/export/complete": ["./lib/export-fonts/**/*", "./public/Logo.png"],
  },
};

export default nextConfig;
