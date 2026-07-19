const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<div id="nexora-brand-header" className="flex items-center gap-3 px-4 mb-6">[\s\S]*?<\/div>\s*<\/div>/,
  '<div id="nexora-brand-header" className="px-4 mb-6">\n        <NexoraBranding size="md" showSubtitle={true} />\n      </div>'
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
