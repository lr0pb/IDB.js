import { assert } from 'chai/index.mjs';

let unregister = null;
let setResponse = null;

export default function (container, checkStore) {
  it('plain db.getAll', async () => {
    const items = await container.db.getAll('three');
    assert.isArray(items);
    assert.equal(items.length, 4);
  });

  it('db.getAll with callback', async () => {
    await container.db.getAll('three', (item) => {
      assert.isTrue('prop' in item);
    });
  });

  it('db.getAll in empty store', async () => {
    const resp = await container.db.getAll('six');
    assert.isArray(resp);
    assert.equal(resp.length, 0);
  });
}
