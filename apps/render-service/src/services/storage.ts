import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const bucketName = process.env.R2_BUCKET_NAME || 'vstudio-renders';
const cdnPublicUrl = process.env.CDN_PUBLIC_URL || 'http://localhost:3000/exports';
const localOutputDir = process.env.RENDER_OUTPUT_DIR || path.join(process.cwd(), 'exports');

let s3Client: S3Client | null = null;

if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function saveRenderedVideo(localFilePath: string, fileName: string): Promise<string> {
  if (s3Client) {
    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `renders/${fileName}`,
      Body: fileStream,
      ContentType: 'video/mp4',
    });

    await s3Client.send(command);
    return `${cdnPublicUrl.replace(/\/$/, '')}/renders/${fileName}`;
  }

  // Fallback a almacenamiento local accesible
  if (!fs.existsSync(localOutputDir)) {
    fs.mkdirSync(localOutputDir, { recursive: true });
  }

  const destination = path.join(localOutputDir, fileName);
  fs.copyFileSync(localFilePath, destination);
  return `${cdnPublicUrl.replace(/\/$/, '')}/${fileName}`;
}

