import { assert } from 'chai/index.mjs';

export default function (container, checkStore) {
  it('db.has must return count of item in store', async () => {
    const resp = await container.db.has('one');
    assert.typeOf(resp, 'number', `received resp: ${resp}`);
  });

  it('db.has for empty store', async () => {
    await container.db.deleteAll('one');
    await checkStore('one', 0);
  });
}