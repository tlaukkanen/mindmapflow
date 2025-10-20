import type { NextApiRequest, NextApiResponse } from "next";

import { storageService } from "@/lib/storage";
import { logger } from "@/services/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);

    return;
  }

  const shareId = req.query.id;

  if (!shareId || typeof shareId !== "string") {
    res.status(400).json({ message: "Share ID is required" });

    return;
  }

  try {
    const mapping = await storageService.getShareMapping(shareId);

    if (!mapping || !mapping.thumbnailBlobName) {
      res.status(404).end();

      return;
    }

    const thumbnail = await storageService.downloadShareThumbnail(mapping);

    if (!thumbnail) {
      res.status(404).end();

      return;
    }

    res.setHeader("Content-Type", thumbnail.contentType);
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    res.status(200).send(thumbnail.buffer);
  } catch (error) {
    logger.error(`Failed to serve thumbnail for share ${shareId}`, error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
