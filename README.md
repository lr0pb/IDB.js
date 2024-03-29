# 📦 IDB.js

Lightweight promise-based wrapper for fast & simple access to IndexedDB API. With React integration ⚛️

[![Latest release](https://img.shields.io/github/v/release/lr0pb/IDB.js?color=g&label=Version&logo=npm)](https://www.npmjs.com/package/@lr0pb/idb)
[![Publish package](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml/badge.svg)](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@lr0pb/idb)](https://bundlephobia.com/package/@lr0pb/idb)
[![Docs site](https://img.shields.io/badge/Docs%20site-%20-blue?color=orange)](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html)
[![License](https://img.shields.io/github/license/lr0pb/IDB.js?color=blue)](/LICENSE)

### Table of content
1. [Usage](#usage)
1. [Examples](#examples)
1. [API](#api)
1. [Changes](#changes)
1. [Develop](#develop)

# Usage
To start using `IDB.js` install it from [`npm`](https://www.npmjs.com/package/@lr0pb/idb)
```
npm i @lr0pb/idb
```

### Create database
Provide `name`, `version` and `stores` to IDB constructor
```js
import { IDB } from '@lr0pb/idb';

const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } }
]);
```
`stores` is an array of `StoreDefinition` objects: `name` of store and `index` object, which described how should be indexed data inside the store. This is a [`IDBObjectStoreParameters`](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object, which is a part of original IndexedDB API

You can also provide optional fourth argument `options` described in [`new IDB`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#constructor)

### Update database
You can add or delete stores from database by called IDB constructor with upgraded `version` and relevant changes in `stores` array
```diff
-const db = new IDB('library', 1, [
+const db = new IDB('library', 2, [
   { name: 'books', index: { keyPath: 'id' } },
   { name: 'authors', index: { keyPath: 'name' } },
-  { name: 'manufacturers', index: { autoIncrement: true } }
+  { name: 'visitors', index: { keyPath: 'id' } }
]);
// 'manufacturers' store will be deleted and cannot be longer accessed
// 'visitors' store instead will be created in database
```
You can delete and add as much stores in a single database update as you want

### IDB methods

Operate with data:
- [`set()`](#set-items-to-store)
- [`get()`](#get-items-from-store) and [`getAll`](#get-all-items-from-store)
- [`update()`](#update-items)
- [`delete()` and `deleteAll()`](#delete-items-from-store)

Other helpful methods:
- [`has()`](#check-that-store-contain-items)
- [`onDataUpdate()`](#listen-for-store-updates)

### TypeSctipt support
IDB come out-of-the-box with types declaration.
While using IDB in TS project, every data related method (exludes `deleteAll`) have a type parameters, where `T` stands for `Type` of data you operate and `K` stands for `Key` to access this data in the store.
You can learn detailed types annotation for the concrete method by clicking `[Ref]` link in the method description within this Readme or you can explore all types stuff [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

# Examples

### Set items to store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#set) Add item to the store via `db.set(store, item | items[])` method
```js
await db.set('authors', {
  name: 'Agatha Christie',
  books: [...]
});

await db.set('authors', [
  author1, author2, ...
]);
```

### Get items from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#get) Get one or more items by keys with `db.get(store, key | keys[])` method
```js
const author = await db.get('author', 'Agatha Christie');
// {
//   name: 'Agatha Christie',
//   books: [12345, 67890, ...],
//   ...
// }
const authorsBooks = await db.get('books', author.books);
// [
//   {
//     id: 12345,
//     title: `Hercule Poirot's Christmas`,
//     ...
//   },
//   {
//     id: 67890,
//     title: `Murder on the Orient Express`,
//     ...
//   },
//   ...
// ]
```

### Get all items from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#getAll) Read all items in the store with `db.getAll(store, DataReceivingCallback?)` method
```js
const books = await db.getAll('books');
books.forEach((book) => {
  renderBook(book);
});
```
Additionally, you can set `DataReceivingCallback` that will be called every time new item receives from the database
```js
await db.getAll('books', (book) => {
  renderBook(book);
});
```
> `DataReceivingCallback` function must be **sync**

### Update items
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#update) Use `db.update(store, key | keys[], UpdateCallback)` to easier updating items in the store. It is actually simple wrapper for `get` and `set` methods
```js
async function addBookToAuthor(book) {
  await db.update('authors', book.author, async (author) => {
    // this callback function receives item object, to update it,
    // you should apply changes directly to this object
    author.books.push(book.id);
    await sendAnalytics();
  });
}
```
> `UpdateCallback` function can be **async**
If you provide multiple keys, `UpdateCallback` will be called for each received item. If you want to use separate `UpdateCallback` functions for each item, provide array of `UpdateCallback` functions **same length** as `keys` array length

### Delete items from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#delete) Delete one or more items by keys with `db.delete(store, key | keys[])` method and clear all store entries with `db.deleteAll(store)` method [[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#deleteAll)
```js
await db.delete('books', 12345);
await db.delete('books', [
  67890, 34567, ...
]);
await db.deleteAll('author');
// `authors` store is still available but have zero items
```

### Check that store contain items
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#has) Check if store have certain items via `db.has(store, key | keys[] | void)` or get amount of all items in the store by not passing `key` argument
```js
const book = {
  id: 12345,
  title: `Hercule Poirot's Christmas`,
  ...
};
await db.set('books', book);
const isBookSaved = await db.has('books', book.id); // true
const booksCount = await db.has('books'); // 1
```

### Listen for store updates
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#onDataUpdate) You can register multiple listeners to spot changes that happened in the store with `db.onDataUpdate(store, StoreUpdatesListener)` method. These callbacks will be called after actual operation with data in order to time they are registered

To unregister callback, call returned from `db.onDataUpdate` [`UnregisterListener`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#onDataUpdate) function
```js
const unregister = await db.onDataUpdate('books', async ({store, type, item}) => {
  // `item` argument not presented when it was a deleting operation
  if (type === 'set' && isNewBook(item)) {
    await notifyUserAboutNewBookAdded(item);
  }
});
...
unregister();
```
> `StoreUpdatesListener` function can be **async**

# API
View whole detailed API documentation with all the types and overloads [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

# Changes

### Notable changes
- **2.1.0** Explicitly throw errors when something goes wrong in IDB methods call

> View all changes during versions in [CHANGELOG](https://github.com/lr0pb/IDB.js/tree/main/CHANGELOG.md)

# Develop
As this project initially was a data layer part of my another project, I maintain it preferably for those project, but any issues and pull requests are welcome!

For start to develop IDB: clone this repo on your machine and run `npm i`

Write your code and create tests for it in [`test` directory](https://github.com/lr0pb/IDB.js/blob/main/test/). Each `.test.js` file should be structered as shown below:

```js
import { assert } from 'chai/index.mjs';

export default function (container, checkStore) {
  it('test', ...);
  ...
}
```
Every call to IDB should be accessed through `container.db` variable. `checkStore(store, count)` is helper function to check amount of items in store.

After new test file created, it should be imported inside [`test/__index__.test.js`](https://github.com/lr0pb/IDB.js/blob/main/test/__index__.test.js) file and passed to `tests` object to automatically run with other tests. To disable some test suite - comment its desclaration within `tests` object.

Run tests via `npm test` - it will start a development server and open default browser window with tests page
