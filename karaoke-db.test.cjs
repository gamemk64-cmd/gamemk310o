const test = require('node:test');
const assert = require('node:assert/strict');
const DB = require('../karaoke-database.js');

test('local cache saves, finds and removes a song', async () => {
  const track = { id: 'db-test-1', title: 'Example Song', artist: 'Example Artist', dur: 180 };
  const result = { kind: 'word', source: 'test provider', message: 'word timings', lines: [{ t: 1, text: 'hello', wordSynced: true, words: [{ text: 'hello', t: 1, end: 1.5 }] }] };
  const saved = await DB.save(track, result);
  assert.ok(saved.id);
  const found = await DB.find(track);
  assert.equal(found.trackKey, saved.trackKey);
  assert.equal(DB.asResult(found).kind, 'word');
  assert.equal(await DB.remove(saved.id), true);
});

test('library export/import preserves cached entries', async () => {
  const track = { id: 'db-test-2', title: 'Export Track', artist: 'Export Artist' };
  const result = { kind: 'lrc', source: 'test', lines: [{ t: 0, text: 'line', words: [], wordSynced: false }] };
  const saved = await DB.save(track, result);
  const exported = await DB.exportAll();
  assert.ok(exported.entries.some(entry => entry.id === saved.id));
  const count = await DB.importAll(exported);
  assert.ok(count >= 1);
  await DB.remove(saved.id);
});

test('YouTube metadata title and artist aliases use the same key', () => {
  const raw = { id: 'x', title: 'Example Artist - Example Song (Official Video)', artist: 'YouTube' };
  const canonical = { id: 'x', title: 'Example Song', artist: 'Example Artist' };
  assert.equal(DB.trackKey(raw), DB.trackKey(canonical));
});
