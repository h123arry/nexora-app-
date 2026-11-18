export function isPhoneAuthAvailable(env: Record<string, string | undefined>): boolean {
  const environment = env.VITE_NEXORA_ENV?.trim();
  return (environment === 'staging' || environment === 'production')
    && env.VITE_NEXORA_PHONE_AUTH_ENABLED?.trim() === 'true';
}
