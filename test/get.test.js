import { assert } from 'chai/index.mjs';

let unregister = null;
let setResponse = null;

const item1 = { prop: 'num2', id: 'id123' };
const item2 = { prop: 'num3', id: 'id234' };

export default function (container, checkStore) {
  it('db.get for one item', async () => {
    const item = await container.db.get('two', 'id123');
    assert.equal(JSON.stringify(item), JSON.stringify(item1));
  });
  
  it('db.get for multiple items', async () => {
    const resp = await container.db.get('two', ['id123', 'id234']);
    assert.isArray(resp);
    assert.equal(JSON.stringify(resp[0]), JSON.stringify(item1));
    assert.equal(JSON.stringify(resp[1]), JSON.stringify(item2));
  });

  it('db.get for item that not exist', async () => {
    const resp = await container.db.get('two', '1');
    assert.isNotArray(resp);
    assert.notExists(resp);
  });

  it('db.get for multiple items, but give only 1 item', async () => {
    const resp = await container.db.get('two', ['id123']);
    assert.isArray(resp);
    assert.equal(resp.length, 1);
    assert.equal(JSON.stringify(resp[0]), JSON.stringify(item1));
  });

  it('db.get for multiple items, that not exist', async () => {
    const resp = await container.db.get('two', ['1', '2']);
    assert.isArray(resp);
    assert.equal(resp.length, 2);
    resp.forEach((elem) => {
      assert.notExists(elem);
    });
  });

  it('db.get for mulptiple items, when not all exist', async () => {
    const resp = await container.db.get('two', ['id123', '1', 'id234', '2']);
    assert.isArray(resp);
    assert.equal(resp.length, 4);
    resp.forEach((elem, i) => {
      i % 2 ? assert.notExists(elem) : assert.isObject(elem);
    });
  });
}
