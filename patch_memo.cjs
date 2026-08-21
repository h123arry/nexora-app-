const fs = require('fs');
let code = fs.readFileSync('src/components/FeedPostCard.tsx', 'utf8');
code = code.replace(
  "export const FeedPostCard = React.memo(FeedPostCardImpl);",
  `export const FeedPostCard = React.memo(FeedPostCardImpl, (prev, next) => {
  return Object.keys(prev).every(key => {
    if (typeof prev[key] === 'function') return true; // Ignore functions
    if (key === 'post') {
      return prev.post.isLikedByUser === next.post.isLikedByUser && 
             prev.post.likes === next.post.likes &&
             prev.post.comments?.length === next.post.comments?.length &&
             prev.post.content === next.post.content &&
             prev.post.scheduledTime === next.post.scheduledTime;
    }
    if (key === 'votedPolls') {
      return prev.votedPolls[prev.post.id] === next.votedPolls[next.post.id];
    }
    if (key === 'followingIds') {
      return prev.followingIds.includes(prev.post.userId) === next.followingIds.includes(next.post.userId);
    }
    return prev[key] === next[key];
  });
});`
);
fs.writeFileSync('src/components/FeedPostCard.tsx', code);
