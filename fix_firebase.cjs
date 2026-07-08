const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

if (!appTsx.includes('signInAnonymously')) {
  appTsx = appTsx.replace(
    "import { db, auth } from './lib/firebase';",
    "import { db, auth } from './lib/firebase';\nimport { signInAnonymously } from 'firebase/auth';"
  );
  
  // Add signInAnonymously in a useEffect at the top of App component
  appTsx = appTsx.replace(
    'export default function App() {',
    `export default function App() {\n  useEffect(() => {\n    signInAnonymously(auth).catch(console.error);\n  }, []);`
  );
}

fs.writeFileSync('src/App.tsx', appTsx);
