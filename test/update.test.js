import { assert } from 'chai/index.mjs';

let unregister = null;
let setResponse = null;

export default function (container, checkStore) {
  it('db.update for one item', async () => {
    const item = await container.db.update('two', 'id123', (item) => {
      item.prop = 'num8';
    });
    assert.equal(item?.prop, 'num8');
  });
  
  it('db.update for multiple items with one func', async () => {
    const items = await container.db.update('two', [
      'id123', 'id234',
    ], (item) => {
      item.prop = 'num9';
    });
    assert.isArray(items);
    assert.equal(items[0].prop, 'num9');
    assert.equal(items[1].prop, 'num9');
  });
}
