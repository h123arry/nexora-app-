import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendUniquePosts, mergeRealtimePosts } from '../src/services/posts/postCollection';

const post = (id: string, content = id) => ({
  id,
  userId: `user-${id}`,
  username: id,
  name: id,
  avatar: '',
  content,
  timestamp: id,
  likes: 0,
  comments: [],
  commentsCount: 0,
  shares: 0,
  tags: [],
} as any);

describe('feed post collection helpers', () => {
  it('appends only posts that are not already loaded', () => {
    const result = appendUniquePosts([post('a'), post('b')], [post('b', 'updated'), post('c')]);
    assert.deepEqual(result.map(item => item.id), ['a', 'b', 'c']);
    assert.equal(result[1].content, 'b');
  });

  it('prepends realtime updates while preserving older paginated posts', () => {
    const result = mergeRealtimePosts([post('c'), post('b'), post('a')], [post('d'), post('b', 'fresh')]);
    assert.deepEqual(result.map(item => item.id), ['d', 'b', 'c', 'a']);
    assert.equal(result[1].content, 'fresh');
  });
});
