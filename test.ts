interface User { id: string; username: string; }
declare const map: Record<string, User>;
const u = Object.values(map).find(c => c.id === '1');
