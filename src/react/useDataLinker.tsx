import * as React from 'react';
import { useIDB } from './IDBProvider.js';
import { DataLinkerArgs, processDataUpdate } from './processDataUpdate.js';

export function useDataLinker<T, K>(
  store: string, { initial, key }: DataLinkerArgs<T, K>
): T | void;
export function useDataLinker<T, K>(
  store: string, { initial, keys }: DataLinkerArgs<T, K>
): (T | void)[];
export function useDataLinker<T>(
  store: string, { initial, getAll }: DataLinkerArgs<T, {}>
): T[];
export function useDataLinker<T>(
  store: string, { initial, keys, getAll }: DataLinkerArgs<T, {}>
): (T | void)[];

export function useDataLinker<T, K>(
  store: string,
  { initial, key, keys, getAll }: DataLinkerArgs<T, K> = {}
): T | void | (T | void)[]
{
  if (!store) {
    throw new Error('[IDB] useDataLinker hook require store name');
  }
  const haveInitial = 'initial' in arguments[1];
  if (
    Object.keys(arguments[1]).length === (haveInitial ? 1 : 0)
  ) {
    throw new Error('[IDB] useDataLinker hook require at least some key argument');
  }
  const isArrayResponse = keys || getAll;
  const db = useIDB();
  const [data, setter] = React.useState(
    haveInitial ? initial : (isArrayResponse ? [] : {}) as T | void | (T | void)[]
  );
  React.useEffect(() => {
    async function getData() {
      let resp: T | void | (T | void)[];
      if (key !== undefined) {
        resp = await db.get<T, K>(store, key);
      } else if (keys !== undefined) {
        resp = await db.get<T, K>(store, keys);
      } else if (getAll) {
        resp = await db.getAll<T>(store);
      }
      setter(resp);
    }
    getData();
    const unregisterPromise = db.onDataUpdate(store, async (updateInfo) => {
      const resp = await processDataUpdate<K>(
        db, store, arguments[1], updateInfo
      );
      if (resp === 'callSetter') {
        setter(undefined);
      } else if (resp === 'callGetData') {
        await getData();
      }
    });
    return () => {
      unregisterPromise.then((unregister) => {
        if (unregister) unregister();
      });
    };
  }, []);
  return data;
}
