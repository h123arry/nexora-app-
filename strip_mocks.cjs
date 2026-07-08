const fs = require('fs');

let code = fs.readFileSync('src/data/database.ts', 'utf8');

// We need to keep INITIAL_USER ('nida_founder') ? Wait, is nida_founder the official user? 
// The requirement: "Keep only official Nexora and VOH AI posts as built-in content."

// Let's print the IDs and names of MOCK_CREATORS to identify which ones to keep.
