const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  `          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment]
          };`,
  `          const updatedPost = {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment]
          };
          savePostToDb(updatedPost);
          return updatedPost;`
);

appTsx = appTsx.replace(
  `  const handleSharePost = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          return { ...p, shares: (p.shares || 0) + 1 };
        }
        return p;
      })
    );
  };`,
  `  const handleSharePost = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const updatedPost = { ...p, shares: (p.shares || 0) + 1 };
          savePostToDb(updatedPost);
          return updatedPost;
        }
        return p;
      })
    );
  };`
);

// Delete post logic
appTsx = appTsx.replace(
  `  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };`,
  `  import { deleteDoc, doc } from 'firebase/firestore';
  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch(e) {
      console.error(e);
    }
  };`
);

fs.writeFileSync('src/App.tsx', appTsx);
