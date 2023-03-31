import mocha from 'mocha/mocha';
import { assert } from 'chai';
// this IDB import file creates dinamically within dev server
import { IDB } from '/IDB.js';

import has from './has.test';
import set from './set.test';
import get from './get.test';
import update from './update.test';
import getAll from './getAll.test';
// using underscore at the end because regular `delete` is reserved word
import delete_ from './delete.test';
import followDataUpdates from './followDataUpdates.test';

// All test files import functions should be placed in this object
// to be automatically called
const tests = {
  has,
  set,
  get,
  update,
  getAll,
  delete_,
  followDataUpdates,
};

// Test db object is stored in this container object
// and then container object passed to test function
const container = {
  db: null,
};

// Helper function to check items count in the store
async function checkStore(store, count) {
  const items = await container.db.has(store);
  assert.strictEqual(items, count);
}

mocha.setup('bdd');

before('open database', async () => {
  try {
    container.db = new IDB('database', 1, [
      { name: 'one', index: { autoIncrement: true } },
      { name: 'two', index: { keyPath: 'id' } },
      { name: 'three', index: { keyPath: 'id' } },
      { name: 'six', index: { autoIncrement: true } },
    ], {
      showLogs: true,
    });
  } catch (error) {
    assert.notExists(error);
  }
  assert.instanceOf(container.db, IDB);
});

for (const key in tests) {
  describe(`db.${key}`, () => tests[key](container, checkStore));
}

mocha.run();
