---
name: "Google Cloud Storage"
description: "Use Google Cloud Storage for object storage, file uploads, static assets, and backup storage in GCP."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "storage"]
dependencies: []
conflicts: []
---
<!-- GCS:START -->
# Google Cloud Storage Instructions

**CRITICAL**: Use Google Cloud Storage for object storage, file uploads, static assets, and backup storage in GCP.

## Core Features

### Connection
```typescript
// Using @google-cloud/storage
import { Storage } from '@google-cloud/storage'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE, // Path to service account key
  // Or use credentials object
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'my-bucket')
```

### Basic Operations
```typescript
// Upload file
const file = bucket.file('path/to/file.jpg')
await file.save(fileBuffer, {
  metadata: {
    contentType: 'image/jpeg',
    metadata: {
      userId: '123',
      originalName: 'photo.jpg',
    },
  },
})

// Download file
const [fileContent] = await file.download()

// Delete file
await file.delete()

// List files
const [files] = await bucket.getFiles({
  prefix: 'uploads/',
  maxResults: 100,
})
```

### Advanced Features
```typescript
// Generate signed URL
const [url] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + 3600 * 1000, // 1 hour
})

// Generate signed URL for upload
const [uploadUrl] = await file.getSignedUrl({
  action: 'write',
  expires: Date.now() + 3600 * 1000,
  contentType: 'image/jpeg',
})

// Copy file
const sourceFile = bucket.file('source/file.jpg')
const destFile = bucket.file('dest/file.jpg')
await sourceFile.copy(destFile)

// Set metadata
await file.setMetadata({
  metadata: {
    category: 'profile',
    uploadedBy: 'user-123',
  },
})

// Get metadata
const [metadata] = await file.getMetadata()
console.log(metadata.contentType, metadata.size, metadata.metadata)
```

## Common Patterns

### File Upload Handler
```typescript
async function uploadFile(file: Buffer, filename: string, userId: string) {
  const filePath = `users/${userId}/${Date.now()}-${filename}`
  const file = bucket.file(filePath)
  
  await file.save(file, {
    metadata: {
      contentType: getContentType(filename),
      metadata: {
        userId,
        originalName: filename,
        uploadedAt: new Date().toISOString(),
      },
    },
  })
  
  await file.makePublic() // Or use signed URLs
  
  return {
    filePath,
    publicUrl: file.publicUrl(),
  }
}
```

### Temporary Access URL
```typescript
async function generateTemporaryUrl(filePath: string, expiresInMinutes: number = 60) {
  const file = bucket.file(filePath)
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  })
  return url
}
```

## Best Practices

✅ **DO:**
- Use appropriate storage classes (Standard, Nearline, Coldline, Archive)
- Set blob metadata for organization
- Use signed URLs for temporary access
- Implement proper error handling
- Use appropriate content types
- Enable versioning for important data
- Monitor storage usage and costs
- Use lifecycle management policies
- Implement retry logic
- Use service account credentials

❌ **DON'T:**
- Store sensitive data without encryption
- Make files public unnecessarily
- Hardcode credentials
- Ignore error handling
- Skip content-type validation
- Ignore lifecycle policies
- Skip access logging
- Use default permissions
- Ignore cost optimization
- Store large files without chunking

## Configuration

### Environment Variables
```bash
GCP_PROJECT_ID=my-project
GCP_KEY_FILE=/path/to/service-account-key.json
GCP_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GCS_BUCKET_NAME=my-bucket
```

### Service Account Key
```json
{
  "type": "service_account",
  "project_id": "my-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

<!-- GCS:END -->

