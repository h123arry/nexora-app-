const VALID_STATES = new Set(['Trusted', 'Valid', 'Invalid']);
const SAFE_CODE = /^[A-Za-z0-9._-]{1,128}$/;

export function buildCredentialInspection(manifestStore) {
  if (!manifestStore) {
    return { state: 'absent', validationState: null, validationCodes: [], validator: '@contentauth/c2pa-node@0.12.0', schemaVersion: 1 };
  }
  const validationState = typeof manifestStore.validation_state === 'string' && VALID_STATES.has(manifestStore.validation_state)
    ? manifestStore.validation_state
    : null;
  const state = validationState === 'Trusted' ? 'verified'
    : validationState === 'Invalid' ? 'invalid'
      : validationState === 'Valid' ? 'untrusted' : 'pending';
  const statusEntries = [
    ...(Array.isArray(manifestStore.validation_status) ? manifestStore.validation_status : []),
    ...(Array.isArray(manifestStore.validation_results?.activeManifest?.failure) ? manifestStore.validation_results.activeManifest.failure : []),
    ...(Array.isArray(manifestStore.validation_results?.activeManifest?.success) ? manifestStore.validation_results.activeManifest.success : []),
  ];
  const validationCodes = [...new Set(statusEntries
    .map(entry => entry?.code)
    .filter(code => typeof code === 'string' && SAFE_CODE.test(code)))].slice(0, 20);
  return { state, validationState, validationCodes, validator: '@contentauth/c2pa-node@0.12.0', schemaVersion: 1 };
}

export function unsupportedCredentialInspection() {
  return { state: 'unsupported', validationState: null, validationCodes: [], validator: '@contentauth/c2pa-node@0.12.0', schemaVersion: 1 };
}
