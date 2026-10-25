const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
for (const mode of ['club','bass','vocal','chill','bright']) assert.match(html, new RegExp('value="'+mode+'"'), mode+' selector exists');
assert.match(html, /DJ ROOM set profiles/);
assert.match(html, /S\.eq=\[\.\.\.profile\.eq\]/);
assert.match(html, /applyEq\(\);awakeUntil/);
console.log('PASS: DJ ROOM set selector, five EQ profiles and applyEq integration');
