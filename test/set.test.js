import { assert } from 'chai/index.mjs';

let unregister = null;
let setResponse = null;

const item1 = { prop: 'num2', id: 'id123' };
const item2 = { prop: 'num3', id: 'id234' };

export default function (container, checkStore) {
  it('register for data updates on store', async () => {
    unregister = await container.db.onDataUpdate('one', (args) => {
      setResponse = args;
    });
    assert.typeOf(unregister, 'function');
  });

  it('set item to autoIncrement store', async () => {
    const resp = await container.db.set('one', { prop: 'num1' });
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
    const items = [ item1, item2 ];
    await container.db.set('two', items);
    const check = await container.db.has('two', items.map((item) => item.id));
    assert.deepEqual(check, Array(items.length).fill(true));
  });

  it('container.db.has for item in index store', async () => {
    const haveItem = await container.db.has('two', 'id123');
    assert.isTrue(haveItem);
  });

  it('fill store with multimple items from scratch', async () => {
    await container.db.set('three', [
      { prop: 'num4', id: 'id345' },
      { prop: 'num5', id: 'id456' },
      { prop: 'num6', id: 'id567' },
      { prop: 'num7', id: 'id678' },
    ]);
    await checkStore('three', 4);
  });
}
