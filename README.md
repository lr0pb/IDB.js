# 📦 IDB.js

**IDB.js** is a lightweight high-level promise-based wrapper for fast access to IndexedDB API
### Table of content
1. [Install](#install)
1. [How to use](#how-to-use)
1. [Changes](#changes)
1. [License](#license)
1. [API](#api)
1. [Develop](#develop)

# Install
Version with `es` export and as `iife` available in the [`out` directory](https://github.com/lr0pb/IDB.js/tree/main/out/)

Typescript source and types definition files can be found in the [`src` directory](https://github.com/lr0pb/IDB.js/tree/main/src/)
### Main thread
```js
import { IDB } from './out/IDB.module.js'
```
### Worker thread
You can use IDB.js in **worker thread** via the same `import` statement, but it works not in [all](https://caniuse.com/mdn-javascript_statements_import_worker_support) browsers. In this case you can use `importScripts`
```js
importScripts('./out/IDB.iife.js');
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
`StoreDefinition.index` is a [`IDBObjectStoreParameters`](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object
### Initialize database
```js
const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } }
]);
```
You can also provide fourth argument `options` described in [`new IDB`](https://lr0pb.github.io/IDB.js/classes/IDB#constructor)
### Set items in stores
Add item to store via simple `db.set` method
> `db.set` support second argument to be one item or an array of items
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
### Check is item are in store and update them
Check if store have certain item via `db.has` and update them via `db.update`
> `db.has` and `db.update` support second argument to be one item's key or an array of item keys
```js
async function addBook() {
  const book = {
    id: 12345,
    title: `Hercule Poirot's Christmas`,
    author: 'Agatha Christie',
    genre: 'Mysteries'
  };
  await db.set('books', book);
  const isAuthorExist = await db.has('authors', book.author);
  if (isAuthorExist) {
    await db.update('authors', book.author, async (author) => {
      author.books.push(book.id);
      await sendAnalytics();
    });
  }
}
```
> `UpdateCallback` function in [`db.update`](https://lr0pb.github.io/IDB.js/classes/IDB#update) can be **async**

> If you provide multiple keys, `UpdateCallback` will be called for each item. If you want to use separate `UpdateCallback` functions for each item, provide array of `UpdateCallback` functions **same length** as item keys array length

> `db.has` also can return count of items in store: just call it only with store name `db.has('books'); // 1`

### Read store entries
Get one item via `db.get` and all store items via `db.getAll`
> `db.get` support second argument to be one item's key or an array of item keys
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

async function renderBooks() {
  const books = await db.getAll('books');
  for (let book of books) {
    renderBook(book);
  }
}
```
Additionally, you can set callback for running function every time new item receives from database, its best for speeding up processes like rendering
```js
async function renderBooksProgressive() {
  await db.getAll('books', (book) => {
    renderBook(book);
  });
}
```
> `DataReceivingCallback` function in [`db.getAll`](https://lr0pb.github.io/IDB.js/classes/IDB#getAll) MUST be **sync** or it will not wait for asynchronous function completed

### Item and stores deletion
Delete whole store simply via upgrading database version and remove relevant `StoreDefinition` object from `stores` array. Delete one item via `db.delete` and clear all store entries via `db.deleteAll`
> `db.delete` support second argument to be one item's key or an array of item keys
```js
const db = new IDB('library', 2, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } }
]);
// 'manufacturers' store was deleted at all, it cannot be longer accessed

async function deleteBooks() {
  await db.delete('books', 12345);
  await db.delete('books', [
    67890, 34567, ...
  ]);
  await db.deleteAll('author'); // authors store still available but have no items
}
```
### Listen for store updates
You can register multiple callbacks to spot if items added, updated or deleted from the store. These callbacks called after actual operation with data in order to when they are registered.
To unregister callback, call returned from `db.onDataUpdate` function [`UnregisterListener`](https://lr0pb.github.io/IDB.js/classes/IDB#onDataUpdate)
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
> `DataUpdatedCallback` function in [`db.onDataUpdate`](https://lr0pb.github.io/IDB.js/classes/IDB#onDataUpdate) can be **async**

# Changes
View all changes during versions in [CHANGELOG](https://github.com/lr0pb/IDB.js/tree/main/CHANGELOG.md)
# License
IDB.js distributed under the [MIT](https://github.com/lr0pb/IDB.js/tree/main/LICENSE) license
# API
View whole API documentation [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)
# Develop
Clone this repo on your machine and run `npm i` in a root

Write tests to your code in [`www/mocha.test.js`](https://github.com/lr0pb/IDB.js/tree/main/www/mocha.test.js) file and run its via `npm start` (will be open default browser window with tests page hosted by local server)
