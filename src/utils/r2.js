const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

// Initialize the S3 client configured for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.r2Endpoint,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

/**
 * Upload a file buffer to Cloudflare R2
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - The target filename in bucket
 * @param {string} mimeType - The mime-type of the file (e.g. 'audio/webm')
 * @returns {Promise<string>} The public access URL of the uploaded file
 */
const uploadToR2 = async (fileBuffer, fileName, mimeType) => {
  if (!env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Endpoint || !env.r2BucketName) {
    throw new Error('Cloudflare R2 configuration is missing in environment variables.');
  }

  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType || 'application/octet-stream',
  });

  await r2Client.send(command);

  // Return the public URL
  // If r2PublicUrl is defined, prepend it. Otherwise fallback to endpoint/bucket
  const baseUrl = env.r2PublicUrl
    ? env.r2PublicUrl.replace(/\/$/, '')
    : `${env.r2Endpoint.replace(/\/$/, '')}/${env.r2BucketName}`;

  return `${baseUrl}/${fileName}`;
};

/**
 * Delete a file from Cloudflare R2
 * @param {string} fileName - The key/filename in bucket
 */
const deleteFromR2 = async (fileName) => {
  if (!fileName) return;
  if (!env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Endpoint || !env.r2BucketName) {
    throw new Error('Cloudflare R2 configuration is missing in environment variables.');
  }

  const command = new DeleteObjectCommand({
    Bucket: env.r2BucketName,
    Key: fileName,
  });

  await r2Client.send(command);
};

/**
 * Extract R2 key/filename from a public URL
 * @param {string} url - The public URL of the file
 * @returns {string|null} The key/filename
 */
const getR2KeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
  } catch (e) {
    return decodeURIComponent(url.substring(url.lastIndexOf('/') + 1));
  }
};

module.exports = {
  r2Client,
  uploadToR2,
  deleteFromR2,
  getR2KeyFromUrl,
};
