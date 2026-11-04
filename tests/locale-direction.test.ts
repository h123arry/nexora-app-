import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLocaleDirection, getTranslations, resolveLocale, TRANSLATIONS } from '../src/utils/translations.ts';

describe('NEXORA locale direction', () => {
  it('resolves supported language codes and names', () => {
    assert.equal(resolveLocale('ar'), 'ar');
    assert.equal(resolveLocale('Arabic'), 'ar');
    assert.equal(resolveLocale('français'), 'fr');
    assert.equal(resolveLocale('Português'), 'pt');
    assert.equal(resolveLocale('English'), 'en');
    assert.equal(resolveLocale(undefined), 'en');
  });

  it('provides complete navigation and discovery labels in every supported locale', () => {
    const required = ['navHome', 'navExplore', 'navCommunities', 'navMessages', 'navActivity', 'navProfile', 'filterAll', 'filterUsers', 'filterPosts', 'filterVideos', 'filterCommunities', 'inboxTitle', 'inboxChats', 'inboxRequests', 'inboxArchived', 'inboxCreateGroupHeading', 'inboxInviteMembers', 'inboxCreateGroupButton'] as const;
    for (const locale of Object.keys(TRANSLATIONS) as Array<keyof typeof TRANSLATIONS>) {
      const dictionary = getTranslations(locale);
      for (const key of required) assert.equal(typeof dictionary[key], 'string', `${locale} is missing ${key}`);
      assert.ok(required.every(key => dictionary[key].trim().length > 0));
    }
    assert.equal(getTranslations('français').navHome, 'Accueil');
  });

  it('sets Arabic to RTL and Latin locales to LTR', () => {
    assert.equal(getLocaleDirection('ar'), 'rtl');
    assert.equal(getLocaleDirection('Arabic'), 'rtl');
    assert.equal(getLocaleDirection('fr'), 'ltr');
    assert.equal(getLocaleDirection('pt'), 'ltr');
    assert.equal(getLocaleDirection('en'), 'ltr');
  });
});
