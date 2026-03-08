import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../config/env";

let s3: S3Client | null = null;

function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      endpoint: env.spaces.endpoint,
      region: env.spaces.region,
      credentials: { accessKeyId: env.spaces.key, secretAccessKey: env.spaces.secret },
      forcePathStyle: false,
    });
  }
  return s3;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  if (!env.spaces.enabled) {
    // Sem Spaces configurado: armazena em base64 no campo storagePath
    // Apenas para desenvolvimento local
    return `local:${buffer.toString("base64")}`;
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.spaces.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "private",
    })
  );
  return key;
}

export async function downloadFile(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("local:")) {
    return Buffer.from(storagePath.replace("local:", ""), "base64");
  }
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: env.spaces.bucket, Key: storagePath })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFile(storagePath: string): Promise<void> {
  if (!env.spaces.enabled || storagePath.startsWith("local:")) return;
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env.spaces.bucket, Key: storagePath })
  );
}
