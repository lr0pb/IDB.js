# v.1.0.1 (02-09-2022)
## Huge README.md update
Update `README.md` file `API` section generation. Return `boolean` in `db.onDataUpdate` that represents is listener was registered or not

# v.1.0.0 (02-09-2022)
## Publish first vesion of 📦 IDB.js
Release contains basic functionality like writing and reading items to and from database.
- `db.setItem`
- `db.getItem`
- `db.getAll`
- `db.hasItem`
- `db.updateItem`

Also some additional useful things:
- callback for `db.getAll` function for progressivelly read all items from store
- set listeners for data updates in stores via `db.onDataUpdate`
