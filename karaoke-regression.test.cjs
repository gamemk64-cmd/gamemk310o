const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('karaoke loads its separated engine, local voice gate and IndexedDB library', () => {
  assert.match(html, /src="karaoke-engine\.js"/);
  assert.match(html, /src="karaoke-vocal\.js"/);
  assert.match(html, /src="karaoke-database\.js"/);
  assert.match(html, /id="karaokeLibraryOpen"/);
  assert.match(html, /id="karaokeVocalToggle"/);
});

test('plain lyrics are never painted as synchronized lyrics', () => {
  assert.match(html, /window\.__lrcKind==='plain'[\s\S]{0,240}Не буду запускать его наугад/);
});

test('sync uses phrase windows and hides text when there is no active word', () => {
  assert.match(html, /KaraokeEngine\?\.frameAt/);
  assert.match(html, /el\.classList\.toggle\('vocal-wait',i===ix&&!vocalActive\)/);
  assert.match(html, /krSetLineState\(el,'future'\);return/);
});

test('partial tap sessions cannot be saved as fake exact timing', () => {
  assert.match(html, /if\(tap\.i<total\)\{toast\(`Для точной синхронизации отметь все слова/);
});

test('local database is queried before external providers', () => {
  const dbIndex = html.indexOf('window.KaraokeDB?.find');
  const providersIndex = html.indexOf('const wave1=');
  assert.ok(dbIndex > 0 && providersIndex > dbIndex);
});
