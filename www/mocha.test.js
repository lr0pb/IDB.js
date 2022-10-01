import 'https://unpkg.com/chai/chai.js';
import 'https://unpkg.com/mocha/mocha.js';
import { IDB } from './IDB.js';

var assert = chai.assert;

mocha.setup('bdd');
//mocha.checkLeaks();

let db = null;
let unregister = null;
const item1 = { prop: 'num2', id: 'id123' };
const item2 = { prop: 'num3', id: 'id234' };

async function checkStore(store, count) {
  const items = await db.has(store);
  assert.strictEqual(items, count);
}

async function isArray(array) {
  const isArray = Array.isArray(array);
  assert.isTrue(isArray);
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

  it('set item to autoIncrement store', async () => {
    const resp = await db.set('one', { prop: 'num1' });
    assert.isTrue(resp);
    await checkStore('one', 1);
  });

  it('register for data updates on store', async () => {
    unregister = await db.onDataUpdate('two', (args) => {
      it('response from onDataUpdate', () => {
        assert.typeOf(args, 'object');
      });
    });
    assert.typeOf(unregister, 'function');
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

  it('unregister listener for store', () => {
    unregister();
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
    isArray(resp);
    assert.equal(JSON.stringify(resp[0]), JSON.stringify(item1));
    assert.equal(JSON.stringify(resp[1]), JSON.stringify(item2));
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
    isArray(items);
    assert.equal(items[0].prop, 'num9');
    assert.equal(items[1].prop, 'num9');
  });

  it('plain db.getAll', async () => {
    const items = await db.getAll('three');
    isArray(items);
    assert.equal(items.length, 4);
  });

  it('db.getAll with callback', async () => {
    const items = await db.getAll('three', (item) => {
      assert.isTrue('prop' in item);
    });
  });

  it('db.getAll in empty store', async () => {
    const resp = await db.getAll('six');
    assert.equal(JSON.stringify(resp), '[]');
  });

  it('db.delete for one item', async () => {
    await db.delete('three', 'id345');
    await checkStore('three', 3);
  });

  it('db.delete multiple items', async () => {
    await db.delete('three', [
      'id456', 'id567'
    ]);
    await checkStore('three', 1);
  });
});

mocha.run();
