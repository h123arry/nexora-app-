import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const MAX_TEMPLATES = 40;
const MAX_TAGS = 20;

type TemplateInput = {
  templateId?: unknown;
  name?: unknown;
  caption?: unknown;
  tags?: unknown;
  format?: unknown;
};

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage Creator Studio templates.');
  return request.auth.uid;
}

function validateTemplate(input: TemplateInput) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const caption = typeof input?.caption === 'string' ? input.caption.trim() : '';
  const format = input?.format;
  const tags = Array.isArray(input?.tags)
    ? [...new Set(input.tags.filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim().replace(/^#/, '').slice(0, 40)).filter(Boolean))].slice(0, MAX_TAGS)
    : [];
  if (name.length < 2 || name.length > 60) throw new HttpsError('invalid-argument', 'Template names must contain 2 to 60 characters.');
  if (caption.length > 4000) throw new HttpsError('invalid-argument', 'Template captions cannot exceed 4,000 characters.');
  if (!['text', 'image', 'video'].includes(String(format))) throw new HttpsError('invalid-argument', 'Choose a supported post format.');
  if (typeof input.templateId === 'string' && (!/^[A-Za-z0-9_-]{1,120}$/.test(input.templateId))) {
    throw new HttpsError('invalid-argument', 'Invalid template identifier.');
  }
  return { name, caption, format: format as 'text' | 'image' | 'video', tags };
}

export const saveCreatorStudioTemplate = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  const input = request.data as TemplateInput;
  const template = validateTemplate(input);
  const ref = typeof input.templateId === 'string'
    ? db.collection('creatorStudioTemplates').doc(input.templateId)
    : db.collection('creatorStudioTemplates').doc(randomUUID());
  const existing = await ref.get();
  if (existing.exists && existing.get('ownerId') !== uid) {
    throw new HttpsError('permission-denied', 'You cannot edit another creator’s template.');
  }
  if (!existing.exists) {
    const count = await db.collection('creatorStudioTemplates').where('ownerId', '==', uid).count().get();
    if (count.data().count >= MAX_TEMPLATES) throw new HttpsError('resource-exhausted', 'You have reached the 40-template limit.');
  }
  await ref.set({
    id: ref.id, ownerId: uid, ...template,
    createdAt: existing.exists ? existing.get('createdAt') : new Date(),
    updatedAt: new Date(), schemaVersion: 1,
  });
  return { templateId: ref.id, saved: true };
});

export const listCreatorStudioTemplates = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  const snapshot = await db.collection('creatorStudioTemplates')
    .where('ownerId', '==', uid).orderBy('updatedAt', 'desc').limit(MAX_TEMPLATES).get();
  return { templates: snapshot.docs.map(item => ({
    id: item.id, name: item.get('name'), caption: item.get('caption'),
    format: item.get('format'), tags: item.get('tags') || [],
    updatedAt: item.get('updatedAt')?.toDate?.()?.toISOString() || null,
  })) };
});

export const deleteCreatorStudioTemplate = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  const templateId = request.data?.templateId;
  if (typeof templateId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(templateId)) {
    throw new HttpsError('invalid-argument', 'A valid template identifier is required.');
  }
  const ref = db.collection('creatorStudioTemplates').doc(templateId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { deleted: false };
  if (snapshot.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'You cannot delete another creator’s template.');
  await ref.delete();
  return { deleted: true };
});
