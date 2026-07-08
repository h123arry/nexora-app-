const fs = require('fs');
let content = fs.readFileSync('src/data/database.ts', 'utf8');

// The literal '\n' might be encoded as '\\n' in the file.
content = content.replace(/\\n/g, '\n');

fs.writeFileSync('src/data/database.ts', content);
