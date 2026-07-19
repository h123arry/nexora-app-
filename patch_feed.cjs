const fs = require('fs');
let code = fs.readFileSync('src/components/FeedView.tsx', 'utf8');
code = code.replace(
  /<div className="flex items-center gap-2">\s*<NexoraPremiumLogo className="w-7 h-7" glow={true} \/>\s*<div>\s*<span className="font-sans font-black text-base tracking-wider bg-linear-to-r from-violet-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">\s*NEXORA\s*<\/span>\s*<span className="text-\[9px\] font-mono block text-violet-400 leading-none font-extrabold">SOCIAL NETWORK<\/span>\s*<\/div>\s*<\/div>/,
  '<NexoraBranding size="sm" />'
);
fs.writeFileSync('src/components/FeedView.tsx', code);
