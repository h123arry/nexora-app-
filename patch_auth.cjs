const fs = require('fs');
let code = fs.readFileSync('src/components/AuthView.tsx', 'utf8');

// Replace imports
code = code.replace(
  "import NexoraPremiumLogo from './NexoraPremiumLogo';",
  "import NexoraPremiumLogo from './NexoraPremiumLogo';\nimport NexoraBranding from './NexoraBranding';"
);

// Replace main auth logo
code = code.replace(
  /<div className="flex flex-col items-center text-center mb-8 px-4">[\s\S]*?<\/h2>/,
  `<div className="flex flex-col items-center text-center mb-10 px-4">
          <NexoraBranding size="xl" showSubtitle={true} onClick={handleLogoClick} />`
);

// Replace onboarding logo
code = code.replace(
  /<NexoraPremiumLogo className="w-14 h-14 mb-3" glow=\{true\} \/>\s*<h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-white font-sans select-none uppercase">\s*Onboarding Setup\s*<\/h1>\s*<p className="text-xs text-purple-200\/50 font-mono mt-1">NEXORA WELCOME SETUP<\/p>/,
  `<NexoraBranding size="lg" showSubtitle={false} className="mb-4" />
            <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-white font-sans select-none uppercase">
              Onboarding Setup
            </h1>`
);

fs.writeFileSync('src/components/AuthView.tsx', code);
