import { db, pg } from '../config/externalServices.config';
import { ErrorStatus } from '../utils/errors';

export type Label = {
  name: string | undefined;
};

export async function insertLabels(labels: Label[] | undefined) {
  if (!labels || labels.length == 0) return;

  try {
    const cs = new pg.helpers.ColumnSet(['name'], {table: 'label'});
    const values = labels.map(label => ({ name: label.name }));
    const query = pg.helpers.insert(values, cs) + 'ON CONFLICT DO NOTHING';

    await db.none(query);
  } catch (err) {
    console.log('ERROR:', err);
    throw new ErrorStatus('StorageException: Error inserting labels', 500);
  }
};