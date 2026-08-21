const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // Ensure orderBy and limit are imported
  if (!code.includes('limit,')) {
    code = code.replace(/collection,/, 'collection, orderBy, limit,');
  }

  code = code.replace(/query\(collection\(db, path\)\)/g, "query(collection(db, path), orderBy('timestamp', 'desc'), limit(150))");
  
  fs.writeFileSync(filepath, code);
}

patchFile('src/services/dataService.ts');
patchFile('src/services/posts/postService.ts');
