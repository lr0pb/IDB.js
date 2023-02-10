import {
  IDBListeners, IDBOptions, IDBAction, StoreDefinition,
  StoreContainment, UpdateCallback, DataReceivingCallback,
  DataUpdatedType, DataUpdatedCallback, UnregisterListener
} from './IDB.types.js'

export class IDB {
  /**
   * Storage for listeners setted with `db.onDataUpdate` method
   */
  private readonly _listeners: IDBListeners;
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
    this._throwError(
      true, '[IDB] Database closed due to version change, reload page'
    );
  }
  private async _isDbReady(): Promise<boolean> {
    if (this._closedDueToVersionChange) {
      return false;
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
  private _throwError(error: boolean, log: string): void {
    const method: Function = error ? console.error : console.warn;
    if (!error || (this._options.showErrorsAsLogs && error)) {
      method(log);
    } else {
      throw new Error(log);
    }
    return;
  }
  private _checkStore(name: string, store: string): boolean | void {
    if (!this.db.objectStoreNames.contains(store)) {
      return this._throwError(
        true, `${this._err(name)}database haven't "${store}" store`
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
    const isReady:boolean = await this._isDbReady();
    if (!isReady) {
      return;
    }
    if (!this._checkStore(name, store)) {
      return;
    }
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
  private async _onDataUpdateCall(
    store: string, type: DataUpdatedType, item?: any
  ): Promise<void> {
    if (!(store in this._listeners)) return;
    for (let hash in this._listeners[store]) {
      await this._listeners[store][hash]({store, type, item});
    }
  }
/**
* Add or update item in the store
* @param store Name of database store
* @param items Serializable object that IDB can store
* @example {title: 'Book', author: 'Bob', data: new ArrayBuffer(32), pages: 12}
*/
  public async set<Type>(store: string, items: Type): Promise<boolean | void>;
  public async set<Type>(store: string, items: Type[]): Promise<boolean[] | void[]>;
  public async set<Type>(
    store: string, items: Type | Type[]
  ): Promise<boolean | boolean[] | void | void[]> {
    const resp: boolean[] | void = await this._dbCall(
      'setItem', store, 'readwrite', 'put', items,
      async (item: Type) => {
        await this._onDataUpdateCall(store, 'set', item);
        return true; // TODO: If QuotaExceedError happened, catch it and return false;
      }
    );
    return resp?.length == 1 ? resp[0] : resp;
  }
/**
* Receive item from store by default store key
* @param store Name of database store
* @param keys Key value to access item in store
*/
  public async get<Type, Key>(store: string, keys: Key): Promise<Type | void>
  public async get<Type, Key>(store: string, keys: Key[]): Promise<(Type | void)[]>
  public async get<Type, Key>(
    store: string, keys: Key | Key[]
  ): Promise<Type | void | (Type | void)[]> {
    const items: Type[] | void = await this._dbCall(
      'getItem', store, 'readonly', 'get', keys
    );
    if (Array.isArray(keys) && !Array.isArray(items)) {
      return [items];
    }
    return items?.length === 1 ? items[0] : items;
  }
/**
* Sugar method for getting, modifying and setting back item to the store
* @param store Name of database store
* @param keys Key value to access item in store
* @param updateCallbacks Async function that receives item and can directly modify them
*/
  public async update<Type, Key>(
    store: string, keys: Key, updateCallbacks: UpdateCallback
  ): Promise<Type | void>
  
  public async update<Type, Key>(
    store: string, keys: Key[], updateCallbacks: UpdateCallback
  ): Promise<Type[] | void>

  public async update<Type, Key>(
    store: string, keys: Key[], updateCallbacks: UpdateCallback[]
  ): Promise<Type[] | void>

  public async update<Type, Key>(
    store: string,
    keys: Key | Key[],
    updateCallbacks: UpdateCallback | UpdateCallback[]
  ): Promise<Type | Type[] | void> {
    if (!Array.isArray(keys)) keys = [keys];
    if (!Array.isArray(updateCallbacks)) updateCallbacks = [updateCallbacks];
    const base = this._err('update', store);
    if (
      updateCallbacks.length !== 1
      && keys.length !== updateCallbacks.length
    ) return this._throwError(
      true, `${base}UpdateCallbacks length should be the same as keys or should be only one UpdateCallback`
    );
    const items: (Type | void)[] | void = await this.get<Type, Key>(store, keys);
    if (!items) return;
    const verifiedItems: Type[] = [];
    for (const item of items) {
      if (item === undefined) {
        return this._throwError(
          true, `${base}Cannot update items with given keys, because not all items exist`
        );
      } else {
        verifiedItems.push(item);
      }
    }
    for (let i = 0; i < verifiedItems.length; i++) {
      await updateCallbacks[updateCallbacks.length == 1 ? 0 : i](
        verifiedItems[i]
      );
    }
    await this.set<Type>(store, verifiedItems);
    return verifiedItems.length == 1 ? verifiedItems[0] : verifiedItems;
  }
/**
* Receive all items from the store
* @param store Name of database store
* @param onData Sync function that calls every time when next item received
*/
  public async getAll<Type>(
    store: string, onData?: DataReceivingCallback
  ): Promise<Type[]> {
    let index = 0;
    let items: Type[] | void = await this._dbCall(
      'getAll', store, 'readonly', 'openCursor', null,
      (result: IDBCursorWithValue): Type | void => {
        if (!result) return;
        const value: Type = result.value;
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
* @param keys Key value to access item in store
*/
  public async delete<Key>(store: string, keys: Key | Key[]): Promise<void> {
    await this._dbCall(
      'deleteItem', store, 'readwrite', 'delete', keys,
      async () => {
        await this._onDataUpdateCall(store, 'delete');
      }
    );
  }
/**
* Delete all items from the store
* @param store Name of database store
*/
  public async deleteAll(store: string): Promise<void> {
    await this._dbCall(
      'deleteAll', store, 'readwrite', 'clear', null,
      async () => {
        await this._onDataUpdateCall(store, 'deleteAll');
      }
    );
  }
/**
* Check for item with key exist or return how much items are in the store if no keys argument
* @param store Name of database store
* @param keys Key value to access item in store, if no key - return items amount in the store
*/
  public async has<Key>(store: string, keys: Key): Promise<boolean | void>
  public async has<Key>(store: string, keys: Key[]): Promise<boolean[] | void>
  public async has(store: string): Promise<number | void>
  public async has<Key>(store: string, keys?: Key): Promise<boolean | boolean[] | number | void> {
    let resp: (number | void)[] | number | void = await this._dbCall(
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
* @param callback Async function that calls every time when 'set', 'delete' and 'deleteAll' operations in the store happens
*/
  public async onDataUpdate(
    store: string, callback: DataUpdatedCallback
  ): Promise<UnregisterListener | void> {
    const isReady = await this._isDbReady();
    if (!isReady) return;
    if (!this._checkStore('onDataUpdate', store)) return;
    if (!(store in this._listeners)) this._listeners[store] = {};
    const hash = Date.now();
    this._listeners[store][hash] = callback;
    return (): void => {
      delete this._listeners[store][hash];
    };
  }
};
