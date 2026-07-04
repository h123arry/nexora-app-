const RESERVED_USERNAMES = [
  'admin',
  'support',
  'nexora',
  'official',
  'security',
  'api',
  'help',
  'system',
  'developer',
  'root'
];

export function validateUsername(username: string, currentUserId?: string): string | null {
  const clean = username.trim().toLowerCase();
  
  if (clean.length < 3) {
    return 'Username must contain at least 3 characters.';
  }
  if (clean.length > 30) {
    return 'Username cannot be longer than 30 characters.';
  }
  
  // Letters, numbers, underscores and periods only
  const regex = /^[a-zA-Z0-9._]+$/;
  if (!regex.test(clean)) {
    return 'Username can only contain letters, numbers, underscores, and periods.';
  }
  
  if (username.includes(' ')) {
    return 'Username cannot contain spaces.';
  }
  
  if (RESERVED_USERNAMES.includes(clean)) {
    return 'This username is a reserved system handle.';
  }
  
  // Cannot impersonate verified system accounts - let's check for "verified" keywords in reserved list or matches
  const impersonateKeywords = ['official', 'verified', 'support', 'help', 'admin', 'moderator'];
  if (impersonateKeywords.some(kw => clean === kw || clean.startsWith(kw + '_') || clean.endsWith('_' + kw))) {
    // If it's a new account trying to register standard system names
    return 'This username is reserved or cannot be registered to prevent impersonation.';
  }

  // Check unique in local accounts registry
  try {
    const rawAccounts = localStorage.getItem('nexora_registered_accounts');
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      const isClaimed = accounts.some((acc: any) => {
        // Skip current user checking if currentUserId is provided
        if (currentUserId && acc.user.id === currentUserId) {
          return false;
        }
        return acc.user.username.toLowerCase() === clean;
      });
      if (isClaimed) {
        return 'This username is already claimed on Nexora.';
      }
    }
  } catch (err) {
    console.error('Error checking unique username:', err);
  }

  return null; // Valid
}
