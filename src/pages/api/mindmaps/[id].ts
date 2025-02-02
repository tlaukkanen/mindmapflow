import { NextApiRequest, NextApiResponse } from "next";
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
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);

    return;
  }

  try {
    const userEmail = await getAuthenticatedUserEmail(req);
    const mindMapId = req.query.id as string;

    if (!mindMapId) {
      res.status(400).json({ message: "Mind map ID is required" });

      return;
    }

    await storageService.deleteMindMap(userEmail, mindMapId);
    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      res.status(401).json({ message: "Unauthorized" });

      return;
    }
    logger.error("Error deleting mind map:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
