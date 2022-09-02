import { IDB } from './IDB.js'

console.log('IDB is ready to use');
console.log('if it is first run, there will be errors about not able to create objectStores:');

window.db = new IDB('database', 1, [
  { name: 'one', index: {autoIncrement: true} },
  { name: 'two', index: {keyPath: 'id'} },
  { name: 'three', index: {keyPath: 'id'} },
  { name: 'four' },
  { name: 'five', index: 'index' }
]);

window.runTests = async function runTests() {
  console.log(`error about not all args passed in constructor:`);
  new IDB('errorBase', 1);
  const setResp = await db.setItem('one', { prop: 'num1' });
  console.log(`response from setItem: ${setResp}`);
  await db.setItem('two', { prop: 'num2', id: 'id123' });
  await db.setItem('two', { prop: 'num3', id: 'id234' });
  await db.setItem('three', { prop: 'num4', id: 'id345' });
  await db.setItem('three', { prop: 'num5', id: 'id456' });
  await db.setItem('three', { prop: 'num6', id: 'id567' });
  const ais = await db.hasItem('one', 1);
  console.log(`autoIncrement store working: ${ais}`);
  const kps = await db.hasItem('two', 'id123');
  console.log(`keyPath store working: ${kps}`);
  const item = await db.getItem('one', 1);
  console.log(`read item from store, should be { prop: 'num1' }, it is: ${
    JSON.stringify(item)
  }`);
  await db.updateItem('two', 'id234', (item) => {
    console.log(`update item with id: ${item.id}, value: ${item.prop}`);
    item.prop = 'num7';
  });
  const allItems = await db.getAll('two', (item) => {
    console.log(`receive item with id: ${item.id}, value: ${item.prop}`);
  });
  console.log(`all items received by getAll: ${allItems.length}`);
  let itemsCount = await db.hasItem('three');
  console.log(`store should have 3 items, it have: ${itemsCount}`);
  await db.deleteItem('three', 'id345');
  itemsCount = await db.hasItem('three');
  console.log(`amount of items in store after deleting one: ${itemsCount}`);
  await db.deleteAll('three');
  itemsCount = await db.hasItem('three');
  console.log(`amount of items in store after deleting all: ${itemsCount}`);
  console.log(`error no store:`);
  await db.getItem('four', '123');
  console.log(`error no value:`);
  await db.deleteItem('two');
  console.log(`error wrong type:`);
  await db.updateItem('one', 1, true);
}
