/** Normalize a national or international phone number to Firebase's E.164 format. */
export function normalizeE164PhoneNumber(input: string, countryCallingCode: string): string | null {
  const raw = input.trim();
  const callingCode = countryCallingCode.replace(/\D/g, '');
  let digits = raw.replace(/\D/g, '');

  if (!raw || !callingCode || callingCode.length > 3 || !digits) return null;

  if (raw.startsWith('+')) {
    if (digits.startsWith(callingCode)) {
      const national = digits.slice(callingCode.length);
      if (national.startsWith('0')) digits = callingCode + national.slice(1);
    }
  } else if (digits.startsWith(callingCode)) {
    const national = digits.slice(callingCode.length);
    digits = callingCode + (national.startsWith('0') ? national.slice(1) : national);
  } else {
    const national = digits.startsWith('0') ? digits.slice(1) : digits;
    digits = callingCode + national;
  }

  // E.164 permits 8-15 digits after the leading plus; Firebase validates
  // the country-specific numbering plan when it sends the SMS.
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}
