import * as React from 'react';
import { IDB } from '../IDB.js';

export const IDBContext = React.createContext<IDB>(IDB.prototype);

export interface IDBProviderProps {
  /**
   * Your IDB database instance
   */
  db: IDB,
  children?: React.ReactNode
}

/**
 * Top container component for your app. It provides context with your IDB database
 */
export const IDBProvider: React.FC<IDBProviderProps> = ({
  db, children
}) => {
  return (
    <IDBContext.Provider value={db}>
      {children}
    </IDBContext.Provider>
  );
}

/**
 * Hook to get your database inside React component
 * @returns Your IDB database instance
 */
export function useIDB(): IDB {
  return React.useContext(IDBContext);
}
