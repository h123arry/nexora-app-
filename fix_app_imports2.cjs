const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

if (!appTsx.includes("import { db, auth } from './lib/firebase';")) {
  appTsx = appTsx.replace(
    "import { TRANSLATIONS } from './utils/translations';",
    "import { db, auth } from './lib/firebase';\nimport { signInAnonymously } from 'firebase/auth';\nimport { TRANSLATIONS } from './utils/translations';"
  );
}

appTsx = appTsx.replace(
  "return updatedUser;\n    });\n    saveUserToDb(updatedUser);\n  };",
  "return updatedUser;\n    });\n    saveUserToDb({ ...currentUser, ...updatedData });\n  };"
);

fs.writeFileSync('src/App.tsx', appTsx);
