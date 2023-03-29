import type {
  IDBOptions, IDBAction, StoreDefinition,
  StoreContainment, UpdateCallback, DataReceivingCallback,
  DataUpdateType, DataUpdateListener, UnregisterListener,
  UpdatedDataListener,
} from './IDBTypes.js'
import type { IDBInterface } from './IDBInterface.js'
import { checkStore, IDBError } from './decorators/checkStore.js'

export class IDB implements IDBInterface {
  // Storage for listeners setted with `db.onDataUpdate` method
  private readonly _listeners: Record<string, Record<number, DataUpdateListener<any>>>;
  // IDB open request object https://w3c.github.io/IndexedDB/#open-requests
  private readonly _openRequest: IDBRequest;
  // Storage for options passed to new IDB()
  private readonly _options: IDBOptions;
  // Private readwrite prop behind public closedDueToVersionChange readonly prop
  private _closedDueToVersionChange?: boolean;
  
  public get closedDueToVersionChange() {
    return this._closedDueToVersionChange;
  }
  public db!: IDBDatabase;
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

  private async _dbCall(
    store: string,
    mode: IDBTransactionMode,
    action: IDBAction,
    actionArgument?: any,
    onSuccess?: Function
  ): Promise<any> {
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

  public async set<T>(store: string, items: T): Promise<boolean>;
  public async set<T>(store: string, items: T[]): Promise<boolean[]>;
  public async set<T>(store: string, items: T | T[]): Promise<boolean | boolean[]>;
  @checkStore
  public async set<T>(
    store: string, items: T | T[]
  ): Promise<boolean | boolean[]> {
    const updatedKeys: any[] = [];
    const resp: boolean[] = await this._dbCall(
      store, 'readwrite', 'put', items,
      async (key: any) => {
        updatedKeys.push(key);
        return true; // TODO: If QuotaExceedError happened, catch it and return false;
      }
    );
    this._emitDataUpdateListeners(store, 'set', updatedKeys, updatedKeys);
    return resp?.length == 1 ? resp[0] : resp;
  }

  public async get<T, K>(store: string, keys: K): Promise<T | void>
  public async get<T, K>(store: string, keys: K[]): Promise<(T | void)[]>
  public async get<T, K>(store: string, keys: K | K[]): Promise<T | void | (T | void)[]>
  @checkStore
  public async get<T, K>(
    store: string, keys: K | K[]
  ): Promise<T | void | (T | void)[]> {
    const items: T[] = await this._dbCall(
      store, 'readonly', 'get', keys
    );
    if (Array.isArray(keys) && !Array.isArray(items)) {
      return [items];
    }
    return items?.length === 1 ? items[0] : items;
  }

  public async update<T, K>(
    store: string, keys: K, updateCallbacks: UpdateCallback<T>
  ): Promise<T>
  public async update<T, K>(
    store: string, keys: K[], updateCallbacks: UpdateCallback<T> | UpdateCallback<T>[]
  ): Promise<T[]>
  public async update<T, K>(
    store: string, keys: K | K[], updateCallbacks: UpdateCallback<T> | UpdateCallback<T>[]
  ): Promise<T | T[]>

  @checkStore
  public async update<T, K>(
    store: string,
    keys: K | K[],
    updateCallbacks: UpdateCallback<T> | UpdateCallback<T>[]
  ): Promise<T | T[]> {
    if (!Array.isArray(keys)) keys = [keys];
    if (!Array.isArray(updateCallbacks)) updateCallbacks = [updateCallbacks];
    const base = IDBError('update', store);
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

  @checkStore
  public async getAll<T>(
    store: string, onData?: DataReceivingCallback<T>
  ): Promise<T[]> {
    let index = 0;
    let items: T[] = await this._dbCall(
      store, 'readonly', 'openCursor', null,
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

  @checkStore
  public async delete<K>(store: string, keys: K | K[]): Promise<void> {
    await this._dbCall(
      store, 'readwrite', 'delete', keys
    );
    if (!Array.isArray(keys)) keys = [keys];
    this._emitDataUpdateListeners<K>(store, 'delete', keys);
  }

  @checkStore
  public async deleteAll(store: string): Promise<void> {
    await this._dbCall(
      store, 'readwrite', 'clear', null
    );
    this._emitDataUpdateListeners(store, 'deleteAll', []);
  }

  public async has<K>(store: string, keys: K): Promise<boolean>
  public async has<K>(store: string, keys: K[]): Promise<boolean[]>
  public async has<K>(store: string, keys: K | K[]): Promise<boolean | boolean[]>
  public async has(store: string): Promise<number>
  @checkStore
  public async has<K>(
    store: string, keys?: K | K[]
  ): Promise<boolean | boolean[] | number> {
    let resp: (number | void)[] | number = await this._dbCall(
      store, 'readonly', 'count', keys
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

  @checkStore
  public async onDataUpdate<K>(
    store: string, listener: DataUpdateListener<K>
  ): Promise<UnregisterListener> {
    if (!(store in this._listeners)) {
      this._listeners[store] = {};
    }
    const hash = Date.now();
    this._listeners[store][hash] = listener;
    return () => {
      delete this._listeners[store][hash];
    };
  }

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

  @checkStore
  public async followDataUpdates<T, K>(
    store: string,
    keys: K | K[] | void,
    listener: UpdatedDataListener<T | void | (T | void)[]>
  ): Promise<UnregisterListener> {
    const unregister = await this.onDataUpdate<K>(store, async ({
      type, keys: updatedKeys
    }) => {
      const getAll = !keys ||
        (typeof keys === 'object' && !Array.isArray(keys) &&
        (keys as { getAll?: true }).getAll === true);
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
