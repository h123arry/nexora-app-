const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "return updatedUser;\n    });\n    saveUserToDb(updatedUser);\n  };",
  "return updatedUser;\n    });\n    saveUserToDb({ ...currentUser, ...updatedData });\n  };"
);

fs.writeFileSync('src/App.tsx', appTsx);
