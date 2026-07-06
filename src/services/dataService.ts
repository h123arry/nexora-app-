import { db, auth } from '../lib/firebase';
import { 
  doc, 
  addDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  FirestoreError 
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Social Graph: Follow
export async function addFollow(followerId: string, followingId: string) {
  const path = 'follows';
  try {
    return await addDoc(collection(db, path), {
      followerId,
      followingId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Activity Engine
export async function logActivity(userId: string, type: string, targetId: string) {
  const path = 'activities';
  try {
    return await addDoc(collection(db, path), {
      userId,
      type,
      targetId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
