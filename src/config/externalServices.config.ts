import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import pgp from 'pg-promise';

// Normally these config values would be stored elsewhere - somewhere secure

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: 'AKIA5DAZDK4TSVQ4VMYM',
    secretAccessKey: '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'
  },
  region: 'us-east-1'
});

export const rekog = new RekognitionClient({
  credentials: {
    accessKeyId: 'AKIA5DAZDK4TSVQ4VMYM',
    secretAccessKey: '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'
  },
  region: 'us-east-1'
});

const dbConnection = {
  user: 'postgres',
  host: 'image-detection-1.covs4wb5jud4.us-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'image-detection-pass',
  port: 5432,
};
export const pg = pgp();
export const db = pg(dbConnection);
