"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { nanoid } from "nanoid";

import Editor from "@/components/editor/editor";
import { AppInsightService } from "@/services/app-insight-service";
import { EditorProvider } from "@/store/editor-context";

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // If no ID parameter, generate one and redirect
    if (!params?.id) {
      const newDiagramId = nanoid(10);

      router.replace(`/editor/${newDiagramId}`);
    }
  }, [params?.id, router]);

  // Don't render editor until we have an ID
  if (!params?.id) {
    return null;
  }

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
