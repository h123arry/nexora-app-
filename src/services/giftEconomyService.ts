import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type CreatorPayoutReadiness = {
  providerConfigured: boolean; provider: 'paystack'; providerMode: 'test' | 'live' | 'unknown'; payoutEnabled: boolean; testModeAvailable: boolean; corridor: 'NG-NGN'; currency: 'NGN';
  beneficiaryStatus: 'verified' | 'pending' | 'not_configured'; beneficiary: { accountName: string; accountNumberLast4: string; bankName: string } | null; displayCurrency: string;
  koboPerNex: number | null; minimumNex: number | null; maximumNex: number | null; blocker: string | null; cashWithdrawalEnabled: boolean;
};
export type CreatorGiftAnalytics = {
  currency: 'NEX'; windowDays: number; source: string; truncated: boolean;
  totals: { grossNex: number; creatorShareNex: number; gifts: number; settledGifts: number };
  daily: Array<{ day: string; grossNex: number; creatorShareNex: number; gifts: number; settledGifts: number }>;
};
export type GiftCompetition = { id: string; title: string; liveSessionId: string; startsAt: string | null; endsAt: string | null; status: string; currency: 'NEX' };
export async function getCreatorPayoutReadiness() {
  return (await httpsCallable<void, CreatorPayoutReadiness>(functions, 'getCreatorPayoutReadiness')()).data;
}
export async function requestCreatorPayout(amountNex: number, idempotencyKey: string) {
  return (await httpsCallable<{amountNex:number;idempotencyKey:string}, {reference:string;status:string;amountNex:number;amountKobo:number;currency:'NGN'}>(functions, 'requestCreatorPayout')({amountNex,idempotencyKey})).data;
}
export type NgnBank = { name: string; code: string; slug: string };
export async function getNgnBanks() {
  return (await httpsCallable<void, {banks:NgnBank[]}>(functions, 'getNgnBanks')()).data.banks;
}
export async function resolveNgnBankAccount(accountNumber: string, bankCode: string) {
  return (await httpsCallable<{accountNumber:string;bankCode:string}, {verified:boolean;accountName:string;accountNumberLast4:string;bankCode:string}>(functions, 'resolveNgnBankAccount')({accountNumber,bankCode})).data;
}
export async function setCreatorPayoutBeneficiary(accountNumber: string, bankCode: string, confirmedAccountName: string) {
  return (await httpsCallable<{accountNumber:string;bankCode:string;confirmedAccountName:string}, {creatorId:string;status:string;accountName:string;accountNumberLast4:string;bankName:string}>(functions, 'setCreatorPayoutBeneficiary')({accountNumber,bankCode,confirmedAccountName})).data;
}
export async function getNgnPayoutProviderStatus() {
  return (await httpsCallable<void, {provider:string;configured:boolean;mode:string;transferFeatureEnabled:boolean;cashWithdrawalsEnabled:boolean;blocker:string|null}>(functions, 'getNgnPayoutProviderStatus')()).data;
}
export async function configureNgnPayoutPolicy(input:{enabled:boolean;koboPerNex:number;minimumNex:number;maximumNex:number;liveSettlementApproved:boolean;providerBusinessVerified?:boolean;settlementFundingVerified?:boolean;complianceApproved?:boolean;webhookVerified?:boolean;liveTestTransferVerified?:boolean}) {
  return (await httpsCallable<typeof input, {saved:boolean;mode:string;enabled:boolean;liveSettlementApproved:boolean}>(functions, 'configureNgnPayoutPolicy')(input)).data;
}
export async function setCreatorEconomyDisplayCurrency(currency: string) {
  return (await httpsCallable<{currency:string}, {currency:string;conversionApplied:false;note:string}>(functions, 'setCreatorEconomyDisplayCurrency')({currency})).data;
}
export async function getCreatorGiftAnalytics(days = 30) {
  return (await httpsCallable<{days:number}, CreatorGiftAnalytics>(functions, 'getCreatorGiftAnalytics')({days})).data;
}
export async function getActiveGiftCompetitions() {
  return (await httpsCallable<void, {competitions:GiftCompetition[]}>(functions, 'getActiveGiftCompetitions')()).data.competitions;
}
export async function getGiftCompetitionLeaderboard(competitionId: string) {
  return (await httpsCallable<{competitionId:string}, {competitionId:string;currency:'NEX';leaderboard:Array<{rank:number;creatorId:string;grossNex:number}>}>(functions, 'getGiftCompetitionLeaderboard')({competitionId})).data;
}
export async function getGiftRiskReviewQueue() {
  return (await httpsCallable<void, {records:Array<{id:string;senderId:string;creatorId:string;grossNex:number;score:number;tier:string;reasons:string[];createdAt:string|null}>}>(functions, 'getGiftRiskReviewQueue')()).data.records;
}
export async function createGiftCompetition(input:{title:string;liveSessionId:string;startsAt:string;endsAt:string}) {
  return (await httpsCallable<typeof input, {competitionId:string;status:'scheduled'}>(functions, 'createGiftCompetition')(input)).data;
}

export async function resolveGiftRiskSignal(signalId: string, outcome: 'cleared' | 'escalated', note: string) {
  const call = httpsCallable<{signalId:string;outcome:'cleared'|'escalated';note:string}, {signalId:string;disposition:string}>(functions, 'resolveGiftRiskSignal');
  return (await call({signalId,outcome,note})).data;
}
export async function setCreatorPayoutBeneficiary(creatorId: string, providerBeneficiaryRef: string) {
  const call = httpsCallable<{creatorId:string;providerBeneficiaryRef:string}, {creatorId:string;status:'pending';provider:'paystack';currency:'NGN'}>(functions, 'setCreatorPayoutBeneficiary');
  return (await call({creatorId,providerBeneficiaryRef})).data;
}
