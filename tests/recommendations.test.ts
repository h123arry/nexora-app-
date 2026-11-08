import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRecommendationProfile,
  saveRecommendationProfile,
  resetRecommendationProfile,
  recordRecommendationEvent,
} from '../src/utils/recommendations';

function withLocalStorage(run: () => void): void {
  const originalStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    run();
  } finally {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
}

test('recommendation profiles remain isolated between signed-in accounts', () => {
  withLocalStorage(() => {
    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-a' }));
    saveRecommendationProfile({ tags: { technology: 30 }, creators: { 'creator-a': 20 }, communities: {} });

    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-b' }));
    assert.deepEqual(getRecommendationProfile(), { tags: {}, creators: {}, communities: {} });
    saveRecommendationProfile({ tags: { music: 12 }, creators: {}, communities: {} });

    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-a' }));
    assert.deepEqual(getRecommendationProfile(), { tags: { technology: 30 }, creators: { 'creator-a': 20 }, communities: {} });
  });
});

test('reset clears only the active account recommendation profile', () => {
  withLocalStorage(() => {
    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-a' }));
    saveRecommendationProfile({ tags: { technology: 30 }, creators: {}, communities: {} });
    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-b' }));
    saveRecommendationProfile({ tags: { music: 12 }, creators: {}, communities: {} });

    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } });
    Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class CustomEventMock { constructor(public type: string) {} } });
    try {
      resetRecommendationProfile();
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
      else Reflect.deleteProperty(globalThis, 'window');
      if (originalCustomEvent) Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent });
      else Reflect.deleteProperty(globalThis, 'CustomEvent');
    }

    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-a' }));
    assert.deepEqual(getRecommendationProfile(), { tags: { technology: 30 }, creators: {}, communities: {} });
    localStorage.setItem('nexora_user', JSON.stringify({ id: 'account-b' }));
    assert.deepEqual(getRecommendationProfile(), { tags: {}, creators: {}, communities: {} });
  });
});


test('watch-time feedback is clamped to a finite zero-to-one ratio', () => {
  withLocalStorage(() => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } });
    Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class CustomEventMock { constructor(public type: string) {} } });
    try {
      localStorage.setItem('nexora_user', JSON.stringify({ id: 'watcher' }));
      recordRecommendationEvent('watch_partial', { tags: ['design'], watchTimeRatio: 50 });
      assert.equal(getRecommendationProfile().tags.design, 5);
      recordRecommendationEvent('watch_partial', { tags: ['design'], watchTimeRatio: -4 });
      assert.equal(getRecommendationProfile().tags.design, 5);
      recordRecommendationEvent('watch_partial', { tags: ['design'], watchTimeRatio: Number.NaN });
      assert.equal(getRecommendationProfile().tags.design, 5);
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
      else Reflect.deleteProperty(globalThis, 'window');
      if (originalCustomEvent) Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent });
      else Reflect.deleteProperty(globalThis, 'CustomEvent');
    }
  });
});
