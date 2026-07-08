import type { MetadataRoute } from "next";

// PWA manifest — lets users install AidPulse to their home screen, which is
// required for Web Push on iOS (16.4+) and gives Android a native-feeling app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AidPulse SG",
    short_name: "AidPulse",
    description:
      "One app. Faster response. Real-time health alerts, case tracking, and emergency coordination for Singapore.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0b0e",
    theme_color: "#0a0b0e",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
