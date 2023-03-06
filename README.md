# 📦 IDB.js

Lightweight high-level promise-based wrapper for fast access to IndexedDB API. With React integration ⚛️

[![Latest release](https://img.shields.io/github/v/release/lr0pb/IDB.js?&color=g&label=Version&logo=npm)](https://www.npmjs.com/package/@lr0pb/idb)
[![Publish package](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml/badge.svg)](https://github.com/lr0pb/IDB.js/actions/workflows/publishPackage.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@lr0pb/idb)](https://bundlephobia.com/package/@lr0pb/idb)

### Table of content
1. [Usage](#usage)
1. [Examples](#examples)
1. [Use with React](#use-with-react)
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

Use with React:
- [`IDBProvider` component](#idbprovider)
- [`useIDB` hook](#useidb-hook)
- [`useDataLinker` hook](#usedatalinker-hook)

### TypeSctipt support
IDB come out-of-the-box with types desclaration.
By using IDB in TS project, every data related method (exludes `deleteAll`) have a type parameters, where `T` stands for `Type` of data you operate and `K` stands for `Key` to access this data in the store.
You can learn detailed types annotation for the concrete method by clicking `[Ref]` link in the method description in this Readme or you can explore all types stuff [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

# Examples

### Set items to store
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#set) Add item to the store via `db.set(store, item | items[])` method
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
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#get) Get one or more items by keys with `db.get(store, key | keys[])` method
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
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#getAll) Read all items in the store with `db.getAll(store, DataReceivingCallback?)` method
```js
async function renderAllBooks() {
  const books = await db.getAll('books');
  books.forEach((book) => {
    renderBook(book);
  });
}
```
Additionally, you can set `DataReceivingCallback` that will be called every time new item receives from the database
```js
async function renderBooksProgressive() {
  await db.getAll('books', (book) => {
    renderBook(book);
  });
}
```
> `DataReceivingCallback` function must be **sync**

### Update items
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#update) Use `db.update(store, key | keys[], UpdateCallback)` to easier updating items in the store. It is actually simple wrapper for `get` and `set` methods
```js
async function addBookToAuthor(book) {
  await db.update('authors', book.author, async (author) => {
    // this callback function receives item object and you should apply changes directly to this object
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
async function deleteBooks() {
  await db.delete('books', 12345);
  await db.delete('books', [
    67890, 34567, ...
  ]);
  await db.deleteAll('author'); // authors store is still available but have no items
}
```

### Check that store contain items
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#has) Check if store have certain items via `db.has(store, key | keys[] | void)` or get amount of all items in the store by not passing `key` argument
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
[[Ref]](https://lr0pb.github.io/IDB.js/classes/IDB.IDB.html#onDataUpdate) You can register multiple listeners to spot changes that happened in the store with `db.onDataUpdate(store, StoreUpdatesListener)` method. These callbacks will be called after actual operation with data in order to time they are registered

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
> `StoreUpdatesListener` function can be **async**

# Use with React
All React-specific things can be accessed from `@lr0pb/idb/react` import

### IDBProvider
Place a [context](https://beta.reactjs.org/learn/passing-data-deeply-with-context) provider in the main component of your app:
```jsx
import { IDB } from '@lr0pb/idb';
import { IDBProvider } from '@lr0pb/idb/react';

const db = new IDB('library', 2, ...);

export function App({ children }) {
  return (
    <IDBProvider db={db}>
      {children}
    </IDBProvider>
  );
}
```

### useIDB hook
Now you can access your IDB instance everywhere in components deeper in your app
```jsx
import { useIDB } from '@lr0pb/idb/react';

export function BookInfo({ book }) {
  const db = useIDB();
  const addBook = async () => {
    await db.set('books', book);
  };
  return (
    <div className='book'>
      <img src={book.image} />
      <h3>{book.title}</h3>
      <button onClick={addBook}>📙 Add book</button>
    </div>
  );
}
```
You can use all IDB methods as usual, but pay attention that you should place all calls in either event callbacks or inside `useEffect` hook

### useDataLinker hook
> Before `2.1.0` will release this is subject to change

Often you need to render some data from the database. With `useDataLinker` hook can easily access this data and be sure that component will rerender as soon as data changes
```jsx
import { useDataLinker } from '@lr0pb/idb/react';

export function BooksList() {
  const books = useDataLinker('books', { getAll: true });
  if (!books.length) {
    return <h3>There are no books</h3>;
  }
  return (
    {books.map((book) => {
      return <BookInfo book={book} key={book.id} />;
    })}
  );
}
```
As items in store added, updated or deleted, your UI will automatically updated according to this changes

# API
View whole detailed API documentation with all the types and overloads [on docs site](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

# Changes

### Notable changes
- **2.1.0** Added integration with React

> View all changes during versions in [CHANGELOG](https://github.com/lr0pb/IDB.js/tree/main/CHANGELOG.md)

# License
IDB.js distributed under the [MIT](https://github.com/lr0pb/IDB.js/tree/main/LICENSE) license

# Develop
Clone repo on your machine and run `npm i`

Write tests in [`test/mocha.test.js`](https://github.com/lr0pb/IDB.js/blob/main/test/mocha.test.js) and run them via `npm run dev` (will start a development server and open default browser window with tests page)
