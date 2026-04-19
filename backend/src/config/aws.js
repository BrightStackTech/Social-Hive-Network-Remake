import AWS from 'aws-sdk';
import { ApiError } from '../utils/ApiError.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Config = {
  accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.VITE_AWS_REGION || process.env.AWS_REGION,
};

// Log warning if config is missing (but don't log secrets)
if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.region) {
  console.warn('⚠️ AWS S3 configuration is incomplete:', {
    hasAccessKey: !!s3Config.accessKeyId,
    hasSecretKey: !!s3Config.secretAccessKey,
    hasRegion: !!s3Config.region,
    bucket: process.env.VITE_AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME
  });
}

const s3 = new AWS.S3(s3Config);

export const uploadToS3 = async (buffer, filename, mimetype) => {
  const bucketName = process.env.VITE_AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME;

  if (!bucketName) {
    throw new ApiError(500, 'AWS S3 Bucket name is missing. Please check your .env file.');
  }

  try {
    const params = {
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    };

    const res = await s3.upload(params).promise();
    return res;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new ApiError(500, 'Failed to upload to S3');
  }
};

export const deleteFromS3 = async (fileKey) => {
  try {
    const params = {
      Bucket: process.env.VITE_AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};
