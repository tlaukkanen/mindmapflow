import { BlobServiceClient } from "@azure/storage-blob";
import { Edge } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

const containerName = "user-mindmaps";

export class StorageService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error("Azure Storage connection string not found");
    }
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }

  private sanitizeEmailForPath(email: string): string {
    // Replace special characters and convert to lowercase
    return email.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  async saveMindMap(
    userEmail: string,
    diagramId: string,
    nodes: MindMapNode[],
    edges: Edge[],
  ) {
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    const userPath = this.sanitizeEmailForPath(userEmail);
    const blobName = `${userPath}/${diagramId}.json`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const content = JSON.stringify({ nodes, edges });

    await blobClient.upload(content, content.length);
  }

  async loadMindMap(userEmail: string, diagramId: string) {
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    const userPath = this.sanitizeEmailForPath(userEmail);
    const blobName = `${userPath}/${diagramId}.json`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      // ...existing download code...
    } catch (error) {
      logger.error("Error loading diagram:", error);

      return null;
    }
  }
}

export const storageService = new StorageService();
