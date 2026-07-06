import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Adulting Life",
    short_name: "Adulting Life",
    description:
      "Organise your life admin, documents and learning — installable PWA.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffe7ce",
    theme_color: "#4c373c",
    orientation: "portrait",
    icons: [
      { src: "/icons-pwa/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons-pwa/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons-pwa/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
