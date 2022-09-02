# 📦 IDB.js

**IDB.js** is a lightweight high-level promise-based wrapper for fast access to IndexedDB API

# How to use
Open a new database by creating new instance of class. Provide database name, version and arrays of StoreDefinition object
```ts
interface StoreDefinition {
  name: string,
  index: {
    keyPath?: string,
    autoIncrement?: boolean
  }
}
```
StoreDefinition.index is [IDBObjectStoreParameters](https://w3c.github.io/IndexedDB/#dictdef-idbobjectstoreparameters) object
## Initialize database
```js
const db = new IDB('library', 1, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } },
  { name: 'manufacturers', index: { autoIncrement: true } }
]);
```
## Set items in stores
Add items to stores via simple db.setItem method
```js
async function addAuthor(books) {
  await db.setItem('authors', {
    name: 'Agatha Christie',
    books: []
  });
}
```
## Check is item are in store and update them
Check if store have certain item via db.hasItem and update them via db.updateItem
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
    await db.updateItem('authors', book.author, (author) => {
      author.books.push(book.id);
    });
  }
}
```
## Read store entries
Get one item via db.getItem and all store items via db.getAll
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
## Item and stores deletion
Delete whole store simply via upgrading database version and remove relevant StoreDefinition object from stores array. Delete one item via db.deleteItem and clear all store entries via db.deleteAll
```js
const db = new IDB('library', 2, [
  { name: 'books', index: { keyPath: 'id' } },
  { name: 'authors', index: { keyPath: 'name' } }
]);

async function deleteBooks() {
  await db.deleteItem('books', 12345);
  await db.deleteAll('author');
}
```
# API
## new IDB(name: string, version: number, objectStores: StoreDefinition[], options?: IDBOptions)
Create database and return its wrapper
- **name** - Database name
- **version** - Database version
- **objectStores** - stores that will create and update with database version change
- **StoreDefinition**
```ts
interface StoreDefinition {name: string, index: {keyPath?: string, autoIncrement?: boolean}}
```
- **options** - Options for IDB object
- **IDBOptions** - Hide technical logs about database lifecycle events
```ts
interface IDBOptions {hideLogs?: boolean}
```
## db.setItem(store: string, item: any)
Add or update item in the store
- **store** - Name of database store
- **item** - Serializable object that IDB can store
## db.getItem(store: string, itemKey: any)
Receive item from store by default store key
- **store** - Name of database store
- **itemKey** - Key value to access item in store
## db.updateItem(store: string, updateCallback: UpdateCallback)
Sugar for getting, modifying and setting item back to the store
- **store** - Name of database store
- **updateCallback** - Async function that receives item and can directly modify them
- **UpdateCallback** - No returned value needed
```ts
function UpdateCallback(item: any) {}
```
## db.getAll(store: string, onData: DataReceivingCallback)
Receive all items from the store
- **store** - Name of database store
- **onData** - function that calls every time when next item is received
- **DataReceivingCallback** - Index is items position in store
```ts
function DataReceivingCallback(item: any, index: number) {}
```
## db.deleteItem(store: string, itemKey: any)
Delete item from store by store default key
- **store** - Name of database store
- **itemKey** - Key value to access item in store
## db.deleteAll(store: string)
Delete all items from the store
- **store** - Name of database store
## db.hasItem(store: string, itemKey: any)
Check for item with key exist or count how much items are in the store
- **store** - Name of database store
- **itemKey** - Key value to access item in store, if no key - return items amount in the store
## db.onDataUpdate(store: string, callback: DataUpdatedCallback)
Set a listener to the store that calls every time some changes in the store happened
- **store** - Name of database store
- **callback** - Async function that calls every time when some item in the store modified
- **DataUpdatedCallback** - Item is presented only if some item was added or updated
```ts
function DataUpdatedCallback(store: string, item: any) {}
```
