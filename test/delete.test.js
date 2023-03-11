import { assert } from 'chai/index.mjs';

let unregister = null;
let deleteResponse = null;
let deleteAllResponse = null;

export default function (container, checkStore) {
  it('register for "delete" onDataUpdate', async () => {
    unregister = await container.db.onDataUpdate('three', (args) => {
      deleteResponse = args;
    });
  });

  it('db.delete for one item', async () => {
    await container.db.delete('three', 'id345');
    await checkStore('three', 3);
  });

  it('type "delete" response from onDataUpdate', () => {
    assert.typeOf(deleteResponse, 'object');
    assert.equal(deleteResponse.type, 'delete');
    unregister();
  });

  it('db.delete multiple items', async () => {
    await container.db.delete('three', [
      'id456', 'id567'
    ]);
    await checkStore('three', 1);
  });

  it('register for "deleteAll" onDataUpdate', async () => {
    unregister = await container.db.onDataUpdate('three', (args) => {
      deleteAllResponse = args;
    });
  });

  it('db.deleteAll call', async () => {
    await container.db.deleteAll('three');
    await checkStore('three', 0);
  });

  it('type "deleteAll" response from onDataUpdate', () => {
    assert.typeOf(deleteAllResponse, 'object');
    assert.equal(deleteAllResponse.type, 'deleteAll');
    unregister();
  });
}
