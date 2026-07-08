const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "return updatedUser;\n    });",
  "return updatedUser;\n    });\n    saveUserToDb(updatedUser);\n"
);

appTsx = appTsx.replace(
  "return nextComment;",
  "return nextComment;\n// Wait, let's just do it at the end of the handler\n"
);

// We should sync the post after we modify it!
appTsx = appTsx.replace(
  "const updatedLikes = isCurrentlyLiked ? post.likes - 1 : post.likes + 1;",
  "const updatedLikes = isCurrentlyLiked ? post.likes - 1 : post.likes + 1;\n          savePostToDb({ ...post, likes: updatedLikes });"
);

appTsx = appTsx.replace(
  "const newComment: Comment = {",
  "const newComment: Comment = {"
);

fs.writeFileSync('src/App.tsx', appTsx);
