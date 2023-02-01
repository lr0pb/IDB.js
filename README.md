# 📦 IDB.js

**IDB.js** is a lightweight high-level promise-based wrapper for fast access to IndexedDB API

[![Latest release](https://img.shields.io/github/v/release/lr0pb/IDB.js?&color=g&label=Version&logo=npm)](https://www.npmjs.com/package/@lr0pb/idb)
[![Publish package](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml/badge.svg)](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml)

### Table of content
1. [Install](#install)
1. [How to use](#how-to-use)
1. [Changes](#changes)
1. [License](#license)
1. [API](#api)
1. [Develop](#develop)

# Install
Install `IDB.js` via [`npm`](https://www.npmjs.com/package/@lr0pb/idb)
```
npm i @lr0pb/idb
```
And then import in your code (make sure to use bundler such as webpack, Rollup, Parcel etc.)
```js
import { IDB } from '@lr0pb/idb';
```

# How to use

### Create database
Provide `name`, `version` and stores which will be initialized alongside with database
```js
const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } }
]);
```
`StoreDefinition` objects are simple: `name` of store and `index` object, which described how should indexed data inside the store

This is a [`IDBObjectStoreParameters`](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object, which is a part of original IndexedDB API

You can also provide fourth argument `options` described in [`new IDB`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#constructor)

### Main functions to operate with data
1. [set](#set-items-in-stores)
1. [has](#check-is-store-contain-some-item)
1. [update](#update-item-in-store)
1. [get](#get-items-from-store)
1. [delete](#item-and-stores-deletion)
1. [onDataUpdate](#listen-for-store-updates)

### Set items in stores
Add item to store via `db.set(store, item)` method
> `db.set` support second argument to be one item or an **array** of items
```js
async function addAuthor(books) {
  await db.set('authors', {
    name: 'Agatha Christie',
    books: []
  });

  await db.set('authors', [
    author1, author2, ...
  ]);
}
```

### Check is store contain some item
Check if store have certain item via `db.has(store, itemKey)` or get count of all items in the store by no passing `itemKey` argument
> `db.has` support second argument to be one item's key or an **array** of item keys
```js
async function addBook() {
  const book = {
    id: 12345,
    title: `Hercule Poirot's Christmas`,
    author: 'Agatha Christie',
    genre: 'Mysteries'
  };
  await db.set('books', book);
  // in fact you dont need to call db.has() after set, because db.set() itself return boolean that indicates is item was successfully setted
  const isBookSaved = await db.has('books', book.id); // true
  const booksCount = await db.has('books'); // 1
}
```

### Update item in store
Use `db.update(store, itemKey, UpdateCallback)` to update one or more items
> `db.update` support second argument to be one item's key or an **array** of item keys
```js
async function addBookToAuthor(book) {
  await db.update('authors', book.author, async (author) => {
    // this callback function receives item object and you should apply changes directly to this object
    author.books.push(book.id);
    await sendAnalytics();
  });
}
```
> `UpdateCallback` function passed to [`db.update`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#update) can be **async**

> If you provide multiple item keys, `UpdateCallback` will be called for each item. If you want to use separate `UpdateCallback` functions for each item, provide array of `UpdateCallback` functions **same length** as item keys array length

### Get items from store
Get one or more items by key via `db.get(store, itemKey)` and all store items via `db.getAll(store)`
> `db.get` support second argument to be one item's key or an **array** of item keys
```js
async function renderAuthor() {
  const author = await db.get('author', 'Agatha Christie');
  // {
  //   name: 'Agatha Christie',
  //   birth: 1920,
  //   death: 1976,
  //   books: [12345, 67890, ...]
  // }
  ...
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
}

async function renderAllBooks() {
  const books = await db.getAll('books');
  for (let book of books) {
    renderBook(book);
  }
}
```
Additionally, you can set `DataReceivingCallback` callback for call it every time new item receives from database
```js
async function renderBooksProgressive() {
  await db.getAll('books', (book) => {
    renderBook(book);
  });
}
```
> `DataReceivingCallback` function passed to [`db.getAll`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#getAll) MUST be **sync** or it will not wait for asynchronous function completed

### Item and stores deletion
Delete whole store by upgrading database version and remove relevant `StoreDefinition` object from `stores` array
```js
const db = new IDB('library', 2, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } }
]);
// 'manufacturers' store was deleted at all, it cannot be longer accessed
```
Delete one or more item by key via `db.delete(store, itemKey)` and clear all store entries via `db.deleteAll(store)`
> `db.delete` support second argument to be one item's key or an **array** of item keys
```js
async function deleteBooks() {
  await db.delete('books', 12345);
  await db.delete('books', [
    67890, 34567, ...
  ]);
  await db.deleteAll('author'); // authors store is still available but have no items
}
```
### Listen for store updates
You can register multiple functions to spot if some changes happened in the store. These callbacks called after actual operation with data in order to time they are registered.
To unregister callback, call returned from `db.onDataUpdate` [`UnregisterListener`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#onDataUpdate) function
```js
async signForUpdates() {
  const unregister = await db.onDataUpdate('books', async ({store, type, item}) => {
    // item argument not presented when it was a deleting operation
    if (type === 'set' && isNewBook(item)) {
      await notifyUserAboutNewBookAdded(item);
    }
  });
  ...
  unregister();
}
```
> `DataUpdatedCallback` function passed to [`db.onDataUpdate`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#onDataUpdate) can be **async**

# Changes
View all changes during versions in [CHANGELOG](https://github.com/lr0pb/IDB.js/tree/main/CHANGELOG.md)
# License
IDB.js distributed under the [MIT](https://github.com/lr0pb/IDB.js/tree/main/LICENSE) license
# API
View whole detailed API documentation [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)
# Develop
Clone repo on your machine and run `npm i`

Write tests in [`test/mocha.test.js`](https://github.com/lr0pb/IDB.js/blob/main/test/mocha.test.js) file and run them via `npm run dev` (will open default browser window with tests page)
