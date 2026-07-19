const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import NexoraPremiumLogo from './components/NexoraPremiumLogo';",
  "import NexoraPremiumLogo from './components/NexoraPremiumLogo';\nimport NexoraBranding from './components/NexoraBranding';"
);

code = code.replace(
  /<div className="flex items-center justify-center w-20 h-20 mx-auto transition-all duration-700 hover:scale-105">\s*<NexoraPremiumLogo className="w-20 h-20" glow=\{true\} \/>\s*<\/div>/,
  '<div className="flex flex-col items-center justify-center mx-auto transition-all duration-700 hover:scale-105">\n                  <NexoraBranding size="xl" showSubtitle={true} />\n                </div>'
);

fs.writeFileSync('src/App.tsx', code);
