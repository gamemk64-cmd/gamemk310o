const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../karaoke-engine.js');

test('estimated phrase ends well before a long instrumental gap', () => {
  const line = { t: 2, text: 'one two three' };
  const words = K.estimateWordTimes(line, { t: 10 }, 4.2);
  assert.equal(words.length, 3);
  assert.ok(words.at(-1).end < 4.5, `phrase unexpectedly stretched to ${words.at(-1).end}`);
});

test('estimated word intervals are ordered and non-empty', () => {
  const words = K.estimateWordTimes({ t: 2, text: 'проверяем синхронизацию слов' }, { t: 4.5 }, 3.5);
  assert.ok(words.length >= 3);
  for (let i = 0; i < words.length; i++) {
    assert.ok(words[i].end > words[i].t);
    if (i) assert.ok(words[i].t >= words[i - 1].t);
  }
  assert.ok(words.at(-1).end <= 4.5);
});

test('instrumental pause is an empty frame, not a stale active word', () => {
  const lines = [
    { t: 1, text: 'one two', _rate: 4 },
    { t: 8, text: 'three four', _rate: 4 }
  ];
  const frame = K.frameAt(lines, 4, 'lrc', [4, 4]);
  assert.equal(frame.index, 0);
  assert.equal(frame.vocalActive, false);
  assert.equal(frame.pause, true);
});

test('next lyric does not activate before its timestamp', () => {
  const lines = [{ t: 3, text: 'hello', _rate: 3 }];
  const frame = K.frameAt(lines, 2, 'lrc', [3]);
  assert.equal(frame.index, -1);
  assert.equal(frame.vocalActive, false);
});

test('exact word timestamps are preserved', () => {
  const lines = [{
    t: 1, text: 'hello world', wordSynced: true,
    words: [{ text: 'hello', t: 1.1, end: 1.7 }, { text: 'world', t: 2, end: 2.8 }]
  }];
  const frame = K.frameAt(lines, 2.3, 'word', [4]);
  assert.equal(frame.wordIndex, 1);
  assert.equal(frame.vocalActive, true);
  assert.equal(frame.schedule[1].t, 2);
  assert.equal(frame.schedule[1].end, 2.8);
});

test('word gaps inside enhanced LRC become pauses', () => {
  const lines = [{
    t: 1, text: 'hey there', wordSynced: true,
    words: [{ text: 'hey', t: 1, end: 1.3 }, { text: 'there', t: 2.1, end: 2.5 }]
  }, { t: 5, text: 'again', words: [{ text: 'again', t: 5, end: 5.6 }], wordSynced: true }];
  const frame = K.frameAt(lines, 1.7, 'word');
  assert.equal(frame.vocalActive, false);
  assert.equal(frame.pause, true);
});

test('plain un-timed text never auto-starts', () => {
  const lines = [{ t: 0, text: 'untimed text' }];
  const frame = K.frameAt(lines, 20, 'plain');
  assert.equal(frame.index, -1);
  assert.equal(frame.vocalActive, false);
});

test('long timestamp gaps are excluded from singer-rate estimates', () => {
  const lines = [
    { t: 0, text: 'one two' },
    { t: 2, text: 'three four' },
    { t: 24, text: 'five six' },
    { t: 26, text: 'seven eight' }
  ];
  const rates = K.estimateRates(lines, 'lrc');
  assert.ok(rates[2] >= 2.0);
  assert.ok(rates[2] < 5.0);
});
