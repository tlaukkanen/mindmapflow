"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { OpenProjectDialog } from "@/components/editor/open-project-dialog";
import { logger } from "@/services/logger";

export default function EditorRootPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [shouldShowDialog, setShouldShowDialog] = useState(false);

  useEffect(() => {
    const checkExistingProjects = async () => {
      if (status === "loading") return;

      if (!session?.user) {
        // Not logged in - create new project
        const newMindMapId = nanoid(10);

        router.replace(`/editor/${newMindMapId}?showSample=true`);

        return;
      }

      // Check if user has any existing projects
      try {
        const response = await fetch("/api/mindmaps/list");
        const mindMaps = await response.json();

        if (mindMaps.length === 0) {
          // No existing projects - create new one
          const newMindMapId = nanoid(10);

          router.replace(`/editor/${newMindMapId}?showSample=true`);
        } else {
          // Show dialog to choose project
          setShouldShowDialog(true);
        }
      } catch (error) {
        logger.error("Error checking existing projects:", error);
        toast.error("Failed to load existing projects");
        // On error, fall back to creating new project
        const newMindMapId = nanoid(10);

        router.replace(`/editor/${newMindMapId}`);
      }
    };

    checkExistingProjects();
  }, [router, session?.user, status]);

  if (shouldShowDialog) {
    return (
      <OpenProjectDialog
        open={shouldShowDialog}
        onClose={() => setShouldShowDialog(false)}
      />
    );
  }

  return null;
}
