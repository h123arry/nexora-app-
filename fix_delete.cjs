const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  `    const handleDeletePost = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (!postId) return;
      setPosts(prev => {
        const next = prev.filter(p => p.id !== postId);
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Post deleted successfully.' }));
    };`,
  `    const handleDeletePost = async (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (!postId) return;
      setPosts(prev => {
        const next = prev.filter(p => p.id !== postId);
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      try {
        const { deleteDoc, doc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'posts', postId));
      } catch (err) {
        console.error(err);
      }
      window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Post deleted successfully.' }));
    };`
);

fs.writeFileSync('src/App.tsx', appTsx);
