import type { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import { storageService } from "@/lib/storage";
import { logger } from "@/services/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const shareId = req.query.id;

  if (!shareId || typeof shareId !== "string") {
    res.status(400).json({ message: "Share ID is required" });

    return;
  }

  if (req.method === "GET") {
    try {
      const mapping = await storageService.getShareMapping(shareId);

      if (!mapping) {
        res.status(404).json({ message: "Share not found" });

        return;
      }

      const payload = await storageService.loadMindMapByBlobName(
        mapping.blobName,
      );

      if (!payload) {
        res.status(404).json({ message: "Shared mindmap not found" });

        return;
      }

      res.status(200).json({
        ...payload,
        share: {
          id: mapping.id,
          ownerEmail: mapping.ownerEmail,
          createdAt: mapping.createdAt,
        },
      });

      return;
    } catch (error) {
      logger.error(`Error resolving share ${shareId}`, error);
      res.status(500).json({ message: "Internal Server Error" });

      return;
    }
  }

  if (req.method === "DELETE") {
    try {
      const token = await getToken({ req });

      if (!token?.email) {
        res.status(401).json({ message: "Unauthorized" });

        return;
      }

      const mapping = await storageService.getShareMapping(shareId);

      if (!mapping) {
        res.status(404).json({ message: "Share not found" });

        return;
      }

      const requesterPath = storageService.getUserPath(token.email);

      if (mapping.ownerPath !== requesterPath) {
        res.status(403).json({ message: "Forbidden" });

        return;
      }

      await storageService.deleteShareMapping(shareId);

      res.status(200).json({ success: true });

      return;
    } catch (error) {
      logger.error(`Error deleting share ${shareId}`, error);
      res.status(500).json({ message: "Internal Server Error" });

      return;
    }
  }

  res.setHeader("Allow", ["GET", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
