import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { publishBusinessService, setBusinessServiceStatus } from '../src/businessServices.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'business-service-tests');
const db = getFirestore(app);
const page = db.doc('pages/business-service-test');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Business service tests require the Firestore Emulator.');
  await db.recursiveDelete(page);
  await page.set({ id: 'business-service-test', ownerId: 'owner', category: 'Business' });
});
after(async () => { await db.recursiveDelete(page); await deleteApp(app); });

describe('business service catalogue', () => {
  it('lets the owning Business Page publish and pause a bookable service', async () => {
    const created = await publishBusinessService(db, 'owner', 'business-service-test', {
      name: 'Consultation', description: 'One-to-one consultation', durationMinutes: 30, priceMinor: 2500000,
    });
    assert.ok(created.serviceId);
    const ref = page.collection('services').doc(created.serviceId);
    assert.equal((await ref.get()).get('bookable'), true);
    await setBusinessServiceStatus(db, 'owner', 'business-service-test', created.serviceId, 'paused');
    assert.equal((await ref.get()).get('bookable'), false);
  });
  it('rejects non-owners and invalid service values', async () => {
    await assert.rejects(publishBusinessService(db, 'intruder', 'business-service-test', {
      name: 'Service', description: '', durationMinutes: 30,
    }), /Only the owning Business Page/);
    await assert.rejects(publishBusinessService(db, 'owner', 'business-service-test', {
      name: '', description: '', durationMinutes: 0,
    }), /valid service/);
  });
});
