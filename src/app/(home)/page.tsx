"use client";

import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import clsx from "clsx";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import Image from "next/image";

import { title } from "@/components/primitives";
import { AppInsightService } from "@/services/app-insight-service";
import { reactPlugin } from "@/services/app-insight-service";

type ImageKey =
  | "logo"
  | "hero"
  | "editorPreview"
  | "aiPreview"
  | "themesPreview";
export default function Home() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const [loadedImages, setLoadedImages] = useState<
    Partial<Record<ImageKey, boolean>>
  >({});

  const openLightbox = (src: string, alt: string) => setLightbox({ src, alt });
  const closeLightbox = () => setLightbox(null);
  const markLoaded = (key: ImageKey) =>
    setLoadedImages((prev) => (prev?.[key] ? prev : { ...prev, [key]: true }));

  useEffect(() => {
    if (!lightbox) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  return (
    <AppInsightsContext.Provider value={reactPlugin}>
      <section className="flex flex-col items-center justify-center gap-4 ">
        <AppInsightService />
        <div className="relative w-full max-w-[480px] pt-24 pb-20">
          {!loadedImages.logo ? (
            <Skeleton
              aria-hidden
              baseColor="#e5e7eb"
              className="block h-full w-full"
              containerClassName="absolute inset-0 pointer-events-none"
              highlightColor="#f3f4f6"
            />
          ) : null}
          <Image
            alt="MindMapFlow logo"
            className={clsx(
              "block h-auto w-full object-contain transition-opacity duration-300",
              loadedImages.logo ? "opacity-100" : "opacity-0",
            )}
            height={260}
            sizes="(max-width: 640px) 80vw, 480px"
            src="/mindmapflow_logo_with_text.png"
            width={480}
            onLoad={() => markLoaded("logo")}
          />
        </div>

        <div className="inline-block max-w-3xl text-center justify-center">
          <span className={title({ class: "text-heading" })}>
            Organize Your Ideas,
            <br />
            Simplify Your Workflow,
            <br />
            Enhance Productivity
          </span>
        </div>

        <div className="w-full max-w-5xl py-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            {!loadedImages.hero ? (
              <Skeleton
                aria-hidden
                baseColor="#e5e7eb"
                borderRadius="0.375rem"
                className="block h-full w-full"
                containerClassName="absolute inset-0 pointer-events-none"
                highlightColor="#f3f4f6"
              />
            ) : null}
            <Image
              fill
              priority
              alt="EU Cyber Resilience Act (CRA) mind map overview"
              className={clsx(
                "object-contain transition duration-300 group-hover:scale-[1.01]",
                loadedImages.hero ? "opacity-100" : "opacity-0",
              )}
              sizes="(min-width: 1280px) 1024px, (min-width: 768px) 90vw, 100vw"
              src="/screens/eu_cyber_resilience_act_cra_large.png"
              onLoad={() => markLoaded("hero")}
            />
          </div>
        </div>

        <div className="w-full max-w-5xl space-y-12 py-8 md:py-16">
          <div className="grid items-center gap-8  p-8 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4 text-left">
              <span className={title({ size: "sm", class: "block text-left" })}>
                Capture Every Spark of Creativity
              </span>
              <p className="text-body text-lg leading-relaxed">
                ✏️ Meet MindMapFlow, your ultimate brainstorming companion.
                Designed to unleash creativity and enhance productivity,
                MindMapFlow transforms complex ideas into clear, structured
                visuals.
              </p>
              <p className="text-body text-lg leading-relaxed">
                🧠 Whether you&apos;re a student, professional, or creative, our
                intuitive interface helps you map out thoughts, simplify
                concepts, and bring your projects to life. Join the MindMapFlow
                revolution and unlock the full potential of your mind!
              </p>
              <div className="rounded-md border border-panels-border bg-stone-200 p-4">
                ℹ️ Currently in invite-only closed beta.
              </div>
            </div>
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden rounded-md md:order-last">
              <button
                aria-label="Expand MindMapFlow editor screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                type="button"
                onClick={() =>
                  openLightbox(
                    "/screens/mindmapflow_20251016.png",
                    "Overview of the MindMapFlow editor",
                  )
                }
              >
                {!loadedImages.editorPreview ? (
                  <Skeleton
                    aria-hidden
                    baseColor="#e5e7eb"
                    borderRadius="0.375rem"
                    className="block h-full w-full"
                    containerClassName="absolute inset-0 pointer-events-none"
                    highlightColor="#f3f4f6"
                  />
                ) : null}
                <Image
                  fill
                  priority
                  alt="Overview of the MindMapFlow editor"
                  className={clsx(
                    "object-contain transition duration-300 group-hover:scale-[1.01]",
                    loadedImages.editorPreview ? "opacity-100" : "opacity-0",
                  )}
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/mindmapflow_20251016.png"
                  onLoad={() => markLoaded("editorPreview")}
                />
              </button>
            </div>
          </div>

          <div className="grid items-center gap-8 rounded-md border border-panels-border bg-stone-200 p-8 shadow-xl md:grid-cols-[1fr_1.1fr]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md  md:order-first">
              <button
                aria-label="Expand AI suggestions screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                type="button"
                onClick={() =>
                  openLightbox(
                    "/screens/ai-suggestions-2025-10-16.png",
                    "Preview of AI suggestions inside MindMapFlow",
                  )
                }
              >
                {!loadedImages.aiPreview ? (
                  <Skeleton
                    aria-hidden
                    baseColor="#e5e7eb"
                    borderRadius="0.375rem"
                    className="block h-full w-full"
                    containerClassName="absolute inset-0 pointer-events-none"
                    highlightColor="#f3f4f6"
                  />
                ) : null}
                <Image
                  fill
                  alt="Preview of AI suggestions inside MindMapFlow"
                  className={clsx(
                    "object-contain transition duration-300 group-hover:scale-[1.01]",
                    loadedImages.aiPreview ? "opacity-100" : "opacity-0",
                  )}
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/ai-suggestions-2025-10-16.png"
                  onLoad={() => markLoaded("aiPreview")}
                />
              </button>
            </div>
            <div className="space-y-4 text-left md:order-last md:pl-8">
              <span className={title({ size: "sm", class: "block text-left" })}>
                AI Suggestions That Keep You Moving
              </span>
              <p className="text-body text-lg leading-relaxed">
                Let the editor surface context-aware follow-up ideas while you
                sketch. Suggestions adapt to the structure of your mind map so
                expanding a branch is always one click away.
              </p>
              <p className="text-body text-lg leading-relaxed">
                Receive ready-to-use title tweaks, supporting points, and node
                variations directly in the canvas—stay focused on flow while AI
                brings fresh angles to each concept.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-8 p-8 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4 text-left">
              <span className={title({ size: "sm", class: "block text-left" })}>
                Themes That Match Your Mindset
              </span>
              <p className="text-body text-lg leading-relaxed">
                Tailor every board with curated palettes and typography presets
                designed for strategy, design, education, and more. Switch
                themes without leaving the canvas to explore the mood that fits
                your story.
              </p>
              <p className="text-body text-lg leading-relaxed">
                Preview changes instantly, collaborate with team favourites, and
                ship final visuals that look polished in every export.
              </p>
            </div>
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden rounded-md md:order-last">
              <button
                aria-label="Expand themes gallery screenshot"
                className="group relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                type="button"
                onClick={() =>
                  openLightbox(
                    "/screens/themes-2025-10-16.png",
                    "Gallery of theme options available in MindMapFlow",
                  )
                }
              >
                {!loadedImages.themesPreview ? (
                  <Skeleton
                    aria-hidden
                    baseColor="#e5e7eb"
                    borderRadius="0.375rem"
                    className="block h-full w-full"
                    containerClassName="absolute inset-0 pointer-events-none"
                    highlightColor="#f3f4f6"
                  />
                ) : null}
                <Image
                  fill
                  alt="Gallery of theme options available in MindMapFlow"
                  className={clsx(
                    "object-contain transition duration-300 group-hover:scale-[1.01]",
                    loadedImages.themesPreview ? "opacity-100" : "opacity-0",
                  )}
                  sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 768px) 50vw, 100vw"
                  src="/screens/themes-2025-10-16.png"
                  onLoad={() => markLoaded("themesPreview")}
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
            tabIndex={-1}
          >
            <button
              aria-label="Close enlarged screenshot"
              className="absolute inset-0 h-full w-full cursor-zoom-out border-0 bg-transparent p-0"
              type="button"
              onClick={closeLightbox}
            />
            <div className="relative z-[110] h-full max-h-[90vh] w-full max-w-5xl">
              <button
                aria-label="Close enlarged screenshot"
                className="absolute right-4 top-4 z-[120] rounded-md bg-black/70 px-3 py-1 text-sm font-medium text-white transition hover:bg-black"
                type="button"
                onClick={closeLightbox}
              >
                Close
              </button>
              <button
                aria-label="Close enlarged screenshot"
                className="group block h-full w-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                type="button"
                onClick={closeLightbox}
              >
                <span className="relative block h-full w-full">
                  <Image
                    fill
                    alt={lightbox.alt}
                    className="object-contain transition group-hover:scale-[1.002]"
                    sizes="100vw"
                    src={lightbox.src}
                  />
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </AppInsightsContext.Provider>
  );
}
