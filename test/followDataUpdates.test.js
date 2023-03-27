import { assert } from 'chai';

let unregister = null;
let response = null;

const items = [
  { id: 'track1', value: 1 },
  { id: 'track2', value: 1 },
  { id: 'other', value: 1 },
];

async function sleep(time) {
  await new Promise((res) => { setTimeout(res, time) });
}

export default function (container, checkStore) {
  before('fill data to tests', async () => {
    await container.db.deleteAll('two');
    await container.db.set('two', items);
    const check = await container.db.has('two', items.map((item) => item.id));
    assert.deepEqual(check, Array(items.length).fill(true));
  });

  it('follow one item', async () => {
    unregister = await container.db.followDataUpdates(
      'two', 'track1', (item) => { response = item; }
    );
    assert.typeOf(unregister, 'function');
  });

  it('update tracked item', async () => {
    const item = { id: 'track1', value: 2 };
    await container.db.set('two', item);
    await sleep(5);
    assert.typeOf(response, 'object');
    assert.deepEqual(response, item);
    response = null;
  });

  it('update dedicated item', async () => {
    response = 'notMutatedString';
    const item = { id: 'track2', value: 2 };
    await container.db.set('two', item);
    await sleep(5);
    assert.equal(response, 'notMutatedString');
    response = null;
  });

  it('delete traked item', async () => {
    await container.db.delete('two', 'track1');
    await sleep(5);
    assert.isUndefined(response);
    response = null;
  });

  it('unregister follow listener', async () => {
    unregister();
    unregister = null;
    const item = { id: 'track1', value: 3 };
    await container.db.set('two', item);
    await sleep(5);
    assert.isNull(response);
  });

  it('follow multiple items', async () => {
    unregister = await container.db.followDataUpdates(
      'two', ['track1', 'other'], (item) => { response = item; }
    );
    assert.typeOf(unregister, 'function');
  });

  it('update one of followed items', async () => {
    const item = { id: 'track1', value: 4 };
    await container.db.set('two', item);
    await sleep(5);
    assert.isArray(response);
    assert.equal(response.length, 2);
    assert.deepEqual(response, [item, items[2]]);
    response = null;
  });

  it('delete one of followed items', async () => {
    await container.db.delete('two', 'track1');
    await sleep(5);
    assert.isArray(response);
    assert.equal(response.length, 2);
    assert.deepEqual(response, [undefined, items[2]]);
    response = null;
    unregister();
    unregister = null;
  });

  it('follow all items as the fallback', async () => {
    unregister = await container.db.followDataUpdates(
      'two', undefined, (item) => { response = item; }
    );
    assert.typeOf(unregister, 'function');
  });

  it('update multiple items', async () => {
    const item1 = { id: 'track1', value: 5 };
    const item2 = { id: 'track2', value: 5 };
    await container.db.set('two', [item1, item2]);
    await sleep(5);
    assert.isArray(response);
    assert.deepEqual(response, [items[2], item1, item2]);
    response = null;
    unregister();
    unregister = null;
  });

  it('explicitly follow all items', async () => {
    unregister = await container.db.followDataUpdates(
      'two', {getAll: true}, (item) => { response = item; }
    );
    assert.typeOf(unregister, 'function');
  });

  it('delete multiple items', async () => {
    await container.db.delete('two', ['track1', 'track2']);
    await sleep(5);
    assert.isArray(response);
    assert.deepEqual(response, [items[2]]);
    response = null;
  });

  it('delete all items', async () => {
    await container.db.deleteAll('two');
    await sleep(5);
    assert.isArray(response);
    assert.equal(response.length, 0);
    response = null;
    unregister();
    unregister = null;
  });

  it('follow item with number key', async () => {
    const key = 1234;
    unregister = await container.db.followDataUpdates(
      'two', key, (item) => { response = item; }
    );
    assert.typeOf(unregister, 'function');
    const item = { id: key, value: 1 };
    await container.db.set('two', item);
    await sleep(5);
    assert.typeOf(response, 'object');
    assert.deepEqual(response, item);
    response = null;
    unregister();
    unregister = null;
  });
}
