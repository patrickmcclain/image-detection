import { db, pg } from '../config/externalServices.config';
import { Label } from '../models/Label';
import { ErrorStatus } from '../utils/errors';


export type ImageLabel = {
  imageId: number | undefined;
  labelId: number | undefined;
  conf: number | undefined;
};


export async function insertImageLabels(imageLabels: ImageLabel[] | undefined) {
  if (!imageLabels || imageLabels.length == 0) return;

  try {
    const cs = new pg.helpers.ColumnSet(['image_id', 'label_id', 'conf'], {table: 'image_label'});
    const values = imageLabels.map(imageLabel => ({ image_id: imageLabel.imageId, label_id: imageLabel.labelId, conf: imageLabel.conf }));
    const query = pg.helpers.insert(values, cs) + 'ON CONFLICT DO NOTHING RETURNING *';

    return await db.manyOrNone(query);
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error inserting imageLabels', 500);
  }
};