import type { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import { aiSuggestionService } from "@/services/ai-suggestion-service";
import { logger } from "@/services/logger";

interface AiSuggestRequestBody {
  nodeDescription?: unknown;
  existingChildren?: unknown;
  mindmap?: unknown;
}

interface AiSuggestMindmapNode {
  id: string;
  parentId: string | null;
  description: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);

    return;
  }

  try {
    const token = await getToken({ req });

    if (!token) {
      res.status(401).json({ message: "Unauthorized" });

      return;
    }

    const body = req.body as AiSuggestRequestBody | undefined;
    const nodeDescription =
      typeof body?.nodeDescription === "string"
        ? body.nodeDescription.trim()
        : "";

    if (!nodeDescription) {
      res.status(400).json({ message: "nodeDescription is required" });

      return;
    }

    const existingChildren = Array.isArray(body?.existingChildren)
      ? body?.existingChildren
          .map((item) => (typeof item === "string" ? item.trim() : undefined))
          .filter((item): item is string => Boolean(item && item.length))
      : undefined;

    let mindmapNodes: AiSuggestMindmapNode[] | undefined;

    if (body?.mindmap && typeof body.mindmap === "object") {
      const rawMindmap = body.mindmap as { nodes?: unknown };

      if (Array.isArray(rawMindmap.nodes)) {
        mindmapNodes = rawMindmap.nodes
          .map((item) => {
            if (!item || typeof item !== "object") {
              return undefined;
            }

            const candidate = item as {
              id?: unknown;
              parentId?: unknown;
              description?: unknown;
            };

            if (typeof candidate.id !== "string") {
              return undefined;
            }

            if (typeof candidate.description !== "string") {
              return undefined;
            }

            const trimmedDescription = candidate.description.trim();

            if (!trimmedDescription) {
              return undefined;
            }

            const parentId =
              typeof candidate.parentId === "string"
                ? candidate.parentId
                : candidate.parentId === null
                  ? null
                  : null;

            return {
              id: candidate.id,
              parentId,
              description: trimmedDescription,
            } satisfies AiSuggestMindmapNode;
          })
          .filter((node): node is AiSuggestMindmapNode => Boolean(node));
      }
    }

    const suggestions = await aiSuggestionService.generateSubnodes({
      parentDescription: nodeDescription,
      existingChildren,
      mindmap: mindmapNodes,
    });

    res.status(200).json({ suggestions });
  } catch (error) {
    logger.error("Failed to generate AI suggestions", error);
    res.status(500).json({ message: "Failed to generate AI suggestions" });
  }
}
