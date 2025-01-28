"use client";

import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";

import { reactPlugin } from "@/services/app-insight-service";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppInsightsContext.Provider value={reactPlugin}>
      <section className="flex flex-col h-screen w-full">{children}</section>
    </AppInsightsContext.Provider>
  );
}
