import mocha from 'mocha/mocha';
import { assert } from 'chai/index.mjs';
import { IDB } from '/IDB.js';

mocha.setup('bdd');
//mocha.checkLeaks();

let db = null;
let unregister = null;
let setResponse = null;
let deleteResponse = null;
let deleteAllResponse = null;
const item1 = { prop: 'num2', id: 'id123' };
const item2 = { prop: 'num3', id: 'id234' };

async function checkStore(store, count) {
  const items = await db.has(store);
  assert.strictEqual(items, count);
}

describe('IDB', () => {
  it('open database', () => {
    try {
      db = new IDB('database', 1, [
        { name: 'one', index: {autoIncrement: true} },
        { name: 'two', index: {keyPath: 'id'} },
        { name: 'three', index: {keyPath: 'id'} },
        { name: 'six', index: {autoIncrement: true} },
      ], {
        showErrorsAsLogs: true
      });
    } catch (err) {
      should.not.exist(err);
    }
    assert.instanceOf(db, IDB);
  });

  it('db.has must return count of item in store', async () => {
    const resp = await db.has('one');
    assert.typeOf(resp, 'number', `received resp: ${resp}`);
  });

  it('delete all items from store', async () => {
    await db.deleteAll('one');
    await checkStore('one', 0);
  });

  it('register for data updates on store', async () => {
    unregister = await db.onDataUpdate('one', (args) => {
      setResponse = args;
    });
    assert.typeOf(unregister, 'function');
  });

  it('set item to autoIncrement store', async () => {
    const resp = await db.set('one', { prop: 'num1' });
    assert.isTrue(resp);
    await checkStore('one', 1);
  });

  it('type "set" response from onDataUpdate', () => {
    assert.typeOf(setResponse, 'object');
    assert.equal(setResponse.type, 'set');
  });

  it('unregister listener for store', () => {
    unregister();
  });

  it('set multimple items at once', async () => {
    await db.set('two', [
      item1, item2,
    ]);
    await checkStore('two', 2);
  });

  it('db.has for item in index store', async () => {
    const haveItem = await db.has('two', 'id123');
    assert.isTrue(haveItem);
  });
  
  it('fill store to future manipulations', async () => {
    await db.set('three', [
      { prop: 'num4', id: 'id345' },
      { prop: 'num5', id: 'id456' },
      { prop: 'num6', id: 'id567' },
      { prop: 'num7', id: 'id678' },
    ]);
    await checkStore('three', 4);
  });
  
  it('db.get for one item', async () => {
    const item = await db.get('two', 'id123');
    assert.equal(JSON.stringify(item), JSON.stringify(item1));
  });
  
  it('db.get for multiple items', async () => {
    const resp = await db.get('two', ['id123', 'id234']);
    assert.isArray(resp);
    assert.equal(JSON.stringify(resp[0]), JSON.stringify(item1));
    assert.equal(JSON.stringify(resp[1]), JSON.stringify(item2));
  });

  it('db.get for item that not exist', async () => {
    const resp = await db.get('two', '1');
    assert.isNotArray(resp);
    assert.notExists(resp);
  });

  it('db.get for multiple items, but give only 1 item', async () => {
    const resp = await db.get('two', ['id123']);
    assert.isArray(resp);
    assert.equal(resp.length, 1);
    assert.equal(JSON.stringify(resp[0]), JSON.stringify(item1));
  });

  it('db.get for multiple items, that not exist', async () => {
    const resp = await db.get('two', ['1', '2']);
    assert.isArray(resp);
    assert.equal(resp.length, 2);
    resp.forEach((elem) => {
      assert.notExists(elem);
    });
  });

  it('db.get for mulptiple items, when not all exist', async () => {
    const resp = await db.get('two', ['id123', '1', 'id234', '2']);
    assert.isArray(resp);
    assert.equal(resp.length, 4);
    resp.forEach((elem, i) => {
      i % 2 ? assert.notExists(elem) : assert.isObject(elem);
    });
  });
  
  it('db.update for one item', async () => {
    const item = await db.update('two', 'id123', (item) => {
      item.prop = 'num8';
    });
    assert.equal(item?.prop, 'num8');
  });
  
  it('db.update for multiple items with one func', async () => {
    const items = await db.update('two', [
      'id123', 'id234',
    ], (item) => {
      item.prop = 'num9';
    });
    assert.isArray(items);
    assert.equal(items[0].prop, 'num9');
    assert.equal(items[1].prop, 'num9');
  });

  it('plain db.getAll', async () => {
    const items = await db.getAll('three');
    assert.isArray(items);
    assert.equal(items.length, 4);
  });

  it('db.getAll with callback', async () => {
    await db.getAll('three', (item) => {
      assert.isTrue('prop' in item);
    });
  });

  it('db.getAll in empty store', async () => {
    const resp = await db.getAll('six');
    assert.isArray(resp);
    assert.equal(resp.length, 0);
  });

  it('register for "delete" onDataUpdate', async () => {
    unregister = await db.onDataUpdate('three', (args) => {
      deleteResponse = args;
    });
  });

  it('db.delete for one item', async () => {
    await db.delete('three', 'id345');
    await checkStore('three', 3);
  });

  it('type "delete" response from onDataUpdate', () => {
    assert.typeOf(deleteResponse, 'object');
    assert.equal(deleteResponse.type, 'delete');
    unregister();
  });

  it('db.delete multiple items', async () => {
    await db.delete('three', [
      'id456', 'id567'
    ]);
    await checkStore('three', 1);
  });

  it('register for "deleteAll" onDataUpdate', async () => {
    unregister = await db.onDataUpdate('three', (args) => {
      deleteAllResponse = args;
    });
  });

  it('db.deleteAll call', async () => {
    await db.deleteAll('three');
    await checkStore('three', 0);
  });

  it('type "deleteAll" response from onDataUpdate', () => {
    assert.typeOf(deleteAllResponse, 'object');
    assert.equal(deleteAllResponse.type, 'deleteAll');
    unregister();
  });
});

mocha.run();
