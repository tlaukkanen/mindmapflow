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

      const { mindMapId, title, thumbnailDataUrl } = req.body ?? {};

      if (!mindMapId || typeof mindMapId !== "string") {
        res.status(400).json({ message: "mindMapId is required" });

        return;
      }

      let thumbnailPayload: { buffer: Buffer; contentType: string } | null =
        null;

      if (typeof thumbnailDataUrl === "string") {
        const match = thumbnailDataUrl.match(/^data:(.+);base64,(.+)$/);

        if (match) {
          const [, contentTypeRaw, base64Data] = match;
          const contentType = contentTypeRaw?.trim() || "image/png";

          try {
            const buffer = Buffer.from(base64Data, "base64");
            const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB safety limit

            if (
              buffer.byteLength > 0 &&
              buffer.byteLength <= MAX_THUMBNAIL_BYTES
            ) {
              thumbnailPayload = { buffer, contentType };
            } else if (buffer.byteLength > MAX_THUMBNAIL_BYTES) {
              logger.warn(
                `Thumbnail payload too large (${buffer.byteLength} bytes) for mindmap ${mindMapId}`,
              );
            }
          } catch (thumbnailError) {
            logger.warn(
              "Failed to decode thumbnail data URL for share creation",
              thumbnailError,
            );
          }
        }
      }

      const mapping = await storageService.createShareMapping(
        token.email,
        mindMapId,
        {
          title: typeof title === "string" ? title : null,
          thumbnail: thumbnailPayload,
        },
      );

      res.status(200).json({
        shareId: mapping.id,
        title: mapping.title,
        hasThumbnail: Boolean(mapping.thumbnailBlobName),
      });
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
