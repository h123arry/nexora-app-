const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const files = [];
walkDir('./src', (f) => {
  if (f.endsWith('.tsx') || f.endsWith('.ts')) {
    files.push(f);
  }
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace '<Share ' with '<Forward '
  content = content.replace(/<Share /g, '<Forward ');
  // Replace 'Share,' with 'Forward,' inside lucide-react imports
  if (content.includes('lucide-react')) {
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim()).filter(Boolean);
      if (imports.includes('Share')) {
        imports = imports.filter(i => i !== 'Share');
        if (!imports.includes('Forward')) {
           imports.push('Forward');
        }
      }
      return `import { ${imports.join(', ')} } from 'lucide-react';`;
    });
  }

  // Edge cases
  content = content.replace(/icon:\s*Share\s*[,}]/g, match => match.replace('Share', 'Forward'));
  content = content.replace(/iconName:\s*['"]Share['"]/g, match => match.replace('Share', 'Forward'));
  content = content.replace(/case\s+['"]Share['"]:\s*return\s+Share/g, "case 'Share': return Forward");
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
