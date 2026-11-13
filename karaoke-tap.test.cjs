const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Engine = require('../karaoke-engine.js');

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
  extractFunction('calibratedLyricTime'),
  extractFunction('findLyricIndexAtTime'),
  extractFunction('inferLyricPause'),
  'globalThis.api={parseLrc,tokenizeWords,calibratedLyricTime,findLyricIndexAtTime,inferLyricPause};'
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

test('tokenizer keeps spaces and positive intervals', () => {
  const words = api.tokenizeWords('one two three', 1);
  assert.equal(words.length, 3);
  assert.ok(words.every(word => word.end > word.t));
});

test('line-only timing ends before a long gap to the next line', () => {
  const words = Engine.estimateWordTimes({ t: 2, text: 'hello world again' }, { t: 9 }, 4);
  assert.ok(words.at(-1).end < 4.5);
  assert.ok(words.at(-1).end < 9);
});

test('pause marker appears only during a timestamp-supported gap', () => {
  const line = { t: 1 }, next = { t: 6 }, phraseEnd = 2.2;
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 3, 'lrc'), true);
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 2, 'lrc'), false);
  assert.equal(api.inferLyricPause(line, next, phraseEnd, 3, 'plain'), false);
  assert.equal(api.inferLyricPause(line, { t: 2.8 }, phraseEnd, 2.5, 'lrc'), false);
});

test('active line is calculated directly from source time, including seeking', () => {
  const lines = [{ t: 1 }, { t: 3 }, { t: 8 }];
  assert.equal(api.findLyricIndexAtTime(lines, 0.5), -1);
  assert.equal(api.findLyricIndexAtTime(lines, 3.1), 1);
  assert.equal(api.findLyricIndexAtTime(lines, 9), 2);
});

test('positive calibration delays text and negative calibration advances it', () => {
  assert.equal(api.calibratedLyricTime(10, 250), 9.75);
  assert.equal(api.calibratedLyricTime(10, -250), 10.25);
  assert.equal(api.calibratedLyricTime(0.1, 2000), 0);
});
