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
   * Show additional technical log e.g. when database is ready to use
   */
  showLogs?: boolean,
}
/**
 * Internal interface for checking that store is exist in database
 */
export interface StoreContainment {
  [name: string]: boolean
}
/**
 * Internal type for define which methods can be called on transaction's store object
 */
export type IDBAction = 'put' | 'get' | 'openCursor' | 'delete' | 'clear' | 'count';
/**
 * Function that call as callback in `db.update` for modifying item, should modify item object directly, without returning them
 * @param item Store's item to update
 */
export type UpdateCallback = (item: any) => Promise<void>;
/**
 * Function that call as callback in `db.getAll` for do some actions with received item. Should be ONLY **sync**
 * @param item Item that received from the store
 * @param index Item's position in the store (not confuse with key)
 */
export type DataReceivingCallback = (item: any, index: number) => void;
/**
 * Type of action that trigger data update listener call
 */
export type DataUpdatedType = 'set' | 'delete' | 'deleteAll';
/**
 * Options passed to `StoreUpdatesListener` for `db.onDataUpdate` method
 */
export interface DataUpdatedInfo {
  /**
   * Name of store in that changes was happened
   */
  store: string,
  /**
   * Name of action that trigger this changes
   */
  type: DataUpdatedType,
  /**
   * If `type` is `set` provide key of item that was setted/updated in the store
   * @deprecated This field will change its name to `key` in next minor release
   */
  item?: any
}
/**
 * Listener that calls when some changes with data was happened in the store
 */
export type StoreUpdatesListener = (info: DataUpdatedInfo) => Promise<void> | void;
/**
 * Function to uregister `onDataUpdate` listener from the store
 */
export type UnregisterListener = () => void;
