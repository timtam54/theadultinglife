import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Adulting Life",
    short_name: "Adulting Life",
    description:
      "Organise your life admin, documents and learning — installable PWA.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff5e6",
    theme_color: "#4c373c",
    orientation: "portrait",
    icons: [
      {
        src: "/Logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
