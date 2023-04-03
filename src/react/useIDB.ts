import * as React from 'react';
import { IDBContext } from './IDBProvider.js';

/**
 * Hook to get your database inside React components
 * @returns IDB database instance
 */
export function useIDB() {
  const db = React.useContext(IDBContext);
  if (db === null) {
    console.warn(
      '[IDB] IDB database can`t be used in components that are not childrens of IDBProvider'
    );
  }
  return db;
}
