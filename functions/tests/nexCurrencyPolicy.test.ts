import test from 'node:test';
import assert from 'node:assert/strict';
import { getNexCurrencyInfo, NEX_WALLET_BUNDLES } from '../src/nexCurrencyPolicy.js';

test('NEX reference value is two US cents and bundles start at 15 NEX', () => {
  const info = getNexCurrencyInfo();
  assert.equal(info.currency, 'NEX');
  assert.equal(info.referenceUsdCentsPerUnit, 2);
  assert.deepEqual(NEX_WALLET_BUNDLES.map(x => [x.units, x.priceUsdCents]), [[15,30],[30,60],[50,100],[100,200]]);
  assert.equal(info.checkoutEnabled, false);
});
