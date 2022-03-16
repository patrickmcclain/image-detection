import { db } from '../config/externalServices.config';
import { ErrorStatus } from '../utils/errors';


export type Image = {
  id?: number;
  name: string;
  label: string;
  url: string;
};


export async function insertImage(image: Image) {
  try {
    return await db.one('INSERT INTO image (name, label, url) VALUES($1, $2, $3) RETURNING id', [image.name, image.label, image.url]);
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error inserting image', 500);
  }
};