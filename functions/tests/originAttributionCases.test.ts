import assert from 'node:assert/strict';
import test from 'node:test';

function canRespond(caseRecord: { sourceCreatorUid: string; status: string }, uid: string) {
  return caseRecord.sourceCreatorUid === uid && caseRecord.status === 'open';
}
function canDispute(caseRecord: { requesterUid: string; status: string }, uid: string) {
  return caseRecord.requesterUid === uid && ['accepted', 'rejected'].includes(caseRecord.status);
}

test('only the source creator can respond to an open attribution correction', () => {
  const record = { sourceCreatorUid: 'creator_source', status: 'open' };
  assert.equal(canRespond(record, 'creator_source'), true);
  assert.equal(canRespond(record, 'creator_remix'), false);
  assert.equal(canRespond({ ...record, status: 'accepted' }, 'creator_source'), false);
});

test('only the original requester can dispute a decided attribution correction', () => {
  const record = { requesterUid: 'creator_remix', status: 'rejected' };
  assert.equal(canDispute(record, 'creator_remix'), true);
  assert.equal(canDispute(record, 'creator_source'), false);
  assert.equal(canDispute({ ...record, status: 'open' }, 'creator_remix'), false);
  assert.equal(canDispute({ ...record, status: 'disputed' }, 'creator_remix'), false);
});
