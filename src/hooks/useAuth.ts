import { useFirebase } from '../context/FirebaseContext';

export function useAuth() {
  const context = useFirebase();
  if (!context) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
}
