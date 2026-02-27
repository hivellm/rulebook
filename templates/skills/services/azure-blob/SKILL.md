---
name: "Azure Blob Storage"
description: "Use Azure Blob Storage for object storage, file uploads, static assets, and backup storage in Azure cloud."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "storage"]
dependencies: []
conflicts: []
---
<!-- AZURE_BLOB:START -->
# Azure Blob Storage Instructions

**CRITICAL**: Use Azure Blob Storage for object storage, file uploads, static assets, and backup storage in Azure cloud.

## Core Features

### Connection
```typescript
// Using @azure/storage-blob
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob'

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || ''
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || ''

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey)
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
)

const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_CONTAINER_NAME || 'mycontainer'
)
```

### Basic Operations
```typescript
// Create container
await containerClient.createIfNotExists({
  access: 'blob', // 'blob', 'container', or 'private'
})

// Upload blob
const blockBlobClient = containerClient.getBlockBlobClient('path/to/file.jpg')
await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
  blobHTTPHeaders: {
    blobContentType: 'image/jpeg',
  },
  metadata: {
    userId: '123',
    originalName: 'photo.jpg',
  },
})

// Download blob
const downloadResponse = await blockBlobClient.download()
const fileContent = await streamToBuffer(downloadResponse.readableStreamBody)

// Delete blob
await blockBlobClient.delete()

// List blobs
for await (const blob of containerClient.listBlobsFlat()) {
  console.log(blob.name, blob.properties.contentLength)
}
```

### Advanced Features
```typescript
// Generate SAS URL
import { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob'

const sasToken = generateBlobSASQueryParameters(
  {
    containerName: 'mycontainer',
    blobName: 'path/to/file.jpg',
    permissions: BlobSASPermissions.parse('r'), // read
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
  },
  sharedKeyCredential
).toString()

const sasUrl = `https://${accountName}.blob.core.windows.net/mycontainer/path/to/file.jpg?${sasToken}`

// Copy blob
const sourceBlobClient = containerClient.getBlockBlobClient('source/file.jpg')
const destBlobClient = containerClient.getBlockBlobClient('dest/file.jpg')
await destBlobClient.beginCopyFromURL(sourceBlobClient.url)

// Set blob metadata
await blockBlobClient.setMetadata({
  category: 'profile',
  uploadedBy: 'user-123',
})

// Get blob properties
const properties = await blockBlobClient.getProperties()
console.log(properties.contentType, properties.contentLength, properties.metadata)
```

## Common Patterns

### File Upload Handler
```typescript
async function uploadFile(file: Buffer, filename: string, userId: string) {
  const blobName = `users/${userId}/${Date.now()}-${filename}`
  const blobClient = containerClient.getBlockBlobClient(blobName)
  
  await blobClient.upload(file, file.length, {
    blobHTTPHeaders: {
      blobContentType: getContentType(filename),
    },
    metadata: {
      userId,
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  })
  
  return {
    blobName,
    url: blobClient.url,
  }
}
```

### Temporary Access URL
```typescript
async function generateTemporaryUrl(blobName: string, expiresInMinutes: number = 60) {
  const blobClient = containerClient.getBlockBlobClient(blobName)
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: containerClient.containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    },
    sharedKeyCredential
  ).toString()
  
  return `${blobClient.url}?${sasToken}`
}
```

## Best Practices

✅ **DO:**
- Use appropriate access tiers (Hot, Cool, Archive)
- Set blob metadata for organization
- Use SAS tokens for temporary access
- Implement proper error handling
- Use appropriate content types
- Enable soft delete for important data
- Monitor storage usage and costs
- Use lifecycle management policies
- Implement retry logic
- Use connection strings or managed identity

❌ **DON'T:**
- Store sensitive data without encryption
- Use public access unnecessarily
- Hardcode credentials
- Ignore error handling
- Skip content-type validation
- Ignore lifecycle policies
- Skip access logging
- Use default access levels
- Ignore cost optimization
- Store large files without chunking

## Configuration

### Environment Variables
```bash
AZURE_STORAGE_ACCOUNT_NAME=myaccount
AZURE_STORAGE_ACCOUNT_KEY=your-account-key
AZURE_CONTAINER_NAME=mycontainer
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

### Managed Identity (Recommended)
```typescript
import { DefaultAzureCredential } from '@azure/identity'

const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
)
```

<!-- AZURE_BLOB:END -->

