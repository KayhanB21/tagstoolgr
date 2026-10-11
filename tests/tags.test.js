import test from 'node:test';
import assert from 'node:assert/strict';
import {collectIds, updateTags} from '../src/tags.js';

function mock() {
  const records = new Map([[1, ['$old']], [2, ['$two']]]);
  return {records, tags: {list: async () => [{key: '$new'}, {key: '$old'}]},
    get: async id => { if (!records.has(id)) throw new Error('Message moved'); return {tags: records.get(id)}; },
    update: async (id, properties) => { if (!records.has(id)) throw new Error('Message moved'); assert.deepEqual(Object.keys(properties), ['tags']); records.set(id, properties.tags); }};
}
test('collects all pages and deduplicates message IDs', async () => {
  const api = {continueList: async id => { assert.equal(id, 'next'); return {messages: [{id: 2}, {id: 3}]}; }};
  assert.deepEqual(await collectIds(api, {id: 'next', messages: [{id: 1}, {id: 2}]}), [1, 2, 3]);
});
test('adding preserves each message’s existing tags and deduplicates', async () => {
  const api = mock();
  assert.deepEqual(await updateTags(api, [1, 2, 1], 'add', ['$new', '$old']), {updated: 2, failed: 0, errors: []});
  assert.deepEqual(api.records.get(1), ['$old', '$new']);
  assert.deepEqual(api.records.get(2), ['$two', '$new', '$old']);
});
test('replace writes exactly the chosen tags', async () => {
  const api = mock();
  await updateTags(api, [1, 2], 'replace', ['$new']);
  assert.deepEqual([...api.records.values()], [['$new'], ['$new']]);
});
test('clear leaves emails untagged without changing tag definitions', async () => {
  const api = mock();
  api.tags.list = () => { throw new Error('Clear must not depend on tag definitions'); };
  await updateTags(api, [1, 2], 'clear', []);
  assert.deepEqual([...api.records.values()], [[], []]);
});
test('a failed message does not prevent later messages updating', async () => {
  const api = mock();
  const result = await updateTags(api, [99, 1, 2], 'add', ['$new']);
  assert.equal(result.updated, 2);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.errors, ['Message moved']);
});
test('rejects deleted tags, empty choices, invalid actions, and empty selections before changes', async () => {
  const api = mock();
  await assert.rejects(updateTags(api, [1], 'replace', ['$deleted']), /deleted/);
  await assert.rejects(updateTags(api, [1], 'replace', []), /Choose/);
  await assert.rejects(updateTags(api, [1], 'invalid', ['$new']), /Unknown/);
  await assert.rejects(updateTags(api, [], 'clear', []), /Select/);
  assert.deepEqual(api.records.get(1), ['$old']);
});
