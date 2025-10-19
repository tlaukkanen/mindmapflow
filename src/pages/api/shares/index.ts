import type { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import { storageService } from "@/lib/storage";
import { logger } from "@/services/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    try {
      const token = await getToken({ req });

      if (!token?.email) {
        res.status(401).json({ message: "Unauthorized" });

        return;
      }

      const mindMapIdParam = req.query.mindMapId;
      const mindMapId =
        typeof mindMapIdParam === "string" && mindMapIdParam.length > 0
          ? mindMapIdParam
          : undefined;

      const shares = await storageService.listShareMappingsForUser(token.email);
      const filteredShares = mindMapId
        ? shares.filter((share) => share.mindMapId === mindMapId)
        : shares;

      filteredShares.sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;

        return bTime - aTime;
      });

      res.status(200).json({
        shares: filteredShares.map((share) => ({
          shareId: share.id,
          mindMapId: share.mindMapId,
          createdAt: share.createdAt,
        })),
      });
    } catch (error) {
      logger.error("Error listing shares", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  if (req.method === "POST") {
    try {
      const token = await getToken({ req });

      if (!token?.email) {
        logger.error("Unauthorized share creation attempt");
        res.status(401).json({ message: "Unauthorized" });

        return;
      }

      const { mindMapId } = req.body ?? {};

      if (!mindMapId || typeof mindMapId !== "string") {
        res.status(400).json({ message: "mindMapId is required" });

        return;
      }

      const mapping = await storageService.createShareMapping(
        token.email,
        mindMapId,
      );

      res.status(200).json({ shareId: mapping.id });
    } catch (error) {
      if (error instanceof Error && error.message === "Mindmap not found") {
        res.status(404).json({ message: "Mindmap not found" });

        return;
      }

      logger.error("Error creating share", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
