# v2.1.0 (11-03-2023)
## 🛠️ Accidents create progress
While working on React integration I accidentally push experimental version as `latest` tag on NPM. So, I decide to cut of React content from this release and push normal `2.1.0` over expermental one
- update all type parameters from `Type` and `Key` to short version `T` & `K`
- remove `showErrorsAsLogs` property from `IDBOptions`
- **Important:** remove `| void` part from method response types (if this isn't the behavior of the method) and this methods now *just* throws errors when something is wrong

# v2.0.5 (31-01-2023)
## 📝 Fixes in package distribution
- remove tests output folder from package build
- fix that types declaration file was not contain in package
- change version tags pattern from `v.2.x.x` to `v2.x.x`

# v.2.0.4 (30-01-2023)
## 🚀 Publish package to NPM
IDB.js now available via [`npm`](https://www.npmjs.com/package/@lr0pb/idb)
```
npm install @lr0pb/idb
```

# v.2.0.3 (13-01-2023)
## 🛠️ Patch db.get call with multiple keys
- fix that `db.get` when call with multiple keys but it is actually 1 key in array return requested item instead return it as alone item in array
- rename package's iife build in [`/out`](./out/) from `IDB.worker.js` to `IDB.iife.js`
  > As of 2.0.4 onwards package builds publish only on [`npm`](https://www.npmjs.com/package/@lr0pb/idb)

# v.2.0.2 (11-01-2023)
## 🛠️ Patch db.onDataUpdate not call listeners after deleting events
- fix that `db.onDataUpdate` not call listeners when `delete` and `deleteAll` events happened in the listened store

# v.2.0.1 (02-10-2022)
## 🛠️ Patch items receiving methods
- fix `db.get` return empty array instead of `undefined` for item that not exist
- fix `db.get` for multiple items return only items that exist instead of mixed values array that contains `undefined` for keys by which items are not exists
- fix `db.getAll` return undefined when store is empty instead of empty array

# v.2.0.0 (01-10-2022)
## 🔬 Simplify data related actions and rewrite everything to TypeScript
**Breaking changes:**
- `db.setItem` renamed to `db.set`
- `db.getItem` renamed to `db.get`
- `db.hasItem` renamed to `db.has`
- `db.updateItem` renamed to `db.update`
- `db.deleteItem` renamed to `db.delete`

All new methods support `second argument` to be an `array of items/item keys` to manipulate with mulptiple items inside one transaction

All `API` docs now generated from source code by [`TypeDoc`](https://typedoc.org) and live on [GitHub Pages](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

Add tests for most use cases. Its source code available in [`test/mocha.test.js`](https://github.com/lr0pb/IDB.js/tree/main/test/mocha.test.js)

# v.1.0.1 (02-09-2022)
## 📜 README.md docs update
Update `README.md` file `API` section generation. Return `boolean` in `db.onDataUpdate` that represents is listener was registered or not

# v.1.0.0 (02-09-2022)
## 📦 Publish first vesion of IDB.js
Release contains basic functionality like writing and reading items to and from database
- `db.setItem`
- `db.getItem`
- `db.getAll`
- `db.hasItem`
- `db.updateItem`

Also some additional useful things:
- callback for `db.getAll` function for progressivelly read all items from store
- set listeners for data updates in stores via `db.onDataUpdate`
