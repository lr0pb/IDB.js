import * as React from 'react';
import { useIDB } from './useIDB.js';

/**
 * Hook to read items from database in the React components.
 * If used items got updated in database, it will automatically rerender component
 * @param store Store from which you will get items
 * @param keys Key of item /
 * array of item keys, if no - fallback to all store items /
 * explicit { getAll: true } to get all store items
 * @param initial Initial value
 * @example // Read one item:
 * useData<ItemType, number>('store', 123)
 * @example // Read multiple items, if no keys array presented - fallback to get all store items:
 * useData<ItemType, number>('store', [123, 124])
 * @example // Explicitly read all store items:
 * useData<ItemType>('store', { getAll: true })
 */
export function useData<T, K>(store: string, keys: K, initial?: T): T | void;

export function useData<T, K>(
  store: string,
  keys: K[] | void,
  initial?: T[]
): (T | void)[];

export function useData<T>(
  store: string,
  keys: { getAll: true },
  initial?: T[]
): T[];

export function useData<T, K>(
  store: string,
  keys: K | K[] | void,
  initial?: T | T[] | null
): T | void | (T | void)[] {
  const getAll =
    !keys ||
    (typeof keys === 'object' &&
      !Array.isArray(keys) &&
      (keys as { getAll?: true }).getAll === true);
  const db = useIDB();
  const [data, setter] = React.useState<T | void | (T | void)[]>(
    initial ?? (getAll || Array.isArray(keys) ? [] : undefined)
  );
  React.useEffect(() => {
    const unregisterPromise = db.followDataUpdates(store, keys, setter);
    return () => {
      unregisterPromise.then((unregister) => {
        if (unregister) unregister();
      });
    };
  }, [store, keys]);
  return data;
}