const fs = require('fs');

const tsCode = fs.readFileSync('src/data/database.ts', 'utf8');

// I will use regex to find where INITIAL_POSTS and MOCK_CREATORS start and end?
// The file is standard TS, I can compile it using esbuild to parse it? 
// No, I can just modify App.tsx to only load official content from the constants.
