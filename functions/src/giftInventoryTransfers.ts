import { FieldValue, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';
import { findNexoraGift } from './giftCatalogPolicy.js';
import { validateGiftDeliveryInput, giftDeliveryReferences, isLiveGiftDeliveryEnabled } from './giftDeliveryPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

/**
 * Transfers an already-owned gift. No NEX wallet debit, escrow movement or
 * creator cash settlement occurs here: ownership moves from sender inventory
 * to the recipient's permanent gift gallery in one Firestore transaction.
 */
export const transferOwnedNexGift = onCall({ maxInstances: 20 }, async request => {
  const senderId = request.auth?.uid;
  if (!senderId) throw new HttpsError('unauthenticated', 'Sign in before sending a gift.');
  await assertCallableSessionActive(db, senderId, request.auth.token?.auth_time);

  let input;
  try { input = validateGiftDeliveryInput(request.data); }
  catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Gift details are invalid.');
  }
  if (input.recipientId === senderId) throw new HttpsError('failed-precondition', 'You cannot send a gift to your own account.');
  if (input.contextType === 'profile' && input.contextId !== input.recipientId) {
    throw new HttpsError('invalid-argument', 'Profile gifts must target the profile receiving the gift.');
  }

  const gift = findNexoraGift(input.giftId);
  if (!gift) throw new HttpsError('not-found', 'This gift is no longer available.');
  if (gift.subscriptionExclusive) throw new HttpsError('failed-precondition', 'This gift requires an eligible creator subscription.');

  const { transactionId, requestId } = giftDeliveryReferences(senderId, input.idempotencyKey);
  const senderInventoryRef = db.collection('users').doc(senderId).collection('giftInventory').doc(gift.id);
  const recipientProfileRef = db.collection('users').doc(input.recipientId);
  const senderProfileRef = db.collection('users').doc(senderId);
  const senderStatusRef = db.collection('accountStatus').doc(senderId);
  const recipientStatusRef = db.collection('accountStatus').doc(input.recipientId);
  const requestRef = db.collection('giftTransferRequests').doc(requestId);
  const transferRef = db.collection('giftTransfers').doc(transactionId);
  const galleryRef = db.collection('users').doc(input.recipientId).collection('giftGallery').doc(transactionId);
  const eventRef = db.collection('giftDeliveryEvents').doc(transactionId);

  try {
    return await db.runTransaction(async tx => {
      const [prior, inventory, senderProfile, recipientProfile, senderStatus, recipientStatus, liveSession] = await Promise.all([
        tx.get(requestRef), tx.get(senderInventoryRef), tx.get(senderProfileRef), tx.get(recipientProfileRef),
        tx.get(senderStatusRef), tx.get(recipientStatusRef),
        input.contextType === 'live' ? tx.get(db.collection('liveSessions').doc(input.contextId)) : Promise.resolve(null),
      ]);

      if (prior.exists) {
        const previous = prior.data() || {};
        if (previous.senderId !== senderId || previous.recipientId !== input.recipientId
          || previous.giftId !== gift.id || previous.quantity !== input.quantity
          || previous.contextType !== input.contextType || previous.contextId !== input.contextId) {
          throw new HttpsError('already-exists', 'This request key was already used for a different gift.');
        }
        return { transactionId, giftId: gift.id, quantity: input.quantity, replayed: true, status: 'delivered' as const };
      }

      if (!senderProfile.exists || !recipientProfile.exists) throw new HttpsError('not-found', 'The sender or recipient account could not be found.');
      const restricted = (snapshot: DocumentSnapshot) => {
        const status = snapshot.data() || {};
        return status.suspended === true || status.giftingRestricted === true;
      };
      if (restricted(senderStatus) || restricted(recipientStatus)) {
        throw new HttpsError('permission-denied', 'Gifting is unavailable for this account.');
      }

      if (input.contextType === 'live') {
        const session = liveSession?.data() || {};
        const ownerId = session.creatorId || session.hostId;
        if (!liveSession?.exists || ownerId !== input.recipientId || session.status !== 'live') {
          throw new HttpsError('failed-precondition', 'This creator is not currently live in that session.');
        }
        if (!isLiveGiftDeliveryEnabled(session)) {
          throw new HttpsError('failed-precondition', 'Gifting is disabled for this live room.');
        }
      }

      const ownedQuantity = inventory.data()?.quantity ?? 0;
      if (!Number.isSafeInteger(ownedQuantity) || ownedQuantity < input.quantity) {
        throw new HttpsError('failed-precondition', 'You do not have enough of this gift in your collection.');
      }

      const senderName = String(senderProfile.data()?.username || senderProfile.data()?.name || 'NEXORA member').slice(0, 80);
      const recipientName = String(recipientProfile.data()?.username || recipientProfile.data()?.name || 'Creator').slice(0, 80);
      const now = FieldValue.serverTimestamp();

      if (ownedQuantity === input.quantity) tx.delete(senderInventoryRef);
      else tx.update(senderInventoryRef, { quantity: ownedQuantity - input.quantity, updatedAt: now });

      tx.create(galleryRef, {
        giftId: gift.id, giftName: gift.name, image: gift.image, rarity: gift.rarity,
        animation: gift.animation, category: gift.category, quantity: input.quantity,
        senderId, senderName, creatorId: input.recipientId, recipientName,
        contextType: input.contextType, contextId: input.contextId,
        transactionId, receivedAt: now, transferType: 'owned_inventory',
      });
      tx.create(requestRef, {
        transactionId, senderId, recipientId: input.recipientId, giftId: gift.id,
        quantity: input.quantity, contextType: input.contextType, contextId: input.contextId,
        status: 'delivered', createdAt: now,
      });
      tx.create(transferRef, {
        transactionId, senderId, recipientId: input.recipientId, giftId: gift.id,
        giftName: gift.name, quantity: input.quantity, currency: 'NEX',
        faceValueNex: gift.priceNex * input.quantity, paymentMethod: 'owned_inventory',
        status: 'delivered', contextType: input.contextType, contextId: input.contextId,
        createdAt: now,
      });

      if (input.contextType === 'live') {
        tx.create(eventRef, {
          transactionId, targetType: 'live', targetId: input.contextId,
          recipientId: input.recipientId, senderId, senderName, creatorName: recipientName,
          giftId: gift.id, giftName: gift.name, giftImage: gift.image,
          animation: gift.animation, rarity: gift.rarity, quantity: input.quantity,
          totalNex: 0, createdAt: now, status: 'queued', transferType: 'owned_inventory',
        });
      }

      return { transactionId, giftId: gift.id, quantity: input.quantity, replayed: false, status: 'delivered' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'The gift could not be transferred. Your collection was not changed.');
  }
});
