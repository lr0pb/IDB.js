# 📦 IDB.js

Lightweight high-level promise-based wrapper for fast access to IndexedDB API. With React integration ⚛️

[![Latest release](https://img.shields.io/github/v/release/lr0pb/IDB.js?&color=g&label=Version&logo=npm)](https://www.npmjs.com/package/@lr0pb/idb)
[![Publish package](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml/badge.svg)](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@lr0pb/idb)](https://bundlephobia.com/package/@lr0pb/idb)

### Table of content
1. [Usage](#usage)
1. [Examples](#examples)
1. [API](#api)
1. [Changes](#changes)
1. [License](#license)
1. [Develop](#develop)

# Usage
To start using `IDB.js` install it from [`npm`](https://www.npmjs.com/package/@lr0pb/idb)
```
npm i @lr0pb/idb
```

### Create database
Provide `name`, `version` and `stores` which will be initialized alongside with database
```js
import { IDB } from '@lr0pb/idb';

const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } },
  ...
]);
```
`stores` is an array of `StoreDefinition` objects: `name` of store and `index` object, which described how should be indexed data inside the store

`index` is a [`IDBObjectStoreParameters`](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object, which is a part of original IndexedDB API

You can also provide optional fourth argument `options` described in [`new IDB` Ref](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#constructor)

### Delete store
Delete stores by upgrading database version and remove relevant `StoreDefinition` objects from `stores` array
```js
const db = new IDB('library', 2, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } }
]);
// 'manufacturers' store was deleted at all, it cannot be longer accessed
```

### IDB methods

REST-like methods to work with data:
- [`set()`](#set-items-to-store)
- [`get()`](#get-items-from-store) and [`getAll`](#get-all-items-from-store)
- [`update()`](#update-item-in-store)
- [`delete()` and `deleteAll()`](#delete-item-from-store)

Additional helpful methods:
- [`has()`](#check-is-store-contain-item)
- [`onDataUpdate()`](#listen-for-store-updates)

Integrate with React:
- [`IDBProvider` component]()
- [`useIDB` hook]()
- [`useDataLinker` hook]()

# Examples

### Set items to store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#set) Add item to store via `db.set(store, item | items[])` method
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

### Get items from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#get) Get one or more items by key via `db.get(store, key | keys[])`
```js
async function renderAuthor() {
  const author = await db.get('author', 'Agatha Christie');
  // {
  //   name: 'Agatha Christie',
  //   books: [12345, 67890, ...],
  //   ...
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
```

### Get all items from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#getAll) Read all store items via `db.getAll(store, DataReceivingCallback?)` call
```js
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
> `DataReceivingCallback` function passed to [`db.getAll`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#getAll) must be **sync**

### Update item in store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#update) Use `db.update(store, key | keys[], UpdateCallback)` to update one or more items
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
If you provide multiple keys, `UpdateCallback` will be called for each received item. If you want to use separate `UpdateCallback` functions for each item, provide array of `UpdateCallback` functions **same length** as keys array length

### Delete item from store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#delete) Delete one or more items by key via `db.delete(store, key | keys[])` and clear all store entries via `db.deleteAll(store)`
```js
async function deleteBooks() {
  await db.delete('books', 12345);
  await db.delete('books', [
    67890, 34567, ...
  ]);
  await db.deleteAll('author'); // authors store is still available but have no items
}
```

### Check is store contain item
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#has) Check if store have certain items via `db.has(store, key | keys[] | void)` or get count of all items in the store by not passing `key` argument
```js
async function addBook() {
  const book = {
    id: 12345,
    title: `Hercule Poirot's Christmas`,
    ...
  };
  await db.set('books', book);
  const isBookSaved = await db.has('books', book.id); // true
  const booksCount = await db.has('books'); // 1
}
```

### Listen for store updates
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#onDataUpdate) You can register multiple listeners to spot changes that happened in the store with `db.onDataUpdate(store, StoreUpdatesListener)`. These callbacks called after actual operation with data in order to time they are registered.
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
> `StoreUpdatesListener` function passed to [`db.onDataUpdate`](https://lr0pb.github.io/IDB.js/classes/IDB.IDB#onDataUpdate) can be **async**



# API
View whole detailed API documentation [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)
# Changes
View all changes during versions in [CHANGELOG](https://github.com/lr0pb/IDB.js/tree/main/CHANGELOG.md)
# License
IDB.js distributed under the [MIT](https://github.com/lr0pb/IDB.js/tree/main/LICENSE) license
# Develop
Clone repo on your machine and run `npm i`

Write tests in [`test/mocha.test.js`](https://github.com/lr0pb/IDB.js/blob/main/test/mocha.test.js) and run them via `npm run dev` (will start a development server and open default browser window with tests page)
