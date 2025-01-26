"use client";

import { Link } from "@mui/material";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { AppInsightService } from "@/services/app-insight-service";
import { reactPlugin } from "@/services/app-insight-service";
export default function Home() {
  return (
    <AppInsightsContext.Provider value={reactPlugin}>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <AppInsightService />
        <div className="inline-block max-w-3xl text-center justify-center">
          <span className={title({ class: "text-white" })}>
            Organize Your Ideas, Simplify Your Workflow, Enhance Productivity
          </span>
        </div>

        <div className="relative w-fit overflow-hidden w-max-[1024px]">
          <Image
            priority
            alt="Diagram"
            className="object-contain w-full h-fit "
            height={962}
            src="/home/mindmapflow_2025-01-24.png"
            width={1382}
          />
        </div>

        <div className="flex gap-3 items-start justify-start max-w-4xl py-8 md:py-10 text-white">
          <div className="grid grid-cols-1 gap-6">
            <div className={subtitle({ class: "mt-4 text-white" })}>
              ✏️ Meet MindMapFlow, your ultimate brainstorming companion.
              Designed to unleash creativity and enhance productivity,
              MindMapFlow transforms complex ideas into clear, structured
              visuals.
            </div>
            <div className={subtitle({ class: "mt-4 text-white" })}>
              🧠 Whether you&apos;re a student, professional, or creative, our
              intuitive interface helps you map out thoughts, simplify concepts,
              and bring your projects to life. Join the MindMapFlow revolution
              and unlock the full potential of your mind!
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            className="text-white no-underline"
            href={siteConfig.links.docs}
            underline="none"
          >
            Launching Soon
          </Link>
        </div>
      </section>
    </AppInsightsContext.Provider>
  );
}
