const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// Remove Simulated Real-Time Platform Social Activity Sync
const startSim = appTsx.indexOf('// 3.8 Simulated Real-Time Platform Social Activity Sync');
if (startSim !== -1) {
  const endSim = appTsx.indexOf('// 3.5. Web Offline & Pending Sync State handlers');
  if (endSim !== -1) {
    appTsx = appTsx.substring(0, startSim) + appTsx.substring(endSim);
  }
}

fs.writeFileSync('src/App.tsx', appTsx);
