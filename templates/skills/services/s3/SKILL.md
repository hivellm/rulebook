---
name: "S3"
description: "Use AWS S3 for object storage, file uploads, static assets, and backup storage with high availability."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "storage"]
dependencies: []
conflicts: []
---
<!-- S3:START -->
# AWS S3 Storage Instructions

**CRITICAL**: Use AWS S3 for object storage, file uploads, static assets, and backup storage with high availability.

## Core Features

### Connection
```typescript
// Using @aws-sdk/client-s3
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

// Using AWS SDK v2
import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
})
```

### Basic Operations
```typescript
// Upload file
const uploadParams = {
  Bucket: process.env.S3_BUCKET || 'my-bucket',
  Key: 'path/to/file.jpg',
  Body: fileBuffer,
  ContentType: 'image/jpeg',
  ACL: 'private', // or 'public-read'
}

await s3Client.send(new PutObjectCommand(uploadParams))

// Upload with metadata
await s3Client.send(new PutObjectCommand({
  ...uploadParams,
  Metadata: {
    userId: '123',
    originalName: 'photo.jpg',
  },
  TagSet: [
    { Key: 'category', Value: 'profile' },
  ],
}))

// Get file
const getParams = {
  Bucket: process.env.S3_BUCKET,
  Key: 'path/to/file.jpg',
}

const response = await s3Client.send(new GetObjectCommand(getParams))
const fileContent = await response.Body?.transformToByteArray()

// Delete file
await s3Client.send(new DeleteObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'path/to/file.jpg',
}))
```

### Advanced Features
```typescript
// Presigned URL for upload
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const command = new PutObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'uploads/file.jpg',
  ContentType: 'image/jpeg',
})

const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

// Presigned URL for download
const getCommand = new GetObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'path/to/file.jpg',
})

const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 })

// Multipart upload (for large files)
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'

const createCommand = new CreateMultipartUploadCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'large-file.zip',
  ContentType: 'application/zip',
})

const { UploadId } = await s3Client.send(createCommand)

// Upload parts
const part1 = await s3Client.send(new UploadPartCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'large-file.zip',
  PartNumber: 1,
  UploadId,
  Body: part1Buffer,
}))

// Complete upload
await s3Client.send(new CompleteMultipartUploadCommand({
  Bucket: process.env.S3_BUCKET,
  Key: 'large-file.zip',
  UploadId,
  MultipartUpload: {
    Parts: [
      { PartNumber: 1, ETag: part1.ETag },
    ],
  },
}))

// List objects
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

const listCommand = new ListObjectsV2Command({
  Bucket: process.env.S3_BUCKET,
  Prefix: 'uploads/',
  MaxKeys: 100,
})

const { Contents } = await s3Client.send(listCommand)
```

## Common Patterns

### File Upload Handler
```typescript
async function uploadFile(file: Buffer, filename: string, userId: string) {
  const key = `users/${userId}/${Date.now()}-${filename}`
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: getContentType(filename),
    Metadata: {
      userId,
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  }))
  
  return {
    key,
    url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  }
}
```

### Temporary File Access
```typescript
async function generateTemporaryDownloadUrl(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  })
  
  return await getSignedUrl(s3Client, command, { expiresIn })
}
```

### File Cleanup
```typescript
async function deleteFilesByPrefix(prefix: string) {
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET,
    Prefix: prefix,
  })
  
  let continuationToken: string | undefined
  
  do {
    const response = await s3Client.send({
      ...listCommand,
      ContinuationToken: continuationToken,
    })
    
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: object.Key,
          }))
        }
      }
    }
    
    continuationToken = response.NextContinuationToken
  } while (continuationToken)
}
```

## Best Practices

✅ **DO:**
- Use presigned URLs for client uploads
- Set appropriate Content-Type headers
- Use versioning for important files
- Implement lifecycle policies for cleanup
- Use multipart upload for files > 5MB
- Enable encryption (SSE-S3 or SSE-KMS)
- Use appropriate storage classes (Standard, IA, Glacier)
- Implement proper error handling
- Use bucket policies for access control
- Monitor bucket usage and costs

❌ **DON'T:**
- Store sensitive data without encryption
- Use public-read ACL unnecessarily
- Hardcode credentials
- Ignore error handling
- Skip content-type validation
- Store large files without multipart upload
- Ignore lifecycle policies
- Skip access logging
- Use default bucket policies
- Ignore cost optimization

## Configuration

### Environment Variables
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=my-bucket
```

### IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

## Integration with Development

### Testing
```typescript
// Use test bucket or LocalStack
const testS3Client = new S3Client({
  endpoint: 'http://localhost:4566', // LocalStack
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  forcePathStyle: true,
})

// Clean up after tests
afterEach(async () => {
  // Delete test files
})
```

### Health Checks
```typescript
async function checkS3Health(): Promise<boolean> {
  try {
    await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      MaxKeys: 1,
    }))
    return true
  } catch {
    return false
  }
}
```

<!-- S3:END -->

