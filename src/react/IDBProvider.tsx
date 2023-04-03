import * as React from 'react';
import { IDB } from '../IDB.js';

export const IDBContext = React.createContext<IDB | void>(undefined);

interface IDBProviderProps {
  /**
   * Your IDB database instance
   */
  db: IDB,
  children?: React.ReactNode | React.ReactNode[],
}

/**
 * Top container component for your app. Provides context with your IDB database to nested components
 */
export const IDBProvider: React.FC<IDBProviderProps> = ({
  db, children
}) => {
  return React.createElement(
    IDBContext.Provider,
    { value: db },
    children,
  );
}
