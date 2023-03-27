import type {
  IDBOptions, IDBAction, StoreDefinition,
  StoreContainment, UpdateCallback, DataReceivingCallback,
  DataUpdateType, DataUpdateListener, UnregisterListener,
  UpdatedDataListener,
} from './IDBTypes.js'

export class IDB {
  /**
   * Storage for listeners setted with `db.onDataUpdate` method
   */
  private readonly _listeners: Record<string, Record<number, DataUpdateListener<any>>>;
  /**
   * IDB open request object https://w3c.github.io/IndexedDB/#open-requests
   */
  private readonly _openRequest: IDBRequest;
  /**
   * Flag to check is connection to database was closed due to versionchange event
   */
  private _closedDueToVersionChange?: boolean;
  /**
   * Access to raw database connection object. Use this for close database via yourDbVariable.db.close()
   */
  db!: IDBDatabase;
  /**
   * Storage for options passed to new IDB()
   */
  private readonly _options: IDBOptions;
/**
* Create database and return its wrapper
* @param name Database name
* @param version Database version
* @param objectStores Object stores that will create and update with database version change
* @param options Options for IDB object
*/
  constructor(
    name: string,
    version: number,
    objectStores: StoreDefinition[],
    options: IDBOptions = {}
  ) {
    this._options = options;
    this._listeners = {};
    this._openRequest = indexedDB.open(name, version);
    this._openRequest.addEventListener('upgradeneeded', () => this._upgradeneeded(objectStores));
    this._openRequest.addEventListener('success', () => this._success());
    return this;
  }

  private _upgradeneeded(objectStores: StoreDefinition[]): void {
    if (this._options.showLogs) {
      console.log('[IDB] Database upgrading started');
    }
    this.db = this._openRequest.result;
    const actualStores: StoreContainment = {};
    for (let store of objectStores) {
      if (!this.db.objectStoreNames.contains(store.name)) {
        this.db.createObjectStore(store.name, store.index);
      }
      actualStores[store.name] = true;
    };
    for (let storeName of this.db.objectStoreNames) {
      if (!actualStores[storeName]) {
        this.db.deleteObjectStore(storeName);
      }
    };
  }

  private _success(): void {
    if (this._options.showLogs) {
      console.log('[IDB] Database successfully opened');
    }
    this.db = this._openRequest.result;
    this.db.addEventListener('versionchange', () => this._versionchange());
  }

  private _versionchange(): void {
    this.db.close();
    this._closedDueToVersionChange = true;
    throw new Error(
      '[IDB] Database closed due to versionchange event, reload page'
    );
  }

  private async _isDbReady(): Promise<boolean> {
    if (this._closedDueToVersionChange) {
      throw new Error(
        '[IDB] Cannot access database due to versionchange earlier happened'
      );
    }
    if (!this.db) {
      await new Promise((resolve: (value: void) => void): void => {
        const isComplete = (): void => {
          this.db ? resolve() : requestAnimationFrame(isComplete);
        }
        isComplete();
      });
    }
    return true;
  }

  private _err(name: string, store?: string): string {
    return `[IDB] Error in db.${name}(${store || ' '}): `;
  }

  private _checkStore(name: string, store: string): boolean {
    if (!this.db.objectStoreNames.contains(store)) {
      throw new Error(
        `${this._err(name, store)}database haven't "${store}" store`
      );
    }
    return true;
  }

  private async _dbCall(
    name: string,
    store: string,
    mode: IDBTransactionMode,
    action: IDBAction,
    actionArgument?: any,
    onSuccess?: Function
  ): Promise<any> {
    await this._isDbReady();
    this._checkStore(name, store);

    const tx: IDBTransaction = this.db.transaction(store, mode);
    const os: IDBObjectStore = tx.objectStore(store);
    const response: any[] = [];
    if (!Array.isArray(actionArgument)) {
      actionArgument = [actionArgument ?? null];
    }
    if (actionArgument && Array.isArray(actionArgument)) {
      for (const arg of actionArgument) {
        const actioner: IDBRequest = os[action](arg);
        actioner.addEventListener('success', async () => {
          const result = actioner.result;
          if (!result && !['delete', 'clear'].includes(action)) {
            return response.push(undefined);
          }
          const actionResponse = onSuccess ? await onSuccess(result) : result;
          if (actionResponse !== undefined) {
            response.push(actionResponse);
          }
        });
      }
    }
    return new Promise((resolve: (value: any) => void) => {
      tx.addEventListener('complete', async () => {
        resolve(response.length === 1 ? response[0] : response);
      });
    });
  }

  private async _emitDataUpdateListeners<K>(
    store: string, type: DataUpdateType, keys: K[], item?: any
  ): Promise<void> {
    if (!(store in this._listeners)) return;
    for (let hash in this._listeners[store]) {
      await this._listeners[store][hash]({
        store, type, keys, item
      });
    }
  }

/**
* Add or rewrite item in the store
* @param store Name of database store
* @param items Serializable object that IDB can store
* @example {title: 'Book', author: 'Bob', data: new ArrayBuffer(32), pages: 12}
*/
  public async set<T>(store: string, items: T): Promise<boolean>;
  public async set<T>(store: string, items: T[]): Promise<boolean[]>;
  public async set<T>(store: string, items: T | T[]): Promise<boolean | boolean[]>;
  public async set<T>(
    store: string, items: T | T[]
  ): Promise<boolean | boolean[]> {
    const updatedKeys: any[] = [];
    const resp: boolean[] = await this._dbCall(
      'setItem', store, 'readwrite', 'put', items,
      async (key: any) => {
        updatedKeys.push(key);
        return true; // TODO: If QuotaExceedError happened, catch it and return false;
      }
    );
    this._emitDataUpdateListeners(store, 'set', updatedKeys, updatedKeys);
    return resp?.length == 1 ? resp[0] : resp;
  }

/**
* Receive item from store by default store key
* @param store Name of database store
* @param keys Key value to access item in the store
*/
  public async get<T, K>(store: string, keys: K): Promise<T | void>
  public async get<T, K>(store: string, keys: K[]): Promise<(T | void)[]>
  public async get<T, K>(store: string, keys: K | K[]): Promise<T | void | (T | void)[]>
  public async get<T, K>(
    store: string, keys: K | K[]
  ): Promise<T | void | (T | void)[]> {
    const items: T[] = await this._dbCall(
      'getItem', store, 'readonly', 'get', keys
    );
    if (Array.isArray(keys) && !Array.isArray(items)) {
      return [items];
    }
    return items?.length === 1 ? items[0] : items;
  }

/**
* Convenient method for get, modify and set back item to the store
* @param store Name of database store
* @param keys Key value to access item in the store
* @param updateCallbacks Async function that receives item and can directly modify them
*/
  public async update<T, K>(
    store: string, keys: K, updateCallbacks: UpdateCallback
  ): Promise<T>
  
  public async update<T, K>(
    store: string, keys: K[], updateCallbacks: UpdateCallback
  ): Promise<T[]>

  public async update<T, K>(
    store: string, keys: K[], updateCallbacks: UpdateCallback[]
  ): Promise<T[]>

  public async update<T, K>(
    store: string, keys: K | K[], updateCallbacks: UpdateCallback | UpdateCallback[]
  ): Promise<T[]>

  public async update<T, K>(
    store: string,
    keys: K | K[],
    updateCallbacks: UpdateCallback | UpdateCallback[]
  ): Promise<T | T[]> {
    if (!Array.isArray(keys)) keys = [keys];
    if (!Array.isArray(updateCallbacks)) updateCallbacks = [updateCallbacks];
    const base = this._err('update', store);
    if (
      updateCallbacks.length !== 1
      && keys.length !== updateCallbacks.length
    ) {
      throw new Error(
        `${base}UpdateCallbacks length should be the same as keys length or should be only one UpdateCallback`
      );
    }
    const items: (T | void)[] = await this.get<T, K>(store, keys);
    const verifiedItems: T[] = [];
    items.forEach((item, i) => {
      if (item === undefined) {
        const errKey = Array.isArray(keys) && keys[i];
        throw new Error(
          `${base}Cannot update items with given keys, because not all items exist: key \`${errKey}\``
        );
      } else {
        verifiedItems.push(item);
      }
    })
    for (let i = 0; i < verifiedItems.length; i++) {
      await updateCallbacks[updateCallbacks.length == 1 ? 0 : i](
        verifiedItems[i]
      );
    }
    await this.set<T>(store, verifiedItems);
    return verifiedItems.length == 1 ? verifiedItems[0] : verifiedItems;
  }

/**
* Receive all items from the store
* @param store Name of database store
* @param onData Sync function that calls every time when next item received
*/
  public async getAll<T>(
    store: string, onData?: DataReceivingCallback
  ): Promise<T[]> {
    let index = 0;
    let items: T[] = await this._dbCall(
      'getAll', store, 'readonly', 'openCursor', null,
      (result: IDBCursorWithValue): T | void => {
        if (!result) return;
        const value: T = result.value;
        if (onData) onData(value, index);
        index++;
        result.continue();
        return value;
      }
    );
    if (Array.isArray(items)) {
      items.pop();
    } else items = [];
    return items;
  }

/**
* Delete item from store by store default key
* @param store Name of database store
* @param keys Key value to access item in the store
*/
  public async delete<K>(store: string, keys: K | K[]): Promise<void> {
    await this._dbCall(
      'deleteItem', store, 'readwrite', 'delete', keys
    );
    if (!Array.isArray(keys)) keys = [keys];
    this._emitDataUpdateListeners<K>(store, 'delete', keys);
  }

/**
* Delete all items from the store
* @param store Name of database store
*/
  public async deleteAll(store: string): Promise<void> {
    await this._dbCall(
      'deleteAll', store, 'readwrite', 'clear', null
    );
    this._emitDataUpdateListeners(store, 'deleteAll', []);
  }

/**
* Check for item with key exist or return how much items are in the store if no keys argument
* @param store Name of database store
* @param keys Key value to access item in store, if no key - return items amount in the store
*/
  public async has<K>(store: string, keys: K): Promise<boolean>
  public async has<K>(store: string, keys: K[]): Promise<boolean[]>
  public async has<K>(store: string, keys: K | K[]): Promise<boolean | boolean[]>
  public async has(store: string): Promise<number>
  public async has<K>(
    store: string, keys?: K
  ): Promise<boolean | boolean[] | number> {
    let resp: (number | void)[] | number = await this._dbCall(
      'hasItem', store, 'readonly', 'count', keys
    );
    if (!keys) {
      return typeof resp == 'number' ? resp : 0;
    } else {
      if (!Array.isArray(resp)) resp = [resp];
      const finalResp = [];
      for (const value of resp) {
        finalResp.push(value === 1 ? true : false);
      }
      return finalResp.length == 1 ? finalResp[0] : finalResp;
    }
  }

/**
* Set a listener to the store that calls every time some changes in the store happened
* @param store Name of database store
* @param listener Async function that calls every time when 'set', 'delete' and 'deleteAll' operations in the store happens
*/
  public async onDataUpdate<K>(
    store: string, listener: DataUpdateListener<K>
  ): Promise<UnregisterListener> {
    await this._isDbReady();
    this._checkStore('onDataUpdate', store);
    if (!(store in this._listeners)) {
      this._listeners[store] = {};
    }
    const hash = Date.now();
    this._listeners[store][hash] = listener;
    return () => {
      delete this._listeners[store][hash];
    };
  }

/**
* Set a listener that follow updates happened only with the selected items in store
* @param store Name of database store
* @param keys Key of item to follow / array of item keys to follow, if no - fallback to all store items / explicit { getAll: true } to follow all changes in store
* @param listener Async function that calls every time when updates happened with selected items
* @example `Follow one item:`
* db.followDataUpdates<ItemType, number>('store', 123, callback)
* @example `Follow multiple items:`
* db.followDataUpdates<ItemType, number>('store', [123, 124], callback)
* `if no keys array presented - fallback to follow all changes in store`
* @example `Explicit follow all changes in store:`
* db.followDataUpdates<ItemType>('store', { getAll: true }, callback)
*/
  public async followDataUpdates<T, K>(
    store: string,
    keys: K,
    listener: UpdatedDataListener<T | void>
  ): Promise<UnregisterListener>

  public async followDataUpdates<T, K>(
    store: string,
    keys: K[] | void,
    listener: UpdatedDataListener<(T | void)[]>
  ): Promise<UnregisterListener>

  public async followDataUpdates<T>(
    store: string,
    keys: { getAll: true },
    listener: UpdatedDataListener<T[]>
  ): Promise<UnregisterListener>

  public async followDataUpdates<T, K>(
    store: string,
    keys: K | K[] | void,
    listener: UpdatedDataListener<T | void | (T | void)[]>
  ): Promise<UnregisterListener> {
    await this._isDbReady();
    this._checkStore('followDataUpdates', store);
    const unregister = await this.onDataUpdate<K>(store, async ({
      type, keys: updatedKeys
    }) => {
      const getAll = !keys ||
        (typeof keys === 'object' && !Array.isArray(keys) &&
        'getAll' in keys && keys.getAll === true);
      if (type === 'deleteAll') {
        return listener(getAll || Array.isArray(keys) ? [] : undefined);
      }
      if (getAll) {
        const resp = await this.getAll<T>(store);
        return listener(resp);
      }
      const keysArray: K[] = !Array.isArray(keys) ? [keys] : keys;
      for (const key of keysArray) {
        if (updatedKeys.includes(key)) {
          const resp = await this.get<T, K>(store, keys);
          return listener(resp);
        }
      }
    });
    return unregister;
  }
};
