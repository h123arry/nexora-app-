import assert from 'node:assert/strict';
import test from 'node:test';
import { safeMediaDeliveryUrl } from '../src/lib/apiBaseUrl';

function setTestWindow(origin: string) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: new URL(origin) },
  });
}

test('allows HTTPS media URLs and same-origin relative media paths', () => {
  setTestWindow('https://nexoraapp.com.ng');
  assert.equal(safeMediaDeliveryUrl('https://cdn.example/video.mp4'), 'https://cdn.example/video.mp4');
  assert.equal(safeMediaDeliveryUrl('/api/media/asset_123'), 'https://nexoraapp.com.ng/api/media/asset_123');
});

test('rejects executable, data, credentialed and insecure external media URLs', () => {
  setTestWindow('https://nexoraapp.com.ng');
  assert.equal(safeMediaDeliveryUrl('javascript:alert(1)'), '');
  assert.equal(safeMediaDeliveryUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(safeMediaDeliveryUrl('https://user:pass@cdn.example/video.mp4'), '');
  assert.equal(safeMediaDeliveryUrl('http://cdn.example/video.mp4'), '');
});

test('allows same-origin blob previews and localhost HTTP development media', () => {
  setTestWindow('https://nexoraapp.com.ng');
  assert.equal(safeMediaDeliveryUrl('blob:https://nexoraapp.com.ng/local-preview'), 'blob:https://nexoraapp.com.ng/local-preview');
  setTestWindow('http://localhost:5173');
  assert.equal(safeMediaDeliveryUrl('http://localhost:5173/media/test.mp4'), 'http://localhost:5173/media/test.mp4');
});

test('rejects missing values and malformed URLs', () => {
  setTestWindow('https://nexoraapp.com.ng');
  assert.equal(safeMediaDeliveryUrl(null), '');
  assert.equal(safeMediaDeliveryUrl(''), '');
  assert.equal(safeMediaDeliveryUrl('https://[invalid'), '');
});
