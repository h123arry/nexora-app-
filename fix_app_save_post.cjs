const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  'setPosts(prev => [newPost, ...prev]);',
  'setPosts(prev => [newPost, ...prev]);\n    savePostToDb(newPost);'
);

fs.writeFileSync('src/App.tsx', appTsx);
