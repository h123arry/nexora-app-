const fs = require('fs');
let code = fs.readFileSync('src/data/database.ts', 'utf8');

// The easiest way is to use a regex or string replacement, but since it's an exported array, let's just do a regex replace.
// Actually, it's safer to just let App.tsx filter them!
