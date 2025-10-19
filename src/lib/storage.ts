import { randomUUID } from "crypto";

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

export interface ShareMapping {
  id: string;
  ownerEmail: string;
  ownerPath: string;
  mindMapId: string;
  blobName: string;
  createdAt: string;
}

interface MindMapShareEntry {
  id: string;
  createdAt: string;
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

  private getPublicShareBlobName(shareId: string): string {
    return `public-shares/${encodeURIComponent(shareId)}.json`;
  }

  public getUserPath(userEmail: string): string {
    return this.sanitizeEmailForPath(userEmail);
  }

  private getShareIndexBlobName(ownerPath: string, mindMapId: string): string {
    return `${ownerPath}/${encodeURIComponent(mindMapId)}.shares.json`;
  }

  private async loadShareIndexEntries(
    ownerPath: string,
    mindMapId: string,
  ): Promise<MindMapShareEntry[]> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(
      this.getShareIndexBlobName(ownerPath, mindMapId),
    );

    try {
      const download = await blobClient.download();
      const content = await streamToText(
        download.readableStreamBody as NodeJS.ReadableStream,
      );
      const parsed = JSON.parse(content);
      const shares = Array.isArray(parsed?.shares) ? parsed.shares : [];

      return shares.filter(
        (entry: any) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.createdAt === "string",
      );
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return [];
      }

      logger.warn(
        `Failed to load share index for ${ownerPath}/${mindMapId}`,
        error,
      );

      return [];
    }
  }

  private async saveShareIndexEntries(
    ownerPath: string,
    mindMapId: string,
    entries: MindMapShareEntry[],
  ): Promise<void> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(
      this.getShareIndexBlobName(ownerPath, mindMapId),
    );

    if (entries.length === 0) {
      await blobClient.deleteIfExists();

      return;
    }

    const payload = JSON.stringify({ mindMapId, shares: entries });

    await blobClient.upload(payload, Buffer.byteLength(payload));
  }

  private async addShareToIndex(
    ownerPath: string,
    mindMapId: string,
    entry: MindMapShareEntry,
  ): Promise<void> {
    const entries = await this.loadShareIndexEntries(ownerPath, mindMapId);
    const exists = entries.some((share) => share.id === entry.id);

    if (!exists) {
      entries.push(entry);
      await this.saveShareIndexEntries(ownerPath, mindMapId, entries);
    }
  }

  private async removeShareFromIndex(
    ownerPath: string,
    mindMapId: string,
    shareId: string,
  ): Promise<void> {
    const entries = await this.loadShareIndexEntries(ownerPath, mindMapId);
    const filtered = entries.filter((entry) => entry.id !== shareId);

    if (filtered.length !== entries.length) {
      await this.saveShareIndexEntries(ownerPath, mindMapId, filtered);
    }
  }

  async saveMindMap(
    userEmail: string,
    mindMapId: string,
    nodes: MindMapNode[],
    edges: Edge[],
    lastModified: Date,
    paletteId?: string,
    showGrid?: boolean,
  ) {
    const containerClient = await this.getContainerClient();
    const userPath = this.sanitizeEmailForPath(userEmail);
    const blobName = `${userPath}/${mindMapId}.json`;

    logger.info(`Saving diagram to blob: ${blobName}`);
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const content = JSON.stringify({
      nodes,
      edges,
      lastModified,
      paletteId,
      showGrid,
    });

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
    const blobName = `${userPath}/${encodeURIComponent(diagramId)}.json`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      // Load edges and nodes from blob
      const downloadBlockBlobResponse = await blobClient.download();
      const content = await streamToText(
        downloadBlockBlobResponse.readableStreamBody as NodeJS.ReadableStream,
      );
      const { nodes, edges, lastModified, paletteId, showGrid } = JSON.parse(
        content.toString(),
      );

      return {
        nodes,
        edges,
        lastModified: lastModified || downloadBlockBlobResponse.lastModified,
        paletteId,
        showGrid,
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
      const blobName = `${userPath}/${encodeURIComponent(mindMapId)}.json`;
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

  async createShareMapping(
    userEmail: string,
    mindMapId: string,
  ): Promise<ShareMapping> {
    const containerClient = await this.getContainerClient();
    const ownerPath = this.sanitizeEmailForPath(userEmail);
    const encodedMindMapId = encodeURIComponent(mindMapId);
    const blobName = `${ownerPath}/${encodedMindMapId}.json`;
    const mindMapBlobClient = containerClient.getBlockBlobClient(blobName);

    logger.info(
      `Creating share mapping for mindmap ${blobName} (user: ${userEmail})`,
    );

    const exists = await mindMapBlobClient.exists();

    if (!exists) {
      logger.warn(
        `Cannot create share mapping; mindmap not found: ${blobName}`,
      );
      throw new Error("Mindmap not found");
    }

    const shareId = randomUUID();
    const mapping: ShareMapping = {
      id: shareId,
      ownerEmail: userEmail,
      ownerPath,
      mindMapId,
      blobName,
      createdAt: new Date().toISOString(),
    };

    const shareBlobClient = containerClient.getBlockBlobClient(
      this.getPublicShareBlobName(shareId),
    );

    const content = JSON.stringify(mapping);
    const uploadResponse = await shareBlobClient.upload(
      content,
      Buffer.byteLength(content),
    );

    if (uploadResponse.errorCode) {
      logger.error(
        `Failed to create share mapping for ${blobName}: ${uploadResponse.errorCode}`,
      );
      throw new Error("Failed to create share mapping");
    }

    // Store metadata to make filtering by owner easier later
    await shareBlobClient.setMetadata({
      ownerpath: ownerPath,
      mindmapid: mindMapId,
    });

    try {
      await this.addShareToIndex(ownerPath, mindMapId, {
        id: shareId,
        createdAt: mapping.createdAt,
      });
    } catch (error) {
      logger.error(
        `Failed to update share index for ${ownerPath}/${mindMapId}`,
        error,
      );
      await shareBlobClient.deleteIfExists();
      throw error;
    }

    return mapping;
  }

  async getShareMapping(shareId: string): Promise<ShareMapping | null> {
    try {
      const containerClient = await this.getContainerClient();
      const blobClient = containerClient.getBlockBlobClient(
        this.getPublicShareBlobName(shareId),
      );
      const download = await blobClient.download();
      const content = await streamToText(
        download.readableStreamBody as NodeJS.ReadableStream,
      );

      const mapping = JSON.parse(content) as ShareMapping;
      const entries = await this.loadShareIndexEntries(
        mapping.ownerPath,
        mapping.mindMapId,
      );
      const isIndexed = entries.some((entry) => entry.id === mapping.id);

      if (!isIndexed) {
        logger.warn(
          `Share ${shareId} missing from index, treating as not found`,
        );

        try {
          await this.deleteShareMapping(mapping);
        } catch (cleanupError) {
          logger.error(
            `Failed to cleanup orphaned share mapping ${shareId}`,
            cleanupError,
          );
        }

        return null;
      }

      return mapping;
    } catch (error) {
      logger.warn(`Share mapping not found for id ${shareId}`, error);

      return null;
    }
  }

  async deleteShareMapping(mapping: ShareMapping): Promise<boolean> {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(
      this.getPublicShareBlobName(mapping.id),
    );

    try {
      const response = await blobClient.deleteIfExists();

      if (!response.succeeded) {
        logger.warn(`Share mapping not found when deleting id ${mapping.id}`);
      }

      await this.removeShareFromIndex(
        mapping.ownerPath,
        mapping.mindMapId,
        mapping.id,
      );

      return response.succeeded;
    } catch (error) {
      logger.error(`Failed to delete share mapping ${mapping.id}`, error);
      throw error;
    }
  }

  async loadMindMapByBlobName(blobName: string) {
    const containerClient = await this.getContainerClient();
    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const download = await blobClient.download();
      const content = await streamToText(
        download.readableStreamBody as NodeJS.ReadableStream,
      );
      const { nodes, edges, lastModified, paletteId, showGrid } = JSON.parse(
        content.toString(),
      );

      return {
        nodes,
        edges,
        lastModified: lastModified || download.lastModified,
        paletteId,
        showGrid,
      };
    } catch (error) {
      logger.error(`Error loading mindmap by blob name: ${blobName}`, error);

      return null;
    }
  }

  async listShareMappingsForUser(userEmail: string): Promise<ShareMapping[]> {
    const containerClient = await this.getContainerClient();
    const ownerPath = this.sanitizeEmailForPath(userEmail);
    const prefix = `${ownerPath}/`;
    const suffix = ".shares.json";
    const shares: ShareMapping[] = [];

    for await (const blob of containerClient.listBlobsFlat({
      prefix,
    })) {
      if (!blob.name.endsWith(suffix)) {
        continue;
      }

      const encodedMindMapId = blob.name.slice(
        prefix.length,
        blob.name.length - suffix.length,
      );
      const mindMapId = decodeURIComponent(encodedMindMapId);
      const entries = await this.loadShareIndexEntries(ownerPath, mindMapId);

      for (const entry of entries) {
        const shareBlobClient = containerClient.getBlockBlobClient(
          this.getPublicShareBlobName(entry.id),
        );
        let exists = false;

        try {
          exists = await shareBlobClient.exists();
        } catch (error) {
          logger.error(`Failed to check share blob ${entry.id}`, error);
          continue;
        }

        if (!exists) {
          await this.removeShareFromIndex(ownerPath, mindMapId, entry.id);
          continue;
        }

        shares.push({
          id: entry.id,
          ownerEmail: userEmail,
          ownerPath,
          mindMapId,
          blobName: `${ownerPath}/${encodedMindMapId}.json`,
          createdAt: entry.createdAt,
        });
      }
    }

    shares.sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;

      return bTime - aTime;
    });

    return shares;
  }
}

export const storageService = new StorageService();
