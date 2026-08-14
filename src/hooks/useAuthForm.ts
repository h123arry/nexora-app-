import { useState } from 'react';
import { validateEmail, validatePassword, validateName, validateUsername, validatePhone } from '../utils/validators';

export function useAuthForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string): string | undefined => {
    let result;
    switch (field) {
      case 'email':
      case 'identifier':
        if (value.includes('@')) {
          result = validateEmail(value);
        }
        break;
      case 'password':
      case 'newPassword':
        result = validatePassword(value);
        break;
      case 'name':
        result = validateName(value);
        break;
      case 'username':
        result = validateUsername(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      default:
        break;
    }

    const errorMsg = result && !result.isValid ? result.error : undefined;
    setErrors(prev => ({ ...prev, [field]: errorMsg || '' }));
    return errorMsg;
  };

  const clearErrors = () => setErrors({});

  return {
    errors,
    validateField,
    clearErrors
  };
}
