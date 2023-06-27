import * as React from 'react';
import type { IDB } from '../IDB.js';
import { IDBContext } from './IDBProvider.js';

/**
 * Hook to get access to your IDB instance in the React components
 * @returns IDB database instance
 */
export function useIDB(): IDB {
  const db = React.useContext(IDBContext);
  if (!db) {
    throw Error(
      '[IDB] IDB database can`t be used in components that are not childrens of IDBProvider'
    );
  }
  return db;
}
