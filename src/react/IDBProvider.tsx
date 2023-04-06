import * as React from 'react';
import { IDB } from '../IDB.js';

export const IDBContext = React.createContext<IDB | void>(undefined);

interface IDBProviderProps {
  /**
   * IDB database instance
   */
  db: IDB,
  children?: React.ReactNode,
}

/**
 * Top container component that pass context with IDB instance
 * down to the components that will use IDB
 */
export const IDBProvider: React.FC<IDBProviderProps> = ({
  db, children
}) => {
  React.useEffect(() => {
    if (!db || !(db instanceof IDB)) {
      throw Error('[IDB] An IDB instance should be passed to IDBProvider as `db` prop');
    }
    db.ping();
    return () => {
      db.db.close();
    };
  }, []);
  return React.createElement(
    IDBContext.Provider,
    { value: db },
    children,
  );
}
