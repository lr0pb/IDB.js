import * as React from 'react';
import { IDB } from './IDB.js';

export const IDBContext = React.createContext<IDB | void>(undefined);

interface IDBProviderProps {
  db: IDB,
  children?: React.ReactNode
}

export const IDBProvider: React.FC<IDBProviderProps> = ({
  db, children
}) => {
  return (
    <IDBContext.Provider value={db}>
      {children}
    </IDBContext.Provider>
  );
}

export const useIDB = () => {
  return React.useContext(IDBContext);
};

interface DataLinkerArgs<Key> {
  key?: Key,
  keys?: Key[],
  getAll?: boolean,
  //doNotLoadData?: boolean,
}

export function useDataLinker<Type, Key>(store: string, {
  key//, doNotLoadData
}: DataLinkerArgs<Key>): Type | (Type | void)[] | void;

export function useDataLinker<Type, Key>(store: string, {
  keys//, doNotLoadData
}: DataLinkerArgs<Key>): Type | (Type | void)[] | void;

export function useDataLinker<Type, Key>(store: string, {
  getAll//, doNotLoadData
}: DataLinkerArgs<{}>): Type | (Type | void)[] | void;

export function useDataLinker<Type>(store: string, {
  keys, getAll//, doNotLoadData
}: DataLinkerArgs<{}>): Type | (Type | void)[] | void;

export function useDataLinker<Type, Key>(store: string, {
  key, keys, getAll//, doNotLoadData = false
}: DataLinkerArgs<Key>): Type | (Type | void)[] | void
{
  const isArrayResponse = keys || getAll;
  const db = useIDB();
  const [data, setter] = React.useState(
    (isArrayResponse ? [] : {}) as Type | (Type | void)[] | void
  );
  React.useEffect(() => {
    if (!db) return;
    //if (doNotLoadData) return;
    async function getData() {
      if (!db) return;
      let resp: Type | (Type | void)[] | void;
      if (key !== undefined) {
        resp = await db.get<Type, Key>(store, key);
      } else if (keys !== undefined) {
        resp = await db.get<Type, Key>(store, keys);
      } else if (getAll) {
        resp = await db.getAll<Type>(store);
      }
      setter(resp);
    }
    getData();
    const unregisterPromise = db.onDataUpdate(store, async ({type, item}) => {
      if (type === 'deleteAll') {
        return setter(undefined);
      }
      /*const isSet = () => type === 'set';
      const isKeyUpdate = async () => {
        if (key === undefined) return false;
        if (isSet() && item === key) return true;
        const isItemExist = await db.has<Key>(store, key);
      };*/
      if (key !== undefined && type === 'set' && item !== key) return;
      else if (keys !== undefined && type === 'set' && !keys.includes(item)) return;
      await getData();
    });
    return () => {
      unregisterPromise.then((unregister) => {
        if (unregister) unregister();
      });
    };
  }, []);
  return data;
}
