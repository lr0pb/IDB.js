# v.2.0.1 (02-10-2022)
## 🛠️ Patch items receiving methods
- fix `db.get` return empty array instead undefined for item that not exist
- fix `db.get` for multiple items return only items that exist
- fix `db.getAll` return undefined when store is empty

# v.2.0.0 (01-10-2022)
## 🔬 Simplify data related actions and rewrite all to TypeScript
**Breaking changes:**
- `db.setItem` renamed to `db.set`
- `db.getItem` renamed to `db.get`
- `db.hasItem` renamed to `db.has`
- `db.updateItem` renamed to `db.update`
- `db.deleteItem` renamed to `db.delete`

All new methods support `second argument` to be an `array of items/item keys` to manipulate with mulptiple items inside one transaction

All `API` docs now generated from source code by [`TypeDoc`](https://typedoc.org) and live on [GitHub Pages](https://lr0pb.github.io/IDB.js/classes/IDB.IDB)

Add tests for most use cases. Its source code available in [`www/mocha.test.js`](https://github.com/lr0pb/IDB.js/tree/main/www/mocha.test.js)

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
