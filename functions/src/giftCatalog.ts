import{HttpsError,onCall}from'firebase-functions/v2/https';import{GIFT_CATALOG,GIFT_CATALOG_VERSION,findNexoraGift}from'./giftCatalogPolicy.js';
// Authoritative server-owned catalogue. No client-supplied price is accepted.
export const getGiftCatalog=onCall({maxInstances:20},async()=>({version:GIFT_CATALOG_VERSION,currency:'NEX' as const,gifts:GIFT_CATALOG}));
// A short-lived informational quote; Phase 5.3 rechecks the current catalogue price in the ledger transaction.
export const quoteNexGift=onCall({maxInstances:20},async request=>{if(!request.auth?.uid)throw new HttpsError('unauthenticated','Sign in to prepare a gift quote.');const gift=findNexoraGift(request.data?.giftId);if(!gift)throw new HttpsError('not-found','This gift is not in the current Nexora catalogue.');return{quoteVersion:GIFT_CATALOG_VERSION,giftId:gift.id,priceNex:gift.priceNex,currency:'NEX' as const,expiresInSeconds:120,serverIssuedAt:new Date().toISOString()};});
