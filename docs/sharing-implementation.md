# Mindmap Sharing Implementation Guide

This document describes how document sharing is implemented in MindMapFlow using Azure Blob Storage. The pattern can be adapted for any project that needs to share user-owned content via public links using blob storage as a file system.

## Overview

The sharing system allows authenticated users to create publicly accessible links to their mindmaps. Each share link is:

- **Unique**: Uses a UUID as the share identifier
- **Revocable**: Owners can delete share links at any time
- **Decoupled**: Share mappings are separate from the original document
- **Secure**: Only the document owner can create or revoke shares

## Architecture

### Blob Storage Structure

```
user-mindmaps/                          # Container
├── {user-path}/                        # User's folder (sanitized email)
│   ├── {mindmap-id}.json              # The actual mindmap document
│   ├── {mindmap-id}.shares.json       # Index of shares for this mindmap
│   └── user-settings/
│       └── user-settings.json         # User preferences
└── public-shares/                      # Global public shares folder
    ├── {share-id}.json                # Share mapping document
    └── {share-id}.thumbnail.png       # Optional thumbnail image
```

### Key Concepts

1. **User Path**: Email addresses are sanitized to create valid blob paths
2. **Share Mapping**: A JSON document linking a share ID to the original document
3. **Share Index**: Per-document list of active share IDs for quick lookup
4. **Public Shares Folder**: Central location for all share mappings

## Data Structures

### Share Mapping

```typescript
interface ShareMapping {
  id: string;              // UUID - the share identifier
  ownerEmail: string;      // Original owner's email
  ownerPath: string;       // Sanitized path derived from email
  mindMapId: string;       // ID of the shared document
  blobName: string;        // Full path to the original document blob
  createdAt: string;       // ISO timestamp
  title?: string;          // Display title for the share
  thumbnailBlobName?: string;      // Path to thumbnail (optional)
  thumbnailContentType?: string;   // MIME type of thumbnail
}
```

### Share Index Entry

```typescript
interface ShareIndexEntry {
  id: string;        // Share ID (matches ShareMapping.id)
  createdAt: string; // ISO timestamp
}
```

The share index is stored as:

```json
{
  "mindMapId": "my-document-id",
  "shares": [
    { "id": "uuid-1", "createdAt": "2025-01-01T00:00:00.000Z" },
    { "id": "uuid-2", "createdAt": "2025-01-02T00:00:00.000Z" }
  ]
}
```

## Implementation Details

### 1. Creating a Share

**Flow:**

1. Verify the user is authenticated
2. Verify the document exists and belongs to the user
3. Generate a new UUID for the share
4. Create the share mapping document in `public-shares/{share-id}.json`
5. Add the share entry to the document's index file `{user-path}/{doc-id}.shares.json`
6. Optionally upload a thumbnail to `public-shares/{share-id}.thumbnail.{ext}`

**Key Code (simplified):**

```typescript
async createShareMapping(
  userEmail: string,
  documentId: string,
  options?: { title?: string; thumbnail?: { buffer: Buffer; contentType: string } }
): Promise<ShareMapping> {
  const ownerPath = this.sanitizeEmailForPath(userEmail);
  const blobName = `${ownerPath}/${documentId}.json`;
  
  // 1. Verify document exists
  const docBlobClient = containerClient.getBlockBlobClient(blobName);
  const properties = await docBlobClient.getProperties();
  
  // 2. Generate share ID
  const shareId = randomUUID();
  
  // 3. Create mapping object
  const mapping: ShareMapping = {
    id: shareId,
    ownerEmail: userEmail,
    ownerPath,
    documentId,
    blobName,
    createdAt: new Date().toISOString(),
    title: options?.title
  };
  
  // 4. Upload share mapping to public-shares folder
  const shareBlobClient = containerClient.getBlockBlobClient(
    `public-shares/${shareId}.json`
  );
  await shareBlobClient.upload(JSON.stringify(mapping), ...);
  
  // 5. Add to document's share index
  await this.addShareToIndex(ownerPath, documentId, {
    id: shareId,
    createdAt: mapping.createdAt
  });
  
  // 6. Upload thumbnail if provided
  if (options?.thumbnail) {
    const thumbnailBlobName = `public-shares/${shareId}.thumbnail.png`;
    const thumbClient = containerClient.getBlockBlobClient(thumbnailBlobName);
    await thumbClient.uploadData(options.thumbnail.buffer, ...);
    mapping.thumbnailBlobName = thumbnailBlobName;
  }
  
  return mapping;
}
```

### 2. Accessing a Shared Document

**Flow:**

1. Look up the share mapping by ID from `public-shares/{share-id}.json`
2. Verify the share is still valid (exists in the document's share index)
3. Load the original document using the `blobName` from the mapping
4. Return the document content (read-only)

**Key Code (simplified):**

```typescript
async getShareMapping(shareId: string): Promise<ShareMapping | null> {
  // 1. Load the share mapping
  const shareBlobClient = containerClient.getBlockBlobClient(
    `public-shares/${shareId}.json`
  );
  const mapping = JSON.parse(await download(shareBlobClient));
  
  // 2. Verify it's still in the owner's index (not orphaned)
  const entries = await this.loadShareIndexEntries(
    mapping.ownerPath, 
    mapping.documentId
  );
  const isIndexed = entries.some(e => e.id === mapping.id);
  
  if (!isIndexed) {
    // Orphaned share - clean up and return null
    await this.deleteShareMapping(mapping);
    return null;
  }
  
  return mapping;
}

async loadDocumentByBlobName(blobName: string) {
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const content = await download(blobClient);
  return JSON.parse(content);
}
```

### 3. Deleting a Share

**Flow:**

1. Verify the requester owns the share (compare paths)
2. Delete the share mapping from `public-shares/{share-id}.json`
3. Remove the entry from the document's share index
4. Delete the thumbnail if it exists

**Key Code (simplified):**

```typescript
async deleteShareMapping(mapping: ShareMapping): Promise<boolean> {
  // 1. Delete the share mapping blob
  const shareBlobClient = containerClient.getBlockBlobClient(
    `public-shares/${mapping.id}.json`
  );
  await shareBlobClient.deleteIfExists();
  
  // 2. Remove from the owner's index
  await this.removeShareFromIndex(
    mapping.ownerPath,
    mapping.documentId,
    mapping.id
  );
  
  // 3. Delete thumbnail if present
  if (mapping.thumbnailBlobName) {
    const thumbClient = containerClient.getBlockBlobClient(
      mapping.thumbnailBlobName
    );
    await thumbClient.deleteIfExists();
  }
  
  return true;
}
```

### 4. Listing Shares for a User

**Flow:**

1. List all `*.shares.json` files in the user's folder
2. For each index file, load the share entries
3. Verify each share mapping still exists in `public-shares/`
4. Clean up orphaned entries

```typescript
async listSharesForUser(userEmail: string): Promise<ShareMapping[]> {
  const ownerPath = this.sanitizeEmailForPath(userEmail);
  const prefix = `${ownerPath}/`;
  const shares: ShareMapping[] = [];
  
  // Find all share index files
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.endsWith('.shares.json')) continue;
    
    const documentId = extractDocumentId(blob.name);
    const entries = await this.loadShareIndexEntries(ownerPath, documentId);
    
    for (const entry of entries) {
      // Verify the share mapping still exists
      const exists = await containerClient
        .getBlockBlobClient(`public-shares/${entry.id}.json`)
        .exists();
      
      if (!exists) {
        // Clean up orphaned index entry
        await this.removeShareFromIndex(ownerPath, documentId, entry.id);
        continue;
      }
      
      shares.push({
        id: entry.id,
        ownerEmail: userEmail,
        ownerPath,
        documentId,
        blobName: `${ownerPath}/${documentId}.json`,
        createdAt: entry.createdAt
      });
    }
  }
  
  return shares;
}
```

## API Endpoints

### `POST /api/shares`

Create a new share link.

**Request:**
```json
{
  "mindMapId": "document-id",
  "title": "Optional display title",
  "thumbnailDataUrl": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "shareId": "uuid-share-id",
  "title": "Document Title",
  "hasThumbnail": true
}
```

### `GET /api/shares`

List all shares for the authenticated user.

**Query Parameters:**
- `mindMapId` (optional): Filter by specific document

**Response:**
```json
{
  "shares": [
    {
      "shareId": "uuid-1",
      "mindMapId": "doc-1",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### `GET /api/shares/{id}`

Retrieve a shared document (public, no auth required).

**Response:**
```json
{
  "nodes": [...],
  "edges": [...],
  "title": "Document Title",
  "paletteId": "default",
  "thumbnailPath": "/api/shares/{id}/thumbnail",
  "share": {
    "id": "uuid",
    "ownerEmail": "user@example.com",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### `DELETE /api/shares/{id}`

Revoke a share link (requires authentication as owner).

**Response:**
```json
{
  "success": true
}
```

### `GET /api/shares/{id}/thumbnail`

Retrieve the thumbnail image for a shared document.

**Response:** Binary image data with appropriate `Content-Type` header.

## Security Considerations

### Authentication

- **Creating shares**: Requires authenticated user (NextAuth JWT)
- **Viewing shares**: Public access (no auth required)
- **Deleting shares**: Requires authenticated user AND ownership verification

### Ownership Verification

```typescript
const requesterPath = storageService.getUserPath(token.email);
if (mapping.ownerPath !== requesterPath) {
  return res.status(403).json({ message: "Forbidden" });
}
```

### Path Sanitization

User emails are sanitized to prevent path traversal attacks:

```typescript
private sanitizeEmailForPath(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, "-");
}
```

### Orphan Cleanup

The system automatically cleans up:
- Share mappings not in their document's index
- Index entries pointing to non-existent share mappings

## Adapting for Other Projects

To use this pattern in your own project:

### 1. Define Your Document Structure

Replace `MindMapNode` and related types with your own document types.

### 2. Configure Azure Blob Storage

```typescript
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient("your-container");
```

### 3. Implement the Storage Service

Core methods to implement:
- `createShareMapping()` - Create a new share
- `getShareMapping()` - Retrieve share by ID
- `deleteShareMapping()` - Revoke a share
- `listSharesForUser()` - List user's shares
- `loadDocumentByBlobName()` - Load shared content

### 4. Create API Routes

Implement REST endpoints for:
- `POST /api/shares` - Create share
- `GET /api/shares` - List shares
- `GET /api/shares/{id}` - Get shared content
- `DELETE /api/shares/{id}` - Revoke share

### 5. Build the Viewer Component

Create a read-only viewer for shared content that:
- Fetches content via the share API
- Displays content without edit capabilities
- Handles loading/error states
- Shows share metadata (title, creation date)

## File References

| Component | File |
|-----------|------|
| Storage Service | [src/lib/storage.ts](../src/lib/storage.ts) |
| Share API (list/create) | [src/pages/api/shares/index.ts](../src/pages/api/shares/index.ts) |
| Share API (get/delete) | [src/pages/api/shares/[id].ts](../src/pages/api/shares/%5Bid%5D.ts) |
| Thumbnail API | [src/pages/api/shares/[id]/thumbnail.ts](../src/pages/api/shares/%5Bid%5D/thumbnail.ts) |
| Shared Viewer | [src/components/editor/shared-viewer.tsx](../src/components/editor/shared-viewer.tsx) |
| Shared Page | [src/app/shared/[id]/page.tsx](../src/app/shared/%5Bid%5D/page.tsx) |
| Manage Shares Dialog | [src/components/editor/manage-shares-dialog.tsx](../src/components/editor/manage-shares-dialog.tsx) |

## Sequence Diagrams

### Creating a Share

```
User                    API                     Storage Service              Blob Storage
 │                       │                            │                           │
 ├─POST /api/shares─────►│                            │                           │
 │                       ├─createShareMapping()──────►│                           │
 │                       │                            ├─getProperties()──────────►│
 │                       │                            │◄──────document exists─────┤
 │                       │                            ├─upload share mapping─────►│
 │                       │                            │◄─────────────ok───────────┤
 │                       │                            ├─update share index───────►│
 │                       │                            │◄─────────────ok───────────┤
 │                       │◄───────ShareMapping────────┤                           │
 │◄──{ shareId, title }──┤                            │                           │
```

### Accessing a Share

```
Visitor                 API                     Storage Service              Blob Storage
 │                       │                            │                           │
 ├─GET /api/shares/{id}─►│                            │                           │
 │                       ├─getShareMapping()─────────►│                           │
 │                       │                            ├─download share mapping───►│
 │                       │                            │◄────────mapping───────────┤
 │                       │                            ├─loadShareIndexEntries()──►│
 │                       │                            │◄────────entries───────────┤
 │                       │◄───────ShareMapping────────┤                           │
 │                       ├─loadMindMapByBlobName()───►│                           │
 │                       │                            ├─download document────────►│
 │                       │                            │◄────────content───────────┤
 │                       │◄───────document────────────┤                           │
 │◄───{ nodes, edges }───┤                            │                           │
```
