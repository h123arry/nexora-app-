const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(/Object\.values\(globalUsersMap\)\.find/g, '(Object.values(globalUsersMap) as User[]).find');
appTsx = appTsx.replace(/creators=\{Object\.values\(globalUsersMap\)\}/g, 'creators={Object.values(globalUsersMap) as User[]}');
fs.writeFileSync('src/App.tsx', appTsx);

let feedTsx = fs.readFileSync('src/components/FeedView.tsx', 'utf8');
// Fix creators missing in FeedView.tsx
feedTsx = feedTsx.replace('creators.filter(c =>', '(Object.values(JSON.parse(localStorage.getItem(\'nexora_registered_accounts\') || \'[]\')).map((a: any) => a.user) as any[]).filter(c =>');
// Actually, wait, creators is passed to FeedView but FeedView doesn't take it?
// Let's check FeedView props.
