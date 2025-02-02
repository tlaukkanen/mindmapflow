import { NextApiResponse, NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";

import { storageService } from "@/lib/storage";
import { logger } from "@/services/logger";

async function getAuthenticatedUserEmail(req: NextApiRequest) {
  const token = await getToken({ req });

  if (!token?.email) {
    logger.error("Unauthorized: No user email found from token");
    throw new Error("Unauthorized: No user email found");
  }

  return token.email;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "POST":
      try {
        const userEmail = await getAuthenticatedUserEmail(req);
        const { mindMapId, nodes, edges } = req.body;

        if (!mindMapId) {
          logger.error("Diagram ID is required");
          res.status(400).json({ message: "Diagram ID is required" });

          return;
        }
        logger.info(
          `Saving diagram for user: ${userEmail} with ID: ${mindMapId}`,
        );
        await storageService.saveMindMap(userEmail, mindMapId, nodes, edges);

        res.json({ success: true });

        return;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
          logger.error("Unauthorized request to save mindmap");
          res.status(401).json({ message: "Unauthorized" });

          return;
        }
        logger.error("Error saving diagram:", error);

        res.status(500).json({ message: "Internal Server Error" });
      }
    case "GET":
      try {
        const userEmail = await getAuthenticatedUserEmail(req);
        const mindMapId = req.query.id as string;

        if (!mindMapId) {
          logger.error("Diagram ID is required for GET");
          res.status(400).json({ message: "Diagram ID is required" });

          return;
        }

        const diagram = await storageService.loadMindMap(userEmail, mindMapId);

        if (!diagram) {
          logger.error(`Diagram not found for ID: ${mindMapId}`);
          res.status(404).json({ message: "Diagram not found" });

          return;
        }

        res.json(diagram);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
          logger.error("Unauthorized request to load mindmap");
          res.status(401).json({ message: "Unauthorized" });

          return;
        }
        logger.error("Error loading diagram:", error);

        res.status(500).json({ message: "Internal Server Error" });

        return;
      }
    default:
      res.setHeader("Allow", ["GET", "POST"]);
  }
}
