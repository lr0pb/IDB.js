import {
  IDBListeners, IDBOptions, IDBMode, IDBAction, StoreDefinition,
  StoreContainment, UpdateCallback, DataReceivingCallback,
  DataUpdatedType, DataUpdatedCallback, UnregisterListener
} from './IDB.d.js'

export class IDB {
  private readonly _listeners: IDBListeners;
  private readonly _idb: IDBRequest;
  private _closedDueToVersionChange?: boolean;
  /**
   * @param db Access to raw idb object. Use this for close database via close() call on db
   */
  db!: IDBDatabase;
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
    this._idb = indexedDB.open(name, version);
    this._idb.addEventListener('upgradeneeded', () => this._upgradeneeded(objectStores));
    this._idb.addEventListener('success', () => this._success());
    return this;
  }
  private _upgradeneeded(objectStores: StoreDefinition[]): void {
    if (this._options.showLogs) console.log('[IDB] Database upgrading started');
    this.db = this._idb.result;
    const actualStores: StoreContainment = {};
    for (let store of objectStores) {
      if (!this.db.objectStoreNames.contains(store.name)) {
        this.db.createObjectStore(store.name, store.index);
      }
      actualStores[store.name] = true;
    };
    for (let storeName of this.db.objectStoreNames) {
      if (!actualStores[storeName]) this.db.deleteObjectStore(storeName);
    };
  }
  private _success(): void {
    if (this._options.showLogs) console.log('[IDB] Database successfully opened');
    this.db = this._idb.result;
    this.db.addEventListener('versionchange', () => this._versionchange());
  }
  private _versionchange(): void {
    this.db.close();
    this._closedDueToVersionChange = true;
    this._throwError(true, '[IDB] Database closed due to version change, reload page');
  }
  private async _isDbReady(): Promise<boolean> {
    if (this._closedDueToVersionChange) return false;
    if (!this.db) await new Promise((resolve: (value: void) => void): void => {
      const isComplete = (): void => {
        this.db ? resolve() : requestAnimationFrame(isComplete);
      }
      isComplete();
    });
    return true;
  }
  private _err(name: string, store?: string): string {
    return `[IDB] Error in db.${name}(${store || ' '}): `;
  }
  private _throwError(error: boolean, log: string): void {
    const method: Function = error ? console.error : console.warn;
    if (!error || (this._options.showErrorsAsLogs && error)) method(log);
    else throw new Error(log);
    return;
  }
  private _checkStore(name: string, store: string): boolean | void {
    if (!this.db.objectStoreNames.contains(store)) {
      return this._throwError(true, `${this._err(name)}database haven't "${store}" store`);
    }
    return true;
  }
  private async _dbCall(
    name: string,
    store: string,
    mode: IDBMode,
    action: IDBAction,
    actionArgument?: any,
    onSuccess?: Function
  ): Promise<any> {
    const isReady:boolean = await this._isDbReady();
    if (!isReady) return;
    if (!this._checkStore(name, store)) return;
    const tx: IDBTransaction = this.db.transaction(store, mode);
    const os: IDBObjectStore = tx.objectStore(store)
    const response: any[] = [];
    if (!Array.isArray(actionArgument)) {
      actionArgument = [actionArgument ?? null];
    }
    if (actionArgument && Array.isArray(actionArgument)) {
      for (const arg of actionArgument) {
        const actioner = os[action](arg);
        actioner.addEventListener('success', async () => {
          const result = actioner.result;
          if (!result) return;
          const itemResp = onSuccess ? await onSuccess(result) : result;
          if (itemResp !== undefined) response.push(itemResp);
        });
      }
    }
    return new Promise((resolve: (value: any) => void) => {
      tx.addEventListener('complete', async () => {
        resolve(response.length == 1 ? response[0] : response);
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
  public async set<Type>(store: string, items: Type[]): Promise<boolean[] | void>;
  public async set<Type>(
    store: string, items: Type | Type[]
  ): Promise<boolean | boolean[] | void> {
    const resp: boolean[] | void = await this._dbCall(
      'setItem', store, 'readwrite', 'put', items,
      async (item: Type) => {
        await this._onDataUpdateCall(store, 'setItem', item);
        return true; // TODO: If QuotaExceedError happened, catch it and return false;
      }
    );
    return resp?.length == 1 ? resp[0] : resp;
  }
/**
* Receive item from store by default store key
* @param store Name of database store
* @param itemKeys Key value to access item in store
*/
  public async get<Type, Key>(store: string, itemKeys: Key): Promise<Type | void>
  public async get<Type, Key>(store: string, itemKeys: Key[]): Promise<Type[] | void>
  public async get<Type, Key>(
    store: string, itemKeys: Key | Key[]
  ): Promise<Type | Type[] | void> {
    const items: Type[] | void = await this._dbCall(
      'getItem', store, 'readonly', 'get', itemKeys
    );
    return items?.length === 1 ? items[0] : items;
  }
/**
* Sugar for getting, modifying and setting item back to the store
* @param store Name of database store
* @param itemKeys Key value to access item in store
* @param updateCallbacks Async function that receives item and can directly modify them
*/
  public async update<Type, Key>(
    store: string, itemKeys: Key, updateCallbacks: UpdateCallback
  ): Promise<Type | void>
  public async update<Type, Key>(
    store: string, itemKeys: Key[], updateCallbacks: UpdateCallback
  ): Promise<Type[] | void>
  public async update<Type, Key>(
    store: string, itemKeys: Key[], updateCallbacks: UpdateCallback[]
  ): Promise<Type[] | void>
  public async update<Type, Key>(
    store: string,
    itemKeys: Key | Key[],
    updateCallbacks: UpdateCallback | UpdateCallback[]
  ): Promise<Type | Type[] | void> {
    if (!Array.isArray(itemKeys)) itemKeys = [itemKeys];
    if (!Array.isArray(updateCallbacks)) updateCallbacks = [updateCallbacks];
    const base = this._err('update', store);
    if (
      updateCallbacks.length !== 1
      && itemKeys.length !== updateCallbacks.length
    ) return this._throwError(
      true, `${base}UpdateCallbacks length should be the same as itemKeys or should be only one UpdateCallback`
    );
    let items: Type | Type[] | void = await this.get<Type, Key>(store, itemKeys);
    if (!items) return;
    if (!Array.isArray(items)) items = [items];
    if (!items.length || items.length !== itemKeys.length) return this._throwError(
      true, `${base}Cannot update items with given keys, because not all items exist`
    );
    for (let i = 0; i < items.length; i++) {
      await updateCallbacks[updateCallbacks.length == 1 ? 0 : i](items[i]);
    }
    await this.set<Type>(store, items);
    return items.length == 1 ? items[0] : items;
  }
/**
* Receive all items from the store
* @param store Name of database store
* @param onData Sync function that calls every time when next item is received
*/
  public async getAll<Type>(
    store: string, onData?: DataReceivingCallback
  ): Promise<Type[] | void> {
    let index = 0;
    const items: Type[] | void = await this._dbCall(
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
    return items;
  }
/**
* Delete item from store by store default key
* @param store Name of database store
* @param itemKeys Key value to access item in store
*/
  public async delete<Key>(store: string, itemKeys: Key | Key[]): Promise<void> {
    await this._dbCall(
      'deleteItem', store, 'readwrite', 'delete', itemKeys,
      async () => { await this._onDataUpdateCall(store, 'deleteItem'); }
    );
  }
/**
* Delete several or all items from the store
* @param store Name of database store
*/
  public async deleteAll(store: string): Promise<void> {
    await this._dbCall(
      'deleteAll', store, 'readwrite', 'clear', null,
      async () => { await this._onDataUpdateCall(store, 'deleteAll'); }
    );
  }
/**
* Check for item with key exist or count how much items are in the store
* @param store Name of database store
* @param itemKeys Key value to access item in store, if no key - return items amount in the store
*/
  public async has<Type>(store: string, itemKeys: Type): Promise<boolean | void>
  public async has<Type>(store: string, itemKeys: Type[]): Promise<boolean[] | void>
  public async has(store: string): Promise<number | void>
  public async has<Type>(store: string, itemKeys?: Type): Promise<boolean | boolean[] | number | void> {
    let resp: Array<number | void> | number | void = await this._dbCall(
      'hasItem', store, 'readonly', 'count', itemKeys
    );
    if (!itemKeys) {
      return typeof resp == 'number' ? resp : 0;
    } else {
      if (!Array.isArray(resp)) resp = [resp];
      const booleanResp = [];
      for (const value of resp) {
        booleanResp.push(value === 1 ? true : false);
      }
      return booleanResp.length == 1 ? booleanResp[0] : booleanResp;
    }
  }
/**
* Set a listener to the store that calls every time some changes in the store happened
* @param store Name of database store
* @param callback Async function that calls every time when some item in the store modified
*/
  public async onDataUpdate(
    store: string, callback: DataUpdatedCallback
  ): Promise<UnregisterListener | void> {
    const isReady: boolean = await this._isDbReady();
    if (!isReady) return;
    if (!this._checkStore('onDataUpdate', store)) return;
    if (!(store in this._listeners)) this._listeners[store] = {};
    const hash: number = Date.now();
    this._listeners[store][hash] = callback;
    return (): void => {
      delete this._listeners[store][hash];
    };
  }
};
