import type { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import { storageService } from "@/lib/storage";
import { logger } from "@/services/logger";

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
}
