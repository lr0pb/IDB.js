import type {
  IDBParams, IDBArguments,
  IDBOptions, IDBAction, StoreDefinition,
  StoreContainment, UpdateCallback, DataReceivingCallback,
  DataUpdateType, DataUpdateListener, UnregisterListener,
  UpdatedDataListener,
} from './IDBTypes.js'
import type { IDBInterface } from './IDBInterface.js'
import { checkStore, IDBError } from './utils/checkStore.js'

export class IDB implements IDBInterface {
  // Storage for listeners setted with `db.onDataUpdate` method
  readonly #listeners: Record<string, Record<number, DataUpdateListener<any>>>;
  // Initial database params
  readonly #params: IDBParams;
  // Storage for options passed to new IDB()
  readonly #options: IDBOptions;
  // IDB open request object https://w3c.github.io/IndexedDB/#open-requests
  #openRequest!: IDBRequest;
  // Private readwrite prop behind public closedDueToVersionChange readonly prop
  #closedDueToVersionChange?: boolean;
  
  public get closedDueToVersionChange() {
    return this.#closedDueToVersionChange;
  }
  public db!: IDBDatabase;
  /**
  * Create database and return its wrapper
  * @param name Database name
  * @param version Database version
  * @param objectStores Object stores that will create and update with database version change
  * @param options Options for IDB object
  */
  constructor(...[
    name,
    version,
    stores,
    options = {},
  ]: IDBArguments) {
    this.#params = { name, version, stores };
    this.#options = options;
    this.#listeners = {};
    return this;
  }

  public ping(): void {
    this.#init();
    this.ping = () => {};
  }

  #init(): void {
    this.#openRequest = indexedDB.open(this.#params.name, this.#params.version);
    this.#openRequest.addEventListener('upgradeneeded', () => this.#upgradeneeded());
    this.#openRequest.addEventListener('success', () => this.#success());
  }

  #upgradeneeded(): void {
    if (this.#options.showLogs) {
      console.log('[IDB] Database upgrading started');
    }
    this.db = this.#openRequest.result;
    const objectStores = this.#params.stores;
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

  #success(): void {
    if (this.#options.showLogs) {
      console.log('[IDB] Database successfully opened');
    }
    this.db = this.#openRequest.result;
    this.db.addEventListener('versionchange', () => this.#versionchange());
  }

  #versionchange(): void {
    this.db.close();
    this.#closedDueToVersionChange = true;
    throw new Error(
      '[IDB] Database closed due to versionchange event, reload page'
    );
  }

  protected async _dbCall(
    methodName: string,
    store: string,
    mode: IDBTransactionMode,
    action: IDBAction,
    actionArgument?: any,
    onSuccess?: Function,
  ): Promise<any> {
    await checkStore(this, methodName, store);
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

  protected async _emitDataUpdateListeners<K>(
    store: string, type: DataUpdateType, keys: K[], item?: any
  ): Promise<void> {
    if (!(store in this.#listeners)) return;
    for (let hash in this.#listeners[store]) {
      await this.#listeners[store][hash]({
        store, type, keys, item
      });
    }
  }

  public async set<T>(store: string, items: T): Promise<boolean>;
  public async set<T>(store: string, items: T[]): Promise<boolean[]>;
  public async set<T>(store: string, items: T | T[]): Promise<boolean | boolean[]>;
  public async set<T>(
    store: string, items: T | T[]
  ): Promise<boolean | boolean[]> {
    const updatedKeys: any[] = [];
    const resp: boolean[] = await this._dbCall(
      'set', store, 'readwrite', 'put', items,
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
  public async get<T, K>(
    store: string, keys: K | K[]
  ): Promise<T | void | (T | void)[]> {
    const items: T[] = await this._dbCall(
      'get', store, 'readonly', 'get', keys
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

  public async update<T, K>(
    store: string,
    keys: K | K[],
    updateCallbacks: UpdateCallback<T> | UpdateCallback<T>[]
  ): Promise<T | T[]> {
    await checkStore(this, 'update', store);
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

  public async getAll<T>(
    store: string, onData?: DataReceivingCallback<T>
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

  public async delete<K>(store: string, keys: K | K[]): Promise<void> {
    await this._dbCall(
      'delete', store, 'readwrite', 'delete', keys
    );
    if (!Array.isArray(keys)) keys = [keys];
    this._emitDataUpdateListeners<K>(store, 'delete', keys);
  }

  public async deleteAll(store: string): Promise<void> {
    await this._dbCall(
      'deleteAll', store, 'readwrite', 'clear', null
    );
    this._emitDataUpdateListeners(store, 'deleteAll', []);
  }

  public async has<K>(store: string, keys: K): Promise<boolean>
  public async has<K>(store: string, keys: K[]): Promise<boolean[]>
  public async has<K>(store: string, keys: K | K[]): Promise<boolean | boolean[]>
  public async has(store: string): Promise<number>
  public async has<K>(
    store: string, keys?: K | K[]
  ): Promise<boolean | boolean[] | number> {
    let resp: (number | void)[] | number = await this._dbCall(
      'has', store, 'readonly', 'count', keys
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

  public async onDataUpdate<K>(
    store: string, listener: DataUpdateListener<K>
  ): Promise<UnregisterListener> {
    await checkStore(this, 'onDataUpdate', store);
    if (!(store in this.#listeners)) {
      this.#listeners[store] = {};
    }
    const hash = Date.now();
    this.#listeners[store][hash] = listener;
    return () => {
      delete this.#listeners[store][hash];
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

  public async followDataUpdates<T, K>(
    store: string,
    keys: K | K[] | void,
    listener: UpdatedDataListener<T | void | (T | void)[]>
  ): Promise<UnregisterListener> {
    await checkStore(this, 'followDataUpdates', store);
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
