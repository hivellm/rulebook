---
name: "MinIO"
description: "Use MinIO for S3-compatible object storage, self-hosted file storage, and development/testing with S3 APIs."
version: "1.0.0"
category: "services"
author: "Rulebook"
tags: ["services", "storage"]
dependencies: []
conflicts: []
---
<!-- MINIO:START -->
# MinIO S3-Compatible Storage Instructions

**CRITICAL**: Use MinIO for S3-compatible object storage, self-hosted file storage, and development/testing with S3 APIs.

## Core Features

### Connection
```typescript
// Using @aws-sdk/client-s3 (S3-compatible)
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
})

// Using minio-js
import * as MinIO from 'minio'

const minioClient = new MinIO.Client({
  endPoint: process.env.MINIO_ENDPOINT?.replace('http://', '').replace('https://', '') || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})
```

### Basic Operations
```typescript
// Using S3 SDK
// Create bucket
await s3Client.send(new CreateBucketCommand({
  Bucket: 'my-bucket',
}))

// Upload file
await s3Client.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'path/to/file.jpg',
  Body: fileBuffer,
  ContentType: 'image/jpeg',
}))

// Download file
const response = await s3Client.send(new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'path/to/file.jpg',
}))
const fileContent = await response.Body?.transformToByteArray()

// Using MinIO SDK
// Upload file
await minioClient.putObject('my-bucket', 'path/to/file.jpg', fileBuffer, fileBuffer.length, {
  'Content-Type': 'image/jpeg',
})

// Download file
const dataStream = await minioClient.getObject('my-bucket', 'path/to/file.jpg')
const chunks: Buffer[] = []
for await (const chunk of dataStream) {
  chunks.push(chunk)
}
const fileContent = Buffer.concat(chunks)

// List objects
const objectsStream = minioClient.listObjects('my-bucket', 'prefix/', true)
for await (const obj of objectsStream) {
  console.log(obj.name, obj.size)
}
```

### Advanced Features
```typescript
// Presigned URL (S3 SDK)
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/file.jpg',
  ContentType: 'image/jpeg',
})

const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

// Presigned URL (MinIO SDK)
const url = await minioClient.presignedPutObject('my-bucket', 'uploads/file.jpg', 3600)

// Bucket policies
const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: ['arn:aws:s3:::my-bucket/*'],
    },
  ],
}

await minioClient.setBucketPolicy('my-bucket', JSON.stringify(policy))
```

## Common Patterns

### File Upload Handler
```typescript
async function uploadFile(file: Buffer, filename: string, userId: string) {
  const key = `users/${userId}/${Date.now()}-${filename}`
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
    Key: key,
    Body: file,
    ContentType: getContentType(filename),
    Metadata: {
      userId,
      originalName: filename,
    },
  }))
  
  return {
    key,
    url: `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${key}`,
  }
}
```

## Best Practices

✅ **DO:**
- Use S3-compatible APIs for portability
- Set appropriate content types
- Use presigned URLs for client uploads
- Implement proper error handling
- Use bucket policies for access control
- Enable versioning for important data
- Monitor storage usage
- Use lifecycle policies
- Implement retry logic
- Use TLS in production

❌ **DON'T:**
- Store sensitive data without encryption
- Use default credentials in production
- Hardcode endpoint URLs
- Ignore error handling
- Skip content-type validation
- Ignore access policies
- Skip monitoring
- Use HTTP in production
- Ignore storage limits
- Store large files without chunking

## Configuration

### Environment Variables
```bash
MINIO_ENDPOINT=http://localhost:9000
MINIO_ENDPOINT=https://minio.example.com
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=my-bucket
MINIO_REGION=us-east-1
```

### Docker Compose
```yaml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: securepassword
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
```

<!-- MINIO:END -->

