import { db, auth } from '../lib/firebase';
import { 
  doc, 
  addDoc, 
  updateDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  FirestoreError,
  onSnapshot
} from 'firebase/firestore';
import { PrivacySettings } from '../types';


export async function updateContent(contentId: string, updates: Partial<any>) {
  const path = 'content';
  try {
    return await updateDoc(doc(db, path, contentId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function logAutomationTask(taskName: string, status: string) {
  const path = 'automationLogs';
  try {
    return await addDoc(collection(db, path), {
      taskName,
      status,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}


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

export async function getFollowers(userId: string) {
  const path = 'follows';
  try {
    const q = query(collection(db, path), where('followingId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getFollowing(userId: string) {
  const path = 'follows';
  try {
    const q = query(collection(db, path), where('followerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
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

export async function getActivities(userId: string) {
  const path = 'activities';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getGlobalPosts() {
  const path = 'posts';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
export async function saveDraft(userId: string, caption: string, videoUrl: string) {
  const path = 'drafts';
  try {
    return await addDoc(collection(db, path), {
      userId,
      caption,
      videoUrl,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getDrafts(userId: string) {
  const path = 'drafts';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCreatorAnalyticsDetailed(userId: string) {
  const path = 'creatorAnalytics';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getUserContent(userId: string) {
  const path = 'content';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addNotification(userId: string, type: string, content: string) {
  const path = 'notifications';
  try {
    return await addDoc(collection(db, path), {
      userId,
      type,
      content,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getNotifications(userId: string) {
  const path = 'notifications';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createPage(ownerId: string, name: string, username: string, category: string) {
  const path = 'pages';
  try {
    return await addDoc(collection(db, path), {
      ownerId,
      name,
      username,
      category
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getPages() {
  const path = 'pages';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCommunity(name: string, description: string, ownerId: string) {
  const path = 'communities';
  try {
    return await addDoc(collection(db, path), {
      name,
      description,
      ownerId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reportContent(reporterId: string, targetType: string, targetId: string, reason: string) {
  const path = 'moderationReports';
  try {
    return await addDoc(collection(db, path), {
      reporterId,
      targetType,
      targetId,
      reason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>) {
  const path = 'privacySettings';
  try {
    // Assuming we use userId as document ID for privacy settings
    const docRef = doc(db, path, userId);
    return await updateDoc(docRef, {
        ...settings
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToPosts(callback: (posts: any[]) => void) {
  const q = query(collection(db, 'posts'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'posts');
  });
}

export function subscribeToNotifications(userId: string, callback: (notifications: any[]) => void) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(notifications);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  });
}
