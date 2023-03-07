import { IDB } from '../IDB.js';
import { DataUpdatedInfo } from '../IDBTypes.js';

export interface InitialArg<T> {
  /**
   * Initial state while database data loading
   */
  initial?: T,
}

export interface KeyArg<K> {
  /**
   * Key to item to connect
   */
  key?: K,
}

export interface KeysArg<K> {
  /**
   * Keys arrays to items to connect
   */
  keys?: K[],
}

export interface GetAllArg {
  /**
   * Connect whole store to component
   */
  getAll?: boolean,
}

/**
 * Internal type for processing updates
 */
export type DataUpdateResponse = 'callSetter' | 'callGetData' | undefined;

export async function processDataUpdate<K>(
  db: IDB,
  store: string,
  { key, keys, getAll }: KeyArg<K> & KeysArg<K> & GetAllArg,
  { type, item }: DataUpdatedInfo
): Promise<DataUpdateResponse>
{
  if (type === 'deleteAll') {
    return 'callSetter';
  }
  if (getAll) {
    return 'callGetData';
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
