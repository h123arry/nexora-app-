import test from 'node:test';
import assert from 'node:assert/strict';
import { transformImportedSvg } from '../scripts/giftverse/import-artwork.mjs';

const baseRecord = {
  giftId: 'nebula-heart',
  giftName: 'Nebula Heart',
  creator: 'Original Artist',
  sourceUrl: 'https://example.org/source.svg',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  modifications: 'Recomposed paths, changed palette, added NEXORA framing and accessibility metadata.'
};

test('licensed SVG imports are labelled, accessible and traceable', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#000" d="M0 0h100v100H0z"/></svg>';
  const result = transformImportedSvg(source, baseRecord);
  assert.match(result.svg, /data-gift-id="nebula-heart"/);
  assert.match(result.svg, /<title id="gift-title">Nebula Heart<\/title>/);
  assert.match(result.svg, /<desc id="gift-description">/);
  assert.equal(result.provenance.license, 'CC-BY-4.0');
  assert.equal(result.provenance.attributionRequired, true);
});

test('unsafe embedded content and remote references are removed', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://evil.example/x.png"/><path onclick="alert(1)" d="M0 0"/></svg>';
  const result = transformImportedSvg(source, baseRecord);
  assert.doesNotMatch(result.svg, /<script|foreignObject|onclick=|evil\.example/);
});

test('imports fail closed when the licence is missing or not approved', () => {
  assert.throws(() => transformImportedSvg('<svg/>', { ...baseRecord, license: '' }), /license is required/i);
  assert.throws(() => transformImportedSvg('<svg/>', { ...baseRecord, license: 'CC-BY-NC-4.0' }), /Unsupported or unverified/);
});

test('share-alike assets cannot be imported without an explicit share-alike plan', () => {
  assert.throws(() => transformImportedSvg('<svg/>', {
    ...baseRecord,
    license: 'CC-BY-SA-4.0',
    modifications: 'Changed the colour and added a border.'
  }), /share-alike/i);
  const result = transformImportedSvg('<svg/>', {
    ...baseRecord,
    license: 'CC-BY-SA-4.0',
    modifications: 'Rebuilt shapes and palette; adapted artwork remains available under share-alike.'
  });
  assert.equal(result.provenance.shareAlikeRequired, true);
});

test('gift identities and HTTPS source records are mandatory', () => {
  assert.throws(() => transformImportedSvg('<svg/>', { ...baseRecord, giftId: 'Not Valid' }), /kebab-case/);
  assert.throws(() => transformImportedSvg('<svg/>', { ...baseRecord, sourceUrl: 'http://example.org/a.svg' }), /HTTPS/);
  assert.throws(() => transformImportedSvg('<svg/>', { ...baseRecord, creator: '' }), /creator is required/i);
});
