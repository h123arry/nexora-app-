const fs = require('fs');
let code = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');

code = code.replace(
  /<div className="bg-black\/40 rounded-xl p-4 overflow-x-auto text-xs font-mono text-zinc-300 border border-white\/5">[\s\S]*?<\/div>/,
  `<div className="bg-black/40 rounded-xl p-4 overflow-x-auto text-sm font-medium text-zinc-300 border border-white/5">
    We encountered a temporary issue. Our connection was interrupted, but you can safely retry or reload the page to continue.
  </div>`
);

code = code.replace(
  /\{this\.state\.error\?\.stack && \([\s\S]*?\)\}/,
  ''
);

code = code.replace(
  /⚠️ Nexora Core Run-time Exception/,
  'Connection Interrupted'
);

code = code.replace(
  /The application failed to render because of a fatal script execution or mounting error\./,
  'Oops! Something went wrong while loading this screen.'
);

fs.writeFileSync('src/components/ErrorBoundary.tsx', code);
