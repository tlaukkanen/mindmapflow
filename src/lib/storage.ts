import { BlobServiceClient } from "@azure/storage-blob";
import { Edge } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

// Convert stream to text
async function streamToText(readable: NodeJS.ReadableStream): Promise<string> {
  readable.setEncoding("utf8");
  let data = "";

  for await (const chunk of readable) {
    data += chunk;
  }

  return data;
}

const containerName = "user-mindmaps";

export interface MindMapMetadata {
  id: string;
  name: string;
  lastModified: Date;
}

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

  private async getContainerClient() {
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    return containerClient;
  }

  private sanitizeEmailForPath(email: string): string {
    // Replace special characters and convert to lowercase
    return email.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  async saveMindMap(
    userEmail: string,
    mindMapId: string,
    nodes: MindMapNode[],
    edges: Edge[],
    lastModified: Date,
  ) {
    const containerClient = await this.getContainerClient();
    const userPath = this.sanitizeEmailForPath(userEmail);
    const blobName = `${userPath}/${mindMapId}.json`;

    logger.info(`Saving diagram to blob: ${blobName}`);
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const content = JSON.stringify({ nodes, edges, lastModified });

    const blobUploadResponse = await blobClient.upload(content, content.length);

    logger.debug("Upload response", blobUploadResponse);
    if (blobUploadResponse.errorCode) {
      logger.error(
        `Failed to upload diagram to cloud storage ${blobUploadResponse.errorCode}`,
      );
      throw new Error(
        `Failed to upload diagram to cloud storage ${blobUploadResponse.errorCode}`,
      );
    }

    // Update metadata
    const rootNode = nodes.find((node) => node.id === "root");
    const mindmapName = rootNode?.data.description || "Untitled";
    // URL encode the mindmap name
    const encodedMindmapName = encodeURIComponent(mindmapName);

    logger.debug(`Setting metadata name to ${encodedMindmapName}`);
    await blobClient.setMetadata({
      name: encodedMindmapName,
      lastModified: lastModified.toISOString(),
    });
  }

  async loadMindMap(userEmail: string, diagramId: string) {
    const containerClient = await this.getContainerClient();
    const userPath = this.sanitizeEmailForPath(userEmail);
    const blobName = `${userPath}/${diagramId}.json`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      // Load edges and nodes from blob
      const downloadBlockBlobResponse = await blobClient.download();
      const content = await streamToText(
        downloadBlockBlobResponse.readableStreamBody as NodeJS.ReadableStream,
      );
      const { nodes, edges, lastModified } = JSON.parse(content.toString());

      return {
        nodes,
        edges,
        lastModified: lastModified || downloadBlockBlobResponse.lastModified,
      };
    } catch (error) {
      logger.error("Error loading diagram:", error);

      return null;
    }
  }

  async listMindMaps(userEmail: string): Promise<MindMapMetadata[]> {
    try {
      const containerClient = await this.getContainerClient();
      const sanitizeEmailForPath = this.sanitizeEmailForPath(userEmail);
      const prefix = `${sanitizeEmailForPath}/`;
      const blobs = containerClient.listBlobsFlat({ prefix });
      const mindMaps: MindMapMetadata[] = [];

      logger.info(
        `Listing mindmaps for user: ${userEmail} using container prefix ${prefix}`,
      );

      for await (const blob of blobs) {
        const blobClient = containerClient.getBlobClient(blob.name);
        const properties = await blobClient.getProperties();
        const mindMapId = blob.name
          .replace(`${prefix}`, "")
          .replace(".json", "");

        // URL decode the mindmap name from metadata
        const encodedName = properties.metadata?.name || "Untitled";
        const decodedName = decodeURIComponent(encodedName);

        mindMaps.push({
          id: mindMapId,
          name: decodedName,
          lastModified: blob.properties.lastModified || new Date(),
        });
      }

      logger.info(`Found ${mindMaps.length} mindmaps for user: ${userEmail}`);

      return mindMaps;
    } catch (error) {
      logger.error("Error listing mindmaps:", error);
      throw error;
    }
  }

  async saveMindMapMetadata(
    userEmail: string,
    mindMapId: string,
    metadata: { name: string },
  ) {
    try {
      const containerClient = await this.getContainerClient();
      const blobClient = containerClient.getBlobClient(
        `${userEmail}/${mindMapId}`,
      );

      await blobClient.setMetadata(metadata);
    } catch (error) {
      logger.error("Error saving mindmap metadata:", error);
      throw error;
    }
  }

  async deleteMindMap(userEmail: string, mindMapId: string) {
    try {
      const containerClient = await this.getContainerClient();
      const userPath = this.sanitizeEmailForPath(userEmail);
      const blobName = `${userPath}/${mindMapId}.json`;
      const blobClient = containerClient.getBlockBlobClient(blobName);

      logger.info(`Deleting mindmap: ${blobName}`);
      const response = await blobClient.delete();

      if (response.errorCode) {
        logger.error(`Failed to delete mindmap: ${response.errorCode}`);
        throw new Error(`Failed to delete mindmap: ${response.errorCode}`);
      }

      return true;
    } catch (error) {
      logger.error("Error deleting mindmap:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
