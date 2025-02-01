import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

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

  try {
    const token = await getToken({ req });

    if (!token?.email) {
      logger.error("Unauthorized: No user email found from token");
      res.status(401).json({ message: "Unauthorized" });

      return;
    }

    const mindMaps = await storageService.listMindMaps(token.email);

    res.json(mindMaps);
  } catch (error) {
    logger.error("Error listing mindmaps:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
