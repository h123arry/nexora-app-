import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production deployment includes critical live messaging, account lifecycle and direct-call functions', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy-production-founding-members.yml', import.meta.url), 'utf8');
  const allowlist = workflow.split('--only ')[1]?.split('\\n')[0] || '';
  assert.ok(allowlist.startsWith('functions:'), 'production workflow must declare an explicit Firebase deployment allowlist');
  for (const name of [
    'createGroupChat',
    'processAccountLifecycleRequest',
    'recordAccountSecurityEvent',
    'startDirectCall',
    'respondToDirectCall',
    'endDirectCall',
    'getDirectCallToken',
  ]) assert.ok(allowlist.includes(`functions:${name}`), `missing production deployment for ${name}`);

  for (const source of [
    'functions/src/groupChats.ts',
    'functions/src/accountDeletionWorker.ts',
    'functions/src/accountDeletionPolicy.ts',
    'functions/src/accountSecurity.ts',
    'functions/src/accountSecurityNotifications.ts',
    'functions/src/directCallTransport.ts',
    'functions/src/directCallPolicy.ts',
    'functions/src/directCallPushPolicy.ts',
  ]) assert.ok(workflow.includes(`- '${source}'`), `missing production deployment trigger for ${source}`);

  for (const name of ['createGroupChat', 'processAccountLifecycleRequest', 'startDirectCall', 'getDirectCallToken']) {
    assert.ok(workflow.includes(name), `missing post-deploy verification for ${name}`);
  }
});
