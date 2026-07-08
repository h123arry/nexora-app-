const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const OFFICIAL_USER_IDS = ['user-0', 'creator-4', 'voh_ai'];

appTsx = appTsx.replace(
  "const loadedPosts = saved ? JSON.parse(saved) : INITIAL_POSTS;",
  "const loadedPosts = saved ? JSON.parse(saved) : INITIAL_POSTS.filter(p => ['user-0', 'creator-4', 'voh_ai'].includes(p.userId));"
);

appTsx = appTsx.replace(
  "[INITIAL_USER, ...MOCK_CREATORS].forEach(u => map[u.id] = u);",
  "[INITIAL_USER, ...MOCK_CREATORS.filter(u => ['user-0', 'creator-4', 'voh_ai'].includes(u.id))].forEach(u => map[u.id] = u);"
);

// We need to make sure to clear existing fake data from local storage, or clear it if the user wants it removed?
// The prompt says "Remove all generated fake users from feeds. Remove placeholder/demo posts."
// To do this reliably, we can just clear them out from local storage right when App loads. Or we can just ignore saved fake users/posts.
appTsx = appTsx.replace(
  "const saved = localStorage.getItem('nexora_posts');",
  "const saved = localStorage.getItem('nexora_posts');\n    // Filter out fake seeded users\n"
);
appTsx = appTsx.replace(
  "const loadedPosts = saved ? JSON.parse(saved) : INITIAL_POSTS.filter(p => ['user-0', 'creator-4', 'voh_ai'].includes(p.userId));",
  "const OFFICIAL_IDS = ['user-0', 'creator-4', 'voh_ai'];\n    const loadedPosts = saved ? JSON.parse(saved).filter((p: any) => !p.id.startsWith('post-') || OFFICIAL_IDS.includes(p.userId) || p.userId.length > 20) : INITIAL_POSTS.filter(p => OFFICIAL_IDS.includes(p.userId));"
);

fs.writeFileSync('src/App.tsx', appTsx);
