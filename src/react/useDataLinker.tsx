import * as React from 'react';
import { useIDB } from './IDBProvider.js';
import {
  InitialArg,
  KeyArg,
  KeysArg,
  GetAllArg,
  processDataUpdate
} from './processDataUpdate.js';

/**
 * Hook to connect items from database to your React component
 * @param store Store from which you will get items
 * @param params Parameters to connect `one item` from database
 */
export function useDataLinker<T, K>(
  store: string, { initial, key }: InitialArg<T> & KeyArg<K>
): T | void;
/**
 * Hook to connect items from database to your React component
 * @param store Store from which you will get items
 * @param params Parameters to connect `selected items` from database
 */
export function useDataLinker<T, K>(
  store: string, { initial, keys }: InitialArg<T> & KeysArg<K>
): (T | void)[];
/**
 * Hook to connect items from database to your React component
 * @param store Store from which you will get items
 * @param params Parameters to connect `whole store` from database
 */
export function useDataLinker<T>(
  store: string, { initial, getAll }: InitialArg<T> & GetAllArg
): T[];
/**
 * Hook to connect items from database to your React component
 * @param store Store from which you will get items
 * @param params Parameters to connect `store` or `selected items` from database
 */
export function useDataLinker<T>(
  store: string, { initial, keys, getAll }: InitialArg<T> & KeysArg<{}> & GetAllArg
): (T | void)[];

export function useDataLinker<T, K>(
  store: string,
  { initial, key, keys, getAll }: InitialArg<T> & KeyArg<K> & KeysArg<K> & GetAllArg = {}
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
    // const unregisterPromise = db.onDataUpdate(store, async (updateInfo) => {
    //   const resp = await processDataUpdate<K>(
    //     db, store, arguments[1], updateInfo
    //   );
    //   if (resp === 'callSetter') {
    //     setter(undefined);
    //   } else if (resp === 'callGetData') {
    //     await getData();
    //   }
    // });
    // return () => {
    //   unregisterPromise.then((unregister) => {
    //     if (unregister) unregister();
    //   });
    // };
  }, []);
  return data;
}
