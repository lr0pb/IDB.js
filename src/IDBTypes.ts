export interface IDBParams {
  name: string,
  version: number,
  stores: StoreDefinition[],
}
/**
 * Arguments for IDB constructor
 */
export type IDBArguments = [
  name: string,
  version: number,
  stores: StoreDefinition[],
  options?: IDBOptions,
];
/**
 * Description of store that will be created alongside with database
 */
export interface StoreDefinition {
  /**
   * Name of store
   */
  name: string,
  /**
   * Indexing method for items in this store. For expample via some key or by auto incrementing new number key to every new item
   */
  index: IDBObjectStoreParameters
}
/**
 * Additional options for IDB class instance
 */
export interface IDBOptions {
  /**
   * Show additional technical logs e.g. when database is ready to use
   */
  showLogs?: boolean,
}
/**
 * Internal interface for checking that store is exist in database
 */
export type StoreContainment = Record<string, boolean>
/**
 * Internal type for define which methods can be called on transaction's store object
 */
export type IDBAction =
  | 'put'
  | 'get'
  | 'openCursor'
  | 'delete'
  | 'clear'
  | 'count';
/**
 * Function that call as callback in `db.update` for modifying item, should modify item object directly, without returning them
 * @param item Store's item to update
 */
export type UpdateCallback<T> = (item: T) => Promise<void>;
/**
 * Function that call as callback in `db.getAll` for do some actions with received item. Should be ONLY **sync**
 * @param item Item that received from the store
 * @param index Item's position in the store (not confuse with key)
 */
export type DataReceivingCallback<T> = (item: T, index: number) => void;
/**
 * Type of action that trigger data update listener call
 */
export type DataUpdateType =
  | 'set'
  | 'delete'
  | 'deleteAll';
/**
 * Options passed to `StoreUpdatesListener` for `db.onDataUpdate` method
 */
export interface DataUpdateInfo<K> {
  /**
   * Name of store in that changes was happened
   */
  store: string,
  /**
   * Name of action that trigger this changes
   */
  type: DataUpdateType,
  /**
   * If `type` is `set` provide key of item that was setted/updated in the store
   * @deprecated Use `key` property instead. In few minor releases `item` will be deleted
   */
  item?: any,
  /**
   * Keys of items that was updated in the store, empty array if its `deleteAll` type
   */
  keys: K[],
}
/**
 * Listener that calls when some changes with data was happened in the store
 */
export type DataUpdateListener<K> = (info: DataUpdateInfo<K>) => Promise<void> | void;
/**
 * Function to uregister `onDataUpdate` listener from the store
 */
export type UnregisterListener = () => void;

/**
 * Listener that calls when updates happened with selected items
 */
export type UpdatedDataListener<R> = (items: R) => Promise<void> | void;
