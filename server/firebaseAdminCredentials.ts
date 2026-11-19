export interface FirebaseServiceAccount {
  type: 'service_account';
  project_id: string;
  private_key: string;
  client_email: string;
}

export function parseFirebaseServiceAccountJson(
  raw: string | undefined,
  expectedProjectId: string,
): FirebaseServiceAccount | null {
  const value = raw?.trim();
  if (!value) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain a service-account object.');
  }

  const account = parsed as Record<string, unknown>;
  if (
    account.type !== 'service_account'
    || typeof account.project_id !== 'string'
    || typeof account.private_key !== 'string'
    || typeof account.client_email !== 'string'
    || !account.private_key.includes('-----BEGIN PRIVATE KEY-----')
    || !account.private_key.includes('-----END PRIVATE KEY-----')
  ) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.');
  }

  if (account.project_id !== expectedProjectId) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON project_id does not match the configured Firebase project.');
  }

  return {
    type: 'service_account',
    project_id: account.project_id,
    private_key: account.private_key.replace(/\\n/g, '\n'),
    client_email: account.client_email,
  };
}
