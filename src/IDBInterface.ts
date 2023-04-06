import type {
  UpdateCallback, DataReceivingCallback,
  DataUpdateListener, UnregisterListener, UpdatedDataListener,
} from './IDBTypes.js'

export abstract class IDBInterface {
  /**
  * Flag to check is connection to database was closed due to versionchange event
  */
  public abstract readonly closedDueToVersionChange: boolean | void;

  /**
  * Access to raw database connection object. Use this for close database via yourDbVariable.db.close()
  */
  public abstract db: IDBDatabase;

  /**
   * Activate connection to database. This method automatically called internally, so no extra need to use it in user-land
   */
  public abstract ping(): void

  /**
  * Add or rewrite item in the store
  * @param store Name of database store
  * @param items Serializable object that IDB can store
  * @example {title: 'Book', author: 'Bob', data: new ArrayBuffer(32), pages: 12}
  */
  public abstract set<T>(store: string, items: T | T[]): Promise<boolean | boolean[]>;

  /**
  * Receive item from store by default store key
  * @param store Name of database store
  * @param keys Key value to access item in the store
  */
  public abstract get<T, K>(store: string, keys: K | K[]): Promise<T | void | (T | void)[]>

  /**
  * Convenient method for get, modify and set back item to the store
  * @param store Name of database store
  * @param keys Key value to access item in the store
  * @param updateCallbacks Async function that receives item and can directly modify them
  */
  public abstract update<T, K>(
    store: string, keys: K | K[], updateCallbacks: UpdateCallback<T> | UpdateCallback<T>[]
  ): Promise<T | T[]>

  /**
  * Receive all items from the store
  * @param store Name of database store
  * @param onData Sync function that calls every time when next item received
  */
  public abstract getAll<T>(
    store: string, onData?: DataReceivingCallback<T>
  ): Promise<T[]>

  /**
  * Delete item from store by store default key
  * @param store Name of database store
  * @param keys Key value to access item in the store
  */
  public abstract delete<K>(store: string, keys: K | K[]): Promise<void>

  /**
  * Delete all items from the store
  * @param store Name of database store
  */
  public abstract deleteAll(store: string): Promise<void>

  /**
  * Check for item with key exist or return how much items are in the store if no keys argument
  * @param store Name of database store
  * @param keys Key value to access item in store, if no key - return items amount in the store
  */
  public abstract has<K>(
    store: string, keys?: K | K[]
  ): Promise<boolean | boolean[] | number>

  /**
  * Set a listener to the store that calls every time some changes in the store happened
  * @param store Name of database store
  * @param listener Async function that calls every time when 'set', 'delete' and 'deleteAll' operations in the store happens
  */
  public abstract onDataUpdate<K>(
    store: string, listener: DataUpdateListener<K>
  ): Promise<UnregisterListener>

  /**
  * Set a listener that follow updates happened only with the selected items in store
  * @param store Name of database store
  * @param keys Key of item to follow / array of item keys to follow, if no - fallback to all store items / explicit { getAll: true } to follow all changes in store
  * @param listener Async function that calls every time when updates happened with selected items
  * @example // Follow one item:
  * db.followDataUpdates<ItemType, number>('store', 123, callback)
  * @example // Follow multiple items, if no keys array - follow all changes in store:
  * db.followDataUpdates<ItemType, number>('store', [123, 124], callback)
  * @example // Explicit follow all changes in store:
  * db.followDataUpdates<ItemType>('store', { getAll: true }, callback)
  */
  public abstract followDataUpdates<T, K>(
    store: string,
    keys: K | K[] | void,
    listener: UpdatedDataListener<T | void | (T | void)[]>
  ): Promise<UnregisterListener>
}
