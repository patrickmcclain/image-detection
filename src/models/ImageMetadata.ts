import { Image } from "./Image";
import { Label } from "./Label";
import { db } from '../config/externalServices.config';
import { ErrorStatus } from '../utils/errors';

export type ImageMetadata = { image: Image, objects_identified: Label[] };

export async function getImage(id: string | number): Promise<ImageMetadata> {
  try {
    const [image, imageLabels] = await Promise.all([
      db.one('SELECT * FROM image i WHERE i.id = $1', [id]),
      db.manyOrNone(`
      SELECT l.name, il.conf FROM image i 
      INNER JOIN image_label il ON il.image_id = i.id
      INNER JOIN "label" l ON il.label_id = l.name
      WHERE i.id = $1`, [id])
    ]);

    return { image, objects_identified: imageLabels };
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error finding image', 500);
  }
};

export async function getAllImages(): Promise<ImageMetadata[]> {
  try {
    const images: { id: number }[] = await db.manyOrNone('SELECT i.id FROM image i');

    return await Promise.all(images.map(image => getImage(image.id)));
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error finding all images', 500);
  }
};

export async function getImagesByLabels(labels: string[]): Promise<ImageMetadata[]>  {
  try {
    const images: { id: number }[] = await db.manyOrNone(`
      SELECT i.id FROM image_label il 
      INNER JOIN image i ON i.id = il.image_id 
      WHERE il.label_id IN ($1:list) 
      GROUP BY i.id
      HAVING COUNT(i.id) = $2`, [labels, labels.length]);

    return await Promise.all(images.map(image => getImage(image.id)));
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error finding images by labels', 500);
  }
};