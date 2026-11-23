export function isPhoneAuthAvailable(env: Record<string, string | undefined>): boolean {
  // Phone OTP remains staging-only until SMS delivery, quota, region policy and
  // recovery behaviour have passed the documented production release gate.
  return env.VITE_NEXORA_ENV?.trim() === 'staging'
    && env.VITE_NEXORA_PHONE_AUTH_ENABLED?.trim() === 'true';
}
