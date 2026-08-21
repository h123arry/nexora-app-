const fs = require('fs');

let code = fs.readFileSync('src/services/dataService.ts', 'utf8');

code = code.replace(
  "export function subscribeToFollows(callback: (follows: any[]) => void) {\n  const q = query(collection(db, 'follows'));",
  "export function subscribeToFollows(userId: string, callback: (follows: any[]) => void) {\n  const q = query(collection(db, 'follows'), where('followerId', '==', userId));"
);

code = code.replace(
  "export function subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {\n  const q = query(collection(db, 'chats')); // List all chats user is part of",
  "export function subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {\n  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));"
);

code = code.replace(
  "export function subscribeToUsers(callback: (users: User[]) => void) {\n  const q = query(collection(db, 'users'));",
  "export function subscribeToUsers(callback: (users: User[]) => void) {\n  const q = query(collection(db, 'users'), limit(500));"
);

fs.writeFileSync('src/services/dataService.ts', code);
