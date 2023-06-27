import * as React from 'react';
import { IDB } from '../IDB.js';
import type { IDBOptions, IDBParams } from '../IDBTypes.js';

export const IDBContext = React.createContext<IDB | void>(undefined);

interface IDBProviderProps extends Partial<IDBParams> {
  /**
   * IDB database instance
   */
  db?: IDB;
  children?: React.ReactNode;
  options?: IDBOptions;
}

export function IDBProvider({
  children,
  db,
}: Required<Pick<IDBProviderProps, 'children' | 'db'>>): React.ReactElement;

export function IDBProvider({
  children,
  name,
  version,
  stores,
  options,
}: Required<Omit<IDBProviderProps, 'db'>>): React.ReactElement;
/**
 * Top container component that pass context with IDB instance
 * down to the components tree so children components can use IDB
 */
export function IDBProvider({
  db,
  children,
  name,
  version,
  stores,
  options,
}: IDBProviderProps) {
  db = React.useMemo<IDB>(() => {
    return name && version && stores
      ? new IDB(name, version, stores, options)
      : db!;
  }, [name, version]);
  React.useEffect(() => {
    if (!db || !(db instanceof IDB)) {
      throw Error(
        '[IDB] An IDB instance should be passed to IDBProvider as `db` prop ' +
          'or by separated `name`, `version` and `stores` props for IDB'
      );
    }
    db.ping();
    return () => {
      db?.db.close();
    };
  }, []);
  return React.createElement(IDBContext.Provider, { value: db }, children);
}
