import * as React from 'react';
import { IDB } from '../IDB.js';
import type { IDBArguments } from '../IDBTypes.js';

/**
 * Hook to create database inside React components
 * @returns IDB database instance
 */
export function useCreateIDB(...args: IDBArguments) {
  const [db, setDb] = React.useState<IDB | void>(undefined);
  React.useEffect(() => {
    const database = new IDB(...args);
    setDb(database);
    return () => {
      database.db.close();
    };
  }, args);
  return db;
}
