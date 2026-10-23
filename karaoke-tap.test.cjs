const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name} in index.html`);
  const next = html.slice(start).search(/\n(?:function |let |const |\/\*|window\.|document\.|\$\()/);
  return html.slice(start, next < 0 ? undefined : start + next).trim();
}
const code = [
  extractFunction('stampSeconds'),
  extractFunction('wordWeight'),
  extractFunction('tokenizeWords'),
  extractFunction('parseLrc'),
  extractFunction('estimateWordTimes'),
  extractFunction('calibratedLyricTime'),
  extractFunction('findLyricIndexAtTime'),
  extractFunction('inferLyricPause'),
  'globalThis.api={parseLrc,estimateWordTimes,calibratedLyricTime,findLyricIndexAtTime,inferLyricPause};'
].join('\n\n');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const api = sandbox.api;

test('LRC timestamps parse and repeated timestamps are preserved', () => {
  const rows = api.parseLrc('[00:01.00]first\n[00:01.00]second\n[00:04.50]third');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].t, 1);
  assert.equal(rows[1].t, 1);
  assert.equal(rows[2].t, 4.5);
});

test('word schedule has positive, ordered, non-zero intervals', () => {
  const words = api.estimateWordTimes({t: 2, text: 'hello world again'}, {t: 7});
  assert.equal(words.length, 3);
  for (const w of words) assert.ok(w.end > w.t);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].t >= words[i - 1].t);
  assert.ok(Math.abs(words.at(-1).end - 6.7) < 1e-9, 'estimated phrase follows the next line timestamp');
});

test('short intervals never exceed the next line start', () => {
  const words = api.estimateWordTimes({t: 1, text: 'one two three four'}, {t: 1.4});
  assert.ok(words.every(w => w.t >= 1 && w.end <= 1.4 + 1e-9));
});

test('pause marker appears only during a timestamp-supported gap', () => {
  const line = {t: 1}, next = {t: 6}, phraseEnd = 2.2;
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 3, 'lrc'), true);
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 2, 'lrc'), false);
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 3, 'plain'), false);
  assert.equal(api.inferLyricPause(line, {t: 2.8}, phraseEnd, 2.5, 'lrc'), false);
});

test('active line is calculated directly from source time, including seeking', () => {
  const lines = [{t: 1}, {t: 3}, {t: 8}];
  assert.equal(api.findLyricIndexAtTime(lines, 0.5), -1);
  assert.equal(api.findLyricIndexAtTime(lines, 3.1), 1);
  assert.equal(api.findLyricIndexAtTime(lines, 9), 2);
  assert.equal(api.findLyricIndexAtTime(lines, 3.1), api.findLyricIndexAtTime(lines, 3.1));
});

test('positive calibration delays text and negative calibration advances it', () => {
  assert.equal(api.calibratedLyricTime(10, 250), 9.75);
  assert.equal(api.calibratedLyricTime(10, -250), 10.25);
  assert.equal(api.calibratedLyricTime(0.1, 2000), 0);
});
