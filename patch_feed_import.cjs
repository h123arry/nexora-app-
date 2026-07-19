const fs = require('fs');
let code = fs.readFileSync('src/components/FeedView.tsx', 'utf8');

if (!code.includes("import NexoraBranding from './NexoraBranding';")) {
  code = code.replace(
    "import NexoraPremiumLogo from './NexoraPremiumLogo';",
    "import NexoraPremiumLogo from './NexoraPremiumLogo';\nimport NexoraBranding from './NexoraBranding';"
  );
  fs.writeFileSync('src/components/FeedView.tsx', code);
}
