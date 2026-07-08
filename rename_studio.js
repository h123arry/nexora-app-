const fs = require('fs');
const path = require('path');

const files = [
  'src/components/CreatorDashboardView.tsx',
  'src/components/ProfileView.tsx',
  'src/components/Sidebar.tsx',
  'src/components/VohAiView.tsx',
  'src/services/voh/platformEngines.ts'
];

files.forEach(file => {
  const filePath = path.resolve(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Creator Studio/gi, 'Nexora Studio');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
