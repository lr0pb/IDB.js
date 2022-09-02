export class IDB {
/**
* @name constructor Create database and return its wrapper
* @param name: string Database name
* @param version: number Database version
* @param objectStores: StoreDefinition[] Object stores that will create and update with database version change
* @typedef StoreDefinition {name: string, index: {keyPath?: string, autoIncrement?: boolean}}
* @param options?: IDBOptions Options for IDB object
* @typedef IDBOptions {hideLogs?: boolean}, Hide technical logs about database lifecycle events
* @return IDB
*/
  constructor(name, version, objectStores, options) {
    const response = this._argsCheck({
      name: { value: name, required: true, type: 'string' },
      version: { value: version, required: true, type: 'number' },
      objectStores: { value: objectStores, required: true, type: 'array' },
      options: { value: options, type: 'object' }
    });
    const beginning = `[IDB] new IDB(${name || '_'}, ...) call ruined due to `;
    if (!response.passed) {
      return this._proccessError(true, beginning, response);
    }
    this.showLogs = options && options.hideLogs === true ? false : true;
    this._listeners = {};
    this._idb = indexedDB.open(name, version);
    this._idb.addEventListener('upgradeneeded', () => this._upgradeneeded(objectStores));
    this._idb.addEventListener('success', () => this._success());
    return this;
  }
  _upgradeneeded(objectStores) {
    if (this.showLogs) console.log('[IDB] Database upgrading started');
    this.db = this._idb.result;
    const actualStores = {};
    for (let store of objectStores) {
      const response = this._argsCheck({
        storeName: { value: store.name, required: true, type: 'string' },
        storeIndex: { value: store.index, required: true, type: 'object' }
      });
      const beginning = `[IDB] While creating object store ${store.name || '_'} `
      const end = `. Store is not created`;
      if (!response.passed) {
        this._proccessError(false, beginning, response, end);
        continue;
      }
      if (!this.db.objectStoreNames.contains(store.name)) {
        this.db.createObjectStore(store.name, store.index);
      }
      actualStores[store.name] = true;
    };
    for (let storeName of this.db.objectStoreNames) {
      if (!actualStores[storeName]) this.db.deleteObjectStore(storeName);
    };
  }
  _success() {
    if (this.showLogs) console.log('[IDB] Database successfully opened');
    this.db = this._idb.result;
    this.db.addEventListener('versionchange', () => this._versionchange());
  }
  _versionchange() {
    this.db.close();
    this._closedDueToVersionChange = true;
    console.error('[IDB] Database closed due to version change, reload page');
  }
  async _isDbReady() {
    if (this._closedDueToVersionChange) return false;
    if (!this.db) await new Promise((resolve) => {
      const isComplete = () => this.db ? resolve() : setTimeout(isComplete, 5);
      isComplete();
    });
    return true;
  }
  _err(name, store) { return `[IDB] Error in db.${name}(${store || ' '}): `; }
  _checkStore(name, store) {
    if (!this.db.objectStoreNames.contains(store)) {
      console.error(`${this._err(name)}database haven't "${store}" store`);
      return false;
    }
    return true;
  }
  _proccessError(error, beginning, argsCheck, end = '') {
    const method = error ? 'error' : 'warn';
    const { errorType, argName, arg } = argsCheck;
    const wait = `waiting for ${argName} argument `;
    const but = `but receives `;
    if (errorType == 'noValue') {
      return console[method](`${beginning}${wait}${but}nothing${end}`);
    }
    const value = arg.value;
    if (errorType == 'wrongType') {
      return console[method](`${beginning}${wait}type ${value.type} ${but}type ${typeof value.value}: ${value.value}`);
    }
  }
  _argsCheck(args) {
    for (let argName in args) {
      const arg = args[argName];
      if (!arg.required && !arg.value) continue;
      if (arg.required && !arg.value) return { errorType: 'noValue', argName };
      let wrongType = false;
      if (arg.type && arg.type == 'array') {
        if (!Array.isArray(arg.value)) wrongType = true;
      }
      else if (arg.type && typeof arg.value !== arg.type) {
        wrongType = true;
      }
      if (wrongType) return { errorType: 'wrongType', argName, arg };
    }
    return { passed: true };
  }
  _dataOperationsArgsCheck(name, args) {
    let store = null;
    if ('store' in args) {
      store = args.store.value;
      Object.assign(args.store, { required: true, type: 'string' });
    }
    const response = this._argsCheck(args);
    if (response.passed) return true;
    return this._proccessError(true, this._err(name, store), response);
  }
  async _dbCall(name, args, mode, action, actionArgument, onResult, onSuccess) {
    if (!this._dataOperationsArgsCheck(name, args)) return;
    const isReady = await this._isDbReady();
    if (!isReady) return;
    const store = args.store.value;
    if (!this._checkStore(name, store)) return;
    const actioner = this.db
      .transaction(store, mode)
      .objectStore(store)
      [action](actionArgument);
    return new Promise((resolve) => {
      actioner.addEventListener('success', async () => {
        const complete = onSuccess ? await onSuccess(actioner.result) : true;
        if (complete) {
          const response = onResult ? await onResult(actioner.result) : null;
          resolve(response);
        }
      });
    });
  }
  async _onDataUpdateCall(store, item) {
    if (!(store in this._listeners)) return;
    await Promise.all(
      this._listeners[store].map(async (callback) => await callback(store, item))
    );
  }
/**
* @name setItem Add or update item in the store
* @param store: string Name of database store
* @param item: any Serializable object that IDB can store
* @example {title: 'Book', author: 'Bob', data: new ArrayBuffer(32), pages: 12}
* @return boolean
*/
  async setItem(store, item) {
    const resp = await this._dbCall('setItem', {
      store: { value: store }, item: { value: item, required: true, type: 'object' }
    }, 'readwrite', 'put', item, async () => {
      await this._onDataUpdateCall(store, item);
      return true; // TODO: If QuotaExceedError happened, catch it and return false;
    });
    return resp;
  }
/**
* @name getItem Receive item from store by default store key
* @param store: string Name of database store
* @param itemKey: any Key value to access item in store
* @return any | void
*/
  async getItem(store, itemKey) {
    const resp = await this._dbCall('getItem', {
      store: { value: store }, itemKey: { value: itemKey, required: true }
    }, 'readonly', 'get', itemKey, (result) => result);
    return resp;
  }
/**
* @name updateItem Sugar for getting, modifying and setting item back to the store
* @param store: string Name of database store
* @param updateCallback: UpdateCallback Async function that receives item and can directly modify them
* @function UpdateCallback(item: any) No returned value needed
* @return any | void
*/
  async updateItem(store, itemKey, updateCallback) {
    if (!this._dataOperationsArgsCheck('updateItem', {
      store: { value: store }, itemKey: { value: itemKey, required: true },
      updateCallback: { value: updateCallback, required: true, type: 'function' }
    })) return;
    const data = await this.getItem(store, itemKey);
    await updateCallback(data);
    await this.setItem(store, data);
    return data;
  }
/**
* @name getAll Receive all items from the store
* @param store: string Name of database store
* @param onData: DataReceivingCallback(item, index) Sync function that calls every time when next item is received
* @function DataReceivingCallback(item: any, index: number) Index is items position in store
* @return any[]
*/
  async getAll(store, onData) {
    const items = [];
    const resp = await this._dbCall('getAll', {
      store: { value: store }, onData: { value: onData, type: 'function' }
    }, 'readonly', 'openCursor', null, () => items, async (result) => {
      if (result) {
        const value = result.value;
        const index = items.length;
        items.push(value);
        if (onData) onData(value, index);
        result.continue();
      } else return true;
    });
    return resp ? items : resp;
  }
/**
* @name deleteItem Delete item from store by store default key
* @param store: string Name of database store
* @param itemKey: any Key value to access item in store
* @return void
*/
  async deleteItem(store, itemKey) {
    const resp = await this._dbCall('deleteItem', {
      store: { value: store }, itemKey: { value: itemKey, required: true }
    }, 'readwrite', 'delete', itemKey, async () => await this._onDataUpdateCall(store));
    return resp;
  }
/**
* @name deleteAll Delete all items from the store
* @param store: string Name of database store
* @return void
*/
  async deleteAll(store) {
    const resp = await this._dbCall('deleteAll', {
      store: { value: store }
    }, 'readwrite', 'clear', null, async () => await this._onDataUpdateCall(store));
    return resp;
  }
/**
* @name hasItem Check for item with key exist or count how much items are in the store
* @param store: string Name of database store
* @param itemKey: any Key value to access item in store, if no key - return items amount in the store
* @return boolean | number
*/
  async hasItem(store, itemKey) {
    const resp = await this._dbCall('hasItem', {
      store: { value: store }
    }, 'readonly', 'count', itemKey, (result) => itemKey ? (result == 1 ? true : false) : result);
    return resp;
  }
/**
* @name onDataUpdate Set a listener to the store that calls every time some changes in the store happened
* @param store: string Name of database store
* @param callback: DataUpdatedCallback Async function that calls every time when some item in the store modified
* @function DataUpdatedCallback(store: string, item?: any) Item is presented only if some item was added or updated
* @return boolean
*/
  async onDataUpdate(store, callback) {
    if (!this._dataOperationsArgsCheck('updateItem', {
      store: { value: store }, callback: { value: callback, required: true, type: 'function' }
    })) return false;
    const isReady = await this._isDbReady();
    if (!isReady) return false;
    if (!this._checkStore('onDataUpdate', store)) return false;
    if (!(store in this._listeners)) this._listeners[store] = [];
    this._listeners[store].push(callback);
    return true;
  }
};
