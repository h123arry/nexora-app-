const fs = require('fs');
let code = fs.readFileSync('src/data/database.ts', 'utf8');

code = code.replace(
  /export function getSeededFollowers\(targetUserId: string\): User\[\] \{[\s\S]*?return list;\n\}/,
  'export function getSeededFollowers(targetUserId: string): User[] {\n  return [];\n}'
);

fs.writeFileSync('src/data/database.ts', code);
