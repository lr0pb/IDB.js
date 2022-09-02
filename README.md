# 📦 IDB.js

**IDB.js** is a lightweight high-level promise-based wrapper for fast access to IndexedDB API
### Table of content
1. [Install](#install)
1. [How to use](#how-to-use)
1. [Changes](#changes)
1. [API](#api)

# Install
Both versions with `es` export and as `iife` available in [out directory](/out/)
### Main thread
```js
import { IDB } from '/IDB.module.js'
```
### Worker thread
You can use IDB.js in worker thread via the same `import` statement, but it works not in all browsers. In this case you can use `importScripts`
```js
importScripts('/IDB.worker.js');
```

# How to use
Open a new database by creating new instance of class. Provide database `name`, `version` and arrays of `StoreDefinition` object
```ts
interface StoreDefinition {
  name: string,
  index: {
    keyPath?: string,
    autoIncrement?: boolean
  }
}
```
StoreDefinition.index is a [`IDBObjectStoreParameters`](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object
### Initialize database
```js
const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } }
]);
```
### Set items in stores
Add items to stores via simple `db.setItem` method
```js
async function addAuthor(books) {
  await db.setItem('authors', {
    name: 'Agatha Christie',
    books: []
  });
}
```
### Check is item are in store and update them
Check if store have certain item via `db.hasItem` and update them via `db.updateItem`
```js
async function addBook() {
  const book = {
    id: 12345,
    title: `Hercule Poirot's Christmas`,
    author: 'Agatha Christie',
    genre: 'Mysteries'
  };
  await db.setItem('books', book);
  const isAuthorExist = await db.hasItem('authors', book.author);
  if (isAuthorExist) {
    await db.updateItem('authors', book.author, async (author) => {
      author.books.push(book.id);
      await sendAnalytics();
    });
  }
}
```
> `UpdateCallback` function in [`db.updateItem`](#dbupdateitem) can be **async**

### Read store entries
Get one item via `db.getItem` and all store items via `db.getAll`
```js
async function renderAuthor() {
  const author = await db.getItem('author', 'Agatha Christie');
  ...
}

async function renderBooks() {
  const books = await db.getAll('books');
  for (let book of books) {
    renderBook(book);
  }
}
```
Additionally, you can set callback for running function every time new item receives from database, its best for speeding up some process like rendering
```js
async function renderBooksProgressive() {
  await db.getAll('books', (book) => {
    renderBook(book);
  });
}
```
> `DataReceivingCallback` function in [`db.getAll`](#dbgetall) must be **ONLY** sync

### Item and stores deletion
Delete whole store simply via upgrading database version and remove relevant `StoreDefinition` object from stores array. Delete one item via `db.deleteItem` and clear all store entries via `db.deleteAll`
```js
const db = new IDB('library', 2, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } }
]);
// 'manufacturers' store was deleted at all

async function deleteBooks() {
  await db.deleteItem('books', 12345);
  await db.deleteAll('author');
}
```
### Listen for store updates
You can register multiple callbacks to spot if some items added, updated or deleted from store. These callbacks called after actual operation with data happened in order to when they are registered
> Unregistering callbacks at the moment unavailable

```js
async signForUpdates() {
  await db.onDataUpdate('books', async (store, item) => {
    if (item) await notifyUserAboutNewBookAdded(item);
  });
}
```
> `DataUpdatedCallback` function in [`db.onDataUpdate`](#dbondataupdate) can be **async**

# Changes
View all changes during versions in [CHANGELOG](/CHANGELOG.md)
# API

1. [`new IDB`](#new-idb)
1. [`setItem`](#dbsetitem)
1. [`getItem`](#dbgetitem)
1. [`updateItem`](#dbupdateitem)
1. [`getAll`](#dbgetall)
1. [`deleteItem`](#dbdeleteitem)
1. [`deleteAll`](#dbdeleteall)
1. [`hasItem`](#dbhasitem)
1. [`onDataUpdate`](#dbondataupdate)
## new IDB()
Create database and return its wrapper
```js
new IDB(name: string, version: number, objectStores: StoreDefinition[], options?: IDBOptions): IDB
```
- `name` - Database name
- `version` - Database version
- `objectStores` - stores that will create and update with database version change
- **StoreDefinition**
```ts
interface StoreDefinition {name: string, index: {keyPath?: string, autoIncrement?: boolean}}
```
- `options` - Options for IDB object
- **IDBOptions** - Hide technical logs about database lifecycle events
```ts
interface IDBOptions {hideLogs?: boolean}
```
## db.setItem()
Add or update item in the store
```ts
await db.setItem(store: string, item: any): boolean
```
- `store` - Name of database store
- `item` - Serializable object that IDB can store
> **For example:** {title: 'Book', author: 'Bob', data: new ArrayBuffer(32), pages: 12}

## db.getItem()
Receive item from store by default store key
```ts
await db.getItem(store: string, itemKey: any): any | void
```
- `store` - Name of database store
- `itemKey` - Key value to access item in store
## db.updateItem()
Sugar for getting, modifying and setting item back to the store
```ts
await db.updateItem(store: string, updateCallback: UpdateCallback): any | void
```
- `store` - Name of database store
- `updateCallback` - Async function that receives item and can directly modify them
- **UpdateCallback** - No returned value needed
```ts
function UpdateCallback(item: any)
```
## db.getAll()
Receive all items from the store
```ts
await db.getAll(store: string, onData: DataReceivingCallback): any[]
```
- `store` - Name of database store
- `onData` - function that calls every time when next item is received
- **DataReceivingCallback** - Index is items position in store
```ts
function DataReceivingCallback(item: any, index: number)
```
## db.deleteItem()
Delete item from store by store default key
```ts
await db.deleteItem(store: string, itemKey: any): void
```
- `store` - Name of database store
- `itemKey` - Key value to access item in store
## db.deleteAll()
Delete all items from the store
```ts
await db.deleteAll(store: string): void
```
- `store` - Name of database store
## db.hasItem()
Check for item with key exist or count how much items are in the store
```ts
await db.hasItem(store: string, itemKey: any): boolean | number
```
- `store` - Name of database store
- `itemKey` - Key value to access item in store, if no key - return items amount in the store
## db.onDataUpdate()
Set a listener to the store that calls every time some changes in the store happened
```ts
await db.onDataUpdate(store: string, callback: DataUpdatedCallback): boolean
```
- `store` - Name of database store
- `callback` - Async function that calls every time when some item in the store modified
- **DataUpdatedCallback** - Item is presented only if some item was added or updated
```ts
function DataUpdatedCallback(store: string, item?: any)
```
