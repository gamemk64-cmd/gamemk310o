const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const next = html.slice(start).search(/\n(?:function |let |const |\/\*|window\.|document\.|\$\()/);
  return html.slice(start, next < 0 ? undefined : start + next).trim();
}
const names = ['collectLyricCandidates','stampSeconds','wordWeight','tokenizeWords','parseLrc','lyricSyllableCount','computeLyricRates','estimateWordTimes','scoreLyricsResult','fmtLrcStamp','fillTapTimes','buildTapLrc','exportLrcLine'];
const code = names.map(extractFunction).join('\n\n') + '\nglobalThis.api={' + names.join(',') + '};';
const sandbox = { console, window: {}, setTimeout, clearTimeout, Promise };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const api = sandbox.api;

test('stamp formatting never produces 60.00 seconds', () => {
  assert.equal(api.fmtLrcStamp(59.996), '01:00.00');
  assert.equal(api.fmtLrcStamp(0), '00:00.00');
  assert.equal(api.fmtLrcStamp(125.5), '02:05.50');
});

test('enhanced LRC: single words end where the next word starts', () => {
  const rows = api.parseLrc('[00:01.00]<00:01.00>one <00:01.30>two <00:02.10>');
  const w = rows[0].words;
  assert.equal(w.length, 2);
  assert.ok(Math.abs(w[0].end - 1.3) < 1e-6, 'first word ends at 1.30, not start+1s');
  assert.ok(Math.abs(w[1].end - 2.1) < 1e-6);
  assert.equal(rows[0].wordSynced, true);
});

test('line tap mode round-trips through parseLrc', () => {
  const raw = api.buildTapLrc(['Hello there', 'General Kenobi'], [1.5, 4.25], 'lines', 10);
  const rows = api.parseLrc(raw);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].t, 1.5);
  assert.equal(rows[1].t, 4.25);
  assert.equal(rows[1].text, 'General Kenobi');
});

test('word tap mode round-trips with exact word starts and bounded ends', () => {
  const raw = api.buildTapLrc(['Hello big world', 'Again'], [1.0, 1.4, 2.0, 5.0], 'words', 9);
  const rows = api.parseLrc(raw);
  assert.equal(rows.length, 2);
  const w = rows[0].words;
  assert.deepEqual([...w.map(x => x.text.trim())], ['Hello', 'big', 'world']);
  assert.deepEqual([...w.map(x => x.t)], [1.0, 1.4, 2.0]);
  assert.ok(w[0].end <= 1.4 && w[0].end > 1.0);
  assert.ok(w[2].end > 2.0 && w[2].end <= 5.0, 'last word ends before next line starts');
  assert.equal(rows[0].text, 'Hello big world');
  assert.equal(rows[1].t, 5.0);
});

test('word gap inside a line is kept (long pause between words)', () => {
  const raw = api.buildTapLrc(['aa bb'], [1.0, 9.0], 'words', 12);
  const w = api.parseLrc(raw)[0].words;
  assert.ok(w[0].end < 6, 'first word does not stretch across the 8 s gap');
});

test('incomplete taps are filled monotonically up to the end time', () => {
  const t = api.fillTapTimes([2, 4], 6, 20);
  assert.equal(t.length, 6);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
  assert.ok(t[5] < 20);
});

test('export keeps word timings when editing lyrics text', () => {
  const rows = api.parseLrc('[00:01.00]<00:01.00>one <00:01.30>two <00:02.10>');
  const again = api.parseLrc(api.exportLrcLine(rows[0]));
  assert.deepEqual(again[0].words.map(w => w.t), rows[0].words.map(w => w.t));
});

test('source scoring prefers word timing, then fitting line timing, then plain', () => {
  const word = { kind: 'word', lines: [{ t: 1, wordSynced: true }, { t: 100, wordSynced: true }] };
  const lrc = { kind: 'lrc', lines: [{ t: 1 }, { t: 100 }] };
  const plain = { kind: 'plain', lines: [{ t: 1 }, { t: 100 }] };
  assert.ok(api.scoreLyricsResult(word, 120) > api.scoreLyricsResult(lrc, 120));
  assert.ok(api.scoreLyricsResult(lrc, 120) > api.scoreLyricsResult(plain, 120));
  const wrongTrack = { kind: 'lrc', lines: [{ t: 1 }, { t: 400 }] };
  assert.ok(api.scoreLyricsResult(lrc, 120) > api.scoreLyricsResult(wrongTrack, 120), 'timeline longer than the track is penalised');
});

test('per-section tempo: dense verse is faster than sparse chorus', () => {
  const L = [];
  for (let i = 0; i < 6; i++) L.push({ t: i * 2, text: 'раз два три четыре пять шесть семь' });
  for (let i = 0; i < 6; i++) L.push({ t: 12 + i * 6, text: 'ооо ааа' });
  api.computeLyricRates(L, 'lrc');
  assert.ok(L[2]._rate > L[9]._rate * 1.5);
  assert.ok(sandbox.window.__lrcTempo > 0);
});

test('source picker waits briefly for a word-synced answer and prefers it over a faster line-synced one', async () => {
  const lrc = { kind: 'lrc', lines: [{ t: 1 }, { t: 50 }], source: 'fast-lrc' };
  const word = { kind: 'word', lines: [{ t: 1, wordSynced: true }, { t: 50, wordSynced: true }], source: 'slow-word' };
  const res = await sandbox.api.collectLyricCandidates([
    ['a', () => new Promise(r => setTimeout(() => r(lrc), 5))],
    ['b', () => new Promise(r => setTimeout(() => r(word), 300))],
    ['c', () => Promise.reject(new Error('down'))]
  ], 60, () => false);
  assert.equal(res.length, 2);
  assert.equal(res[0].source, 'slow-word');
});

test('source picker returns at once when a precise word-synced result arrives first', async () => {
  const word = { kind: 'word', lines: [{ t: 1, wordSynced: true }, { t: 50, wordSynced: true }], source: 'word' };
  const t0 = Date.now();
  const res = await sandbox.api.collectLyricCandidates([
    ['a', () => Promise.resolve(word)],
    ['b', () => new Promise(r => setTimeout(() => r(null), 3000))]
  ], 60, () => false);
  assert.equal(res[0].source, 'word');
  assert.ok(Date.now() - t0 < 1000, 'did not wait for the slow provider');
});

test('source picker survives every provider failing', async () => {
  const res = await sandbox.api.collectLyricCandidates([['a', () => Promise.reject(new Error('x'))], ['b', () => Promise.resolve(null)]], 60, () => false);
  assert.equal(res.length, 0);
});
