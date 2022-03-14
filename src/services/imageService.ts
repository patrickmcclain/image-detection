import fs from 'fs';
import Axios from 'axios';
import path from 'path';
import tmp from 'tmp';
import { s3Client } from '../config/externalServices.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { rekog, pool } from '../config/externalServices.config';
import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';

export async function downloadImage(url) {
  const fileName = new URL(url).pathname.split('/').pop();
  const path = tmp.fileSync({name: fileName}).name;
  const writer = fs.createWriteStream(path);

  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(path));
    writer.on('error', reject);
  });
}

export async function uploadImage(filePath, fileKey) {
  const fileStream = fs.createReadStream(filePath);
  
  const uploadParams = {
    Bucket: "pm2-image-recognition",
    // Add the required 'Key' parameter using the 'path' module.
    Key: fileKey,
    // Add the required 'Body' parameter
    Body: fileStream,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Success", data);
    return { ...data, fileKey };
  } catch (err) {
    console.log("Error", err);
    throw err;
  }
}

export async function analyzeImage(fileKey) {
  const detectLabelsInput = {
    Image: {
      S3Object: {
        Bucket: "pm2-image-recognition",
        Name: fileKey
      }
    }
  };

  try {
    const data = await rekog.send(new DetectLabelsCommand(detectLabelsInput));
    console.log("Success", data);
    return data;
  } catch (err) {
    console.log("Error", err);
    throw err;
  }
}