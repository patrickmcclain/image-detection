import fs from 'fs';
import Axios from 'axios';
import path from 'path';
import tmp from 'tmp';
import { s3Client } from '../config/externalServices.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { rekog } from '../config/externalServices.config';
import { DetectLabelsCommand, InvalidImageFormatException } from '@aws-sdk/client-rekognition';
import { ErrorStatus } from '../utils/errors';

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
    Key: fileKey,
    Body: fileStream,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    return { ...data, fileKey };
  } catch (err) {
    console.log("Error: ", err);

    throw new ErrorStatus("ServiceException: Image Upload Error", 500);
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
    return await rekog.send(new DetectLabelsCommand(detectLabelsInput));
  } catch (err) {
    console.log("Error: ", err);

    if (err instanceof InvalidImageFormatException) {
      throw new ErrorStatus('ServiceException: Invalid Image Format (Only .jpg and .png are allowed)', 400);
    }

    throw new ErrorStatus("ServiceException: Image Recognition Error", 500);
  }
}

export function getImageUrl(fileKey) {
  return 'https://pm2-image-recognition.s3.amazonaws.com/' + fileKey;
}