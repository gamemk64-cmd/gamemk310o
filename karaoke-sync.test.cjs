const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /view==='set'\|\|view==='people'[\s\S]{0,180}Never fall through to DJ ROOM/);
assert.match(html, /button\[data-v\]/, 'navigation handles clicks on nested elements');
assert.match(html, /view='set';S\.view='set'/, 'settings gear navigates to Settings view');
assert.match(html, /menu\?\.classList\.remove\('on'\)/, 'gear closes appearance popup before opening settings');
console.log('PASS: Settings and People views no longer fall through to DJ ROOM; gear routes to Settings');
