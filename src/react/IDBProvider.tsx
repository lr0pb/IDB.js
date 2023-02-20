import * as React from 'react';
import { IDB } from '../IDB.js';

const IDBContext = React.createContext<IDB>(IDB.prototype);

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

export function useIDB(): IDB {
  return React.useContext(IDBContext);
};
