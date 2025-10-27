import type { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import {
  storageService,
  type OpenProjectDialogSettings,
  type UserSettings,
} from "@/lib/storage";
import { logger } from "@/services/logger";

type UserSettingsResponse = {
  openProjectDialog: {
    tagFilter: string[];
    sortOption: "name" | "lastModified";
  };
};

const buildResponse = (settings: UserSettings): UserSettingsResponse => ({
  openProjectDialog: {
    tagFilter: settings.openProjectDialog?.tagFilter ?? [],
    sortOption: settings.openProjectDialog?.sortOption ?? "name",
  },
});

const normalizeTagFilter = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
};

const parseOpenProjectDialogUpdate = (
  input: unknown,
): OpenProjectDialogSettings | null => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const update: OpenProjectDialogSettings = {};

  if (Object.prototype.hasOwnProperty.call(record, "tagFilter")) {
    update.tagFilter = normalizeTagFilter(record.tagFilter);
  }

  if (Object.prototype.hasOwnProperty.call(record, "sortOption")) {
    const sortOption = record.sortOption;

    if (sortOption === "name" || sortOption === "lastModified") {
      update.sortOption = sortOption;
    } else {
      return null;
    }
  }

  return Object.keys(update).length > 0 ? update : null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const token = await getToken({ req });

  if (!token?.email) {
    logger.warn("Unauthorized request for user settings: missing email");
    res.status(401).json({ message: "Unauthorized" });

    return;
  }

  if (req.method === "GET") {
    try {
      const settings = await storageService.loadUserSettings(token.email);

      res.status(200).json(buildResponse(settings));
    } catch (error) {
      logger.error("Failed to load user settings", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  if (req.method === "PATCH") {
    try {
      const openProjectDialogUpdate = parseOpenProjectDialogUpdate(
        req.body?.openProjectDialog,
      );

      if (!openProjectDialogUpdate) {
        res.status(400).json({ message: "Invalid settings payload" });

        return;
      }

      const updated = await storageService.updateUserSettings(token.email, {
        openProjectDialog: openProjectDialogUpdate,
      });

      res.status(200).json(buildResponse(updated));
    } catch (error) {
      logger.error("Failed to update user settings", error);
      res.status(500).json({ message: "Internal Server Error" });
    }

    return;
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
