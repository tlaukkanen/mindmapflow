import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AivoFlow",
    short_name: "AivoFlow",
    description:
      "Organize Your Ideas, Simplify Your Workflow, Enhance Productivity.",
    start_url: "/editor",
    display: "fullscreen",
    background_color: "#003459",
    theme_color: "#e0e3dd",
    icons: [
      {
        src: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.svg",
        sizes: "48x48 72x72 96x96 128x128 256x256 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
