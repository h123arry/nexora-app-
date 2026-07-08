const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "import { subscribeToPosts } from './services/dataService';",
  "import { subscribeToPosts, subscribeToUsers, saveUserToDb, savePostToDb } from './services/dataService';"
);
if (!appTsx.includes('subscribeToUsers')) {
  appTsx = appTsx.replace(
    "import { getGlobalPosts } from './services/dataService';",
    "import { getGlobalPosts, subscribeToPosts, subscribeToUsers, saveUserToDb, savePostToDb } from './services/dataService';"
  );
}

// Update the useEffect that fetches posts to subscribe to both posts and users
appTsx = appTsx.replace(
  /useEffect\(\(\) => \{\n    async function fetchPosts\(\) \{[\s\S]*?fetchPosts\(\);\n  \}, \[\]\);/,
  `useEffect(() => {
    const unsubPosts = subscribeToPosts((dbPosts) => {
      if (dbPosts && dbPosts.length > 0) {
        setPosts(normalizePosts(dbPosts));
      }
    });
    
    const unsubUsers = subscribeToUsers((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        setGlobalUsersMap(prev => {
          const newMap = { ...prev };
          dbUsers.forEach(u => newMap[u.id] = u);
          return newMap;
        });
      }
    });

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, []);`
);

fs.writeFileSync('src/App.tsx', appTsx);
