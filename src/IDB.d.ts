export interface IDBListeners {
  [store: string]: {
    [hash: number]: DataUpdatedCallback
  }
}

export interface StoreDefinition {
  name: string,
  index: IDBObjectStoreParameters
}

export interface IDBOptions {
  [inxed: string]: boolean | undefined,
  showLogs?: boolean,
  showErrorsAsLogs?: boolean
}

export interface StoreContainment {
  [name: string]: boolean
}

export type IDBMode = 'readonly' | 'readwrite';

export type IDBAction = 'put' | 'get' | 'openCursor' | 'delete' | 'clear' | 'count';

export type UpdateCallback = (item: any) => Promise<void>;

export interface IDBUpdateOptions {
  useOneCallback?: boolean
}

export type DataReceivingCallback = (item: any, index: number) => void;

export type DataUpdatedType = 'setItem' | 'setAll' | 'deleteItem' | 'deleteAll';

export interface DataUpdatedInfo {
  store: string,
  type: DataUpdatedType,
  item?: any
}

export type DataUpdatedCallback = (info: DataUpdatedInfo) => Promise<void>;

export type UnregisterListener = () => void;
