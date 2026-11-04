import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLocaleDirection, resolveLocale } from '../src/utils/translations.ts';

describe('NEXORA locale direction', () => {
  it('resolves supported language codes and names', () => {
    assert.equal(resolveLocale('ar'), 'ar');
    assert.equal(resolveLocale('Arabic'), 'ar');
    assert.equal(resolveLocale('français'), 'fr');
    assert.equal(resolveLocale('Português'), 'pt');
    assert.equal(resolveLocale('English'), 'en');
    assert.equal(resolveLocale(undefined), 'en');
  });

  it('sets Arabic to RTL and Latin locales to LTR', () => {
    assert.equal(getLocaleDirection('ar'), 'rtl');
    assert.equal(getLocaleDirection('Arabic'), 'rtl');
    assert.equal(getLocaleDirection('fr'), 'ltr');
    assert.equal(getLocaleDirection('pt'), 'ltr');
    assert.equal(getLocaleDirection('en'), 'ltr');
  });
});
