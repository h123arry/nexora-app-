const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `  const normalizePosts = (rawPosts: any[]): Post[] => {
    return rawPosts.filter((post: any) => {
      const allowed = ['user-0', 'creator-4', 'voh_ai'];
      if (allowed.includes(post.userId)) return true;
      const accounts = JSON.parse(localStorage.getItem('nexora_registered_accounts') || '[]');
      return accounts.some((a: any) => a.user.id === post.userId);
    }).map((post: any) => {`,
  `  const normalizePosts = (rawPosts: any[]): Post[] => {
    return rawPosts.filter((post: any) => {
      const allowed = ['user-0', 'creator-4', 'voh_ai'];
      if (allowed.includes(post.userId)) return true;
      // Keep real users (those from db or with proper IDs), filter out fake "user-X" ones.
      if (!post.userId.startsWith('user-') && !post.userId.startsWith('creator-')) return true;
      if (post.userId.length > 15) return true; // Firebase UIDs
      return false;
    }).map((post: any) => {`
);

fs.writeFileSync('src/App.tsx', code);
