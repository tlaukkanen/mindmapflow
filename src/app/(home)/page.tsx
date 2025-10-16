"use client";

import { useState } from "react";
import { Link } from "@mui/material";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { title } from "@/components/primitives";
import { AppInsightService } from "@/services/app-insight-service";
import { reactPlugin } from "@/services/app-insight-service";
export default function Home() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  const openLightbox = (src: string, alt: string) => setLightbox({ src, alt });
  const closeLightbox = () => setLightbox(null);

  return (
    <AppInsightsContext.Provider value={reactPlugin}>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <AppInsightService />
        <div className="inline-block max-w-3xl text-center justify-center">
          <span className={title({ class: "text-heading" })}>
            Organize Your Ideas, Simplify Your Workflow, Enhance Productivity
          </span>
        </div>

        <div className="w-full max-w-5xl space-y-12 py-8 md:py-16">
          <div className="grid items-center gap-8 rounded-md border border-panels-border bg-surface p-8 shadow-xl md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4 text-left">
              <span className={title({ size: "sm", class: "block text-left" })}>
                Capture Every Spark In One Map
              </span>
              <p className="text-body text-lg leading-relaxed">
                ✏️ Meet MindMapFlow, your ultimate brainstorming companion. Designed to
                unleash creativity and enhance productivity, MindMapFlow transforms complex
                ideas into clear, structured visuals.
              </p>
              <p className="text-body text-lg leading-relaxed">
                🧠 Whether you&apos;re a student, professional, or creative, our intuitive
                interface helps you map out thoughts, simplify concepts, and bring your
                projects to life. Join the MindMapFlow revolution and unlock the full
                potential of your mind!
              </p>
              <div className="flex gap-3 pt-2">
                <Link
                  className="text-link no-underline"
                  href={siteConfig.links.docs}
                  underline="none"
                >
                  Launching Soon
                </Link>
              </div>
            </div>
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden rounded-md bg-surface md:order-last">
              <button
                type="button"
                aria-label="Expand MindMapFlow editor screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                onClick={() => openLightbox("/screens/mindmapflow_20251016.png", "Overview of the MindMapFlow editor")}
              >
                <Image
                  fill
                  priority
                  alt="Overview of the MindMapFlow editor"
                  className="object-contain transition group-hover:scale-[1.01]"
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/mindmapflow_20251016.png"
                />
              </button>
            </div>
          </div>

          <div className="grid items-center gap-8 rounded-md border border-panels-border bg-surface p-8 shadow-xl md:grid-cols-[1fr_1.1fr]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-surface md:order-first">
              <button
                type="button"
                aria-label="Expand AI suggestions screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                onClick={() => openLightbox("/screens/ai-suggestions-2025-10-16.png", "Preview of AI suggestions inside MindMapFlow")}
              >
                <Image
                  fill
                  alt="Preview of AI suggestions inside MindMapFlow"
                  className="object-contain transition group-hover:scale-[1.01]"
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/ai-suggestions-2025-10-16.png"
                />
              </button>
            </div>
            <div className="space-y-4 text-left md:order-last md:pl-8">
              <span className={title({ size: "sm", class: "block text-left" })}>
                AI Suggestions That Keep You Moving
              </span>
              <p className="text-body text-lg leading-relaxed">
                Let the editor surface context-aware topics and follow-up ideas while you
                sketch. Intelligent prompts react to the structure of your mind map so your
                next step is always one click away.
              </p>
              <p className="text-body text-lg leading-relaxed">
                Capture lightning-fast inspiration without losing flow—save your favourite
                prompts, apply AI suggestions instantly, and keep every brainstorm moving
                forward.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-8 rounded-md border border-panels-border bg-surface p-8 shadow-xl md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4 text-left">
              <span className={title({ size: "sm", class: "block text-left" })}>
                Themes That Match Your Mindset
              </span>
              <p className="text-body text-lg leading-relaxed">
                Tailor every board with curated palettes and typography presets designed for
                strategy, design, education, and more. Switch themes without leaving the
                canvas to explore the mood that fits your story.
              </p>
              <p className="text-body text-lg leading-relaxed">
                Preview changes instantly, collaborate with team favourites, and ship final
                visuals that look polished in every export.
              </p>
            </div>
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden rounded-md bg-surface md:order-last">
              <button
                type="button"
                aria-label="Expand themes gallery screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                onClick={() => openLightbox("/screens/themes-2025-10-16.png", "Gallery of theme options available in MindMapFlow")}
              >
                <Image
                  fill
                  alt="Gallery of theme options available in MindMapFlow"
                  className="object-contain transition group-hover:scale-[1.01]"
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/themes-2025-10-16.png"
                />
              </button>
            </div>
          </div>
        </div>

        {lightbox ? (
          <div
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            onClick={closeLightbox}
          >
            <div
              className="relative h-full max-h-[90vh] w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close enlarged screenshot"
                className="absolute right-4 top-4 z-[110] rounded-md bg-black/70 px-3 py-1 text-sm font-medium text-white transition hover:bg-black"
                onClick={closeLightbox}
              >
                Close
              </button>
              <Image
                fill
                alt={lightbox.alt}
                className="object-contain"
                sizes="100vw"
                src={lightbox.src}
              />
            </div>
          </div>
        ) : null}
      </section>
    </AppInsightsContext.Provider>
  );
}
