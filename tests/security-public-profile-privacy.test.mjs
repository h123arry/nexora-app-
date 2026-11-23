import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
assert.match(rules, /function publicProfileIsSafe\(data\)/);
assert.match(rules, /allow get, list: if publicProfileIsSafe\(resource\.data\)/);
assert.match(rules, /publicProfileIsSafe\(request\.resource\.data\)/);
console.log('Public profile privacy guard is present.');
