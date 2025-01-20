"use client";

import { ReactFlowProvider } from "@xyflow/react";

import Editor from "@/components/editor/editor";
import { AppInsightService } from "@/services/app-insight-service";
import { EditorProvider } from "@/store/editor-context";

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorProvider>
        <AppInsightService />
        <div className="h-[100dvh]">
          <Editor />
        </div>
      </EditorProvider>
    </ReactFlowProvider>
  );
}
