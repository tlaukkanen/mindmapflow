import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindMapFlow",
    short_name: "MindMapFlow",
    description:
      "Organize Your Ideas, Simplify Your Workflow, Enhance Productivity.",
    start_url: "/editor",
    display: "fullscreen",
    background_color: "#003459",
    theme_color: "#e0e3dd",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
