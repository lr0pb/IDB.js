import { IDB } from '../IDB.js';
import { DataUpdatedInfo } from '../IDB.types.js';

export interface DataLinkerArgs<T, K> {
  initial?: T,
  key?: K,
  keys?: K[],
  getAll?: boolean,
}

type DataUpdateResponse = 'callSetter' | 'callGetData' | undefined;

export async function processDataUpdate<K>(
  db: IDB,
  store: string,
  { key, keys }: DataLinkerArgs<{}, K>,
  { type, item }: DataUpdatedInfo
): Promise<DataUpdateResponse>
{
  if (type === 'deleteAll') {
    return 'callSetter';
  }
  const checkKeyUpdate = async (k?: K | K[]) => {
    if (k === undefined) return false;
    if (!Array.isArray(k)) k = [k];
    if (type === 'set' && k.includes(item)) return true;
    const isDataExist = await db.has<K>(store, k);
    return isDataExist.includes(false);
  }
  const isKeyUpdated = await checkKeyUpdate(key);
  const isKeysUpdated = await checkKeyUpdate(keys);
  if (isKeyUpdated || isKeysUpdated) {
    return 'callGetData';
  }
}
