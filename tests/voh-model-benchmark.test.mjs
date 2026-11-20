import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('VOH benchmark fixture is synthetic, unique and complete', async () => {
  const fixture = JSON.parse(await readFile('tests/fixtures/voh-model-benchmark.json', 'utf8'));
  assert.equal(fixture.syntheticOnly, true);
  assert.ok(fixture.tasks.length >= 10);
  const ids = fixture.tasks.map(task => task.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const task of fixture.tasks) {
    assert.ok(task.id && task.prompt && task.context);
    assert.ok(['critical', 'major', 'minor'].includes(task.severity));
    assert.ok(Array.isArray(task.expected) && task.expected.length);
    assert.ok(Array.isArray(task.disallowed) && task.disallowed.length);
  }
});

test('benchmark runner validates fixture without endpoint or credentials', () => {
  const result = spawnSync(process.execPath, ['scripts/voh-model-benchmark.mjs', '--validate-only'], {
    encoding: 'utf8',
    env: { ...process.env, VOH_BENCHMARK_BASE_URL: '', VOH_BENCHMARK_API_KEY: '', VOH_BENCHMARK_MODELS: '' }
  });
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.validation, 'passed');
  assert.equal(summary.syntheticOnly, true);
  assert.equal(summary.taskCount, 15);
});

test('runner refuses remote plain HTTP endpoints', () => {
  const result = spawnSync(process.execPath, ['scripts/voh-model-benchmark.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, VOH_BENCHMARK_BASE_URL: 'http://example.com/v1', VOH_BENCHMARK_API_KEY: 'test-only', VOH_BENCHMARK_MODELS: 'test-model' }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HTTPS/);
});
