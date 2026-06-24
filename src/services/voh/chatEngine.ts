import { User } from '../../types';

export interface Message {
  id: string;
  sender: 'user' | 'voh';
  text: string;
  timestamp: string;
  isFailed?: boolean;
  isGenerating?: boolean;
  reactions?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  isPinned: boolean;
  isArchived: boolean;
  folderId?: string | null;
}

export interface ChatFolder {
  id: string;
  name: string;
  color?: string;
}

const STORAGE_KEYS = {
  SESSIONS: 'voh_ai_sessions',
  FOLDERS: 'voh_ai_folders',
};

export class ChatEngine {
  static getSessions(): ChatSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) {
      // Return a default session
      const defaultSession: ChatSession = {
        id: 'default-session',
        title: 'Welcome Session',
        messages: [
          {
            id: 'welcome-msg',
            sender: 'voh',
            text: "Hey there! I'm **VOH AI**, your highly optimized intelligent companion on Nexora. Ask me to **summarize your feed**, discover regional **World Pulse trends** in Nigeria, locate active **communities**, or find **interesting job/collaboration opportunities** near you!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reactions: []
          }
        ],
        createdAt: new Date().toISOString(),
        isPinned: false,
        isArchived: false,
        folderId: null
      };
      const initial = [defaultSession];
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  }

  static saveSessions(sessions: ChatSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  static getFolders(): ChatFolder[] {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (!data) {
      const defaultFolders: ChatFolder[] = [
        { id: 'folder-creator', name: '🎨 Creator Brainstorming', color: '#8B5CF6' },
        { id: 'folder-code', name: '💻 System Architecture', color: '#10B981' },
        { id: 'folder-general', name: '💬 General Inquiries', color: '#3B82F6' }
      ];
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(defaultFolders));
      return defaultFolders;
    }
    return JSON.parse(data);
  }

  static saveFolders(folders: ChatFolder[]): void {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }

  static async sendChatMessage(
    message: string,
    history: { sender: 'user' | 'voh'; text: string }[],
    currentUser: User
  ): Promise<{ text: string; isDemo: boolean }> {
    // Dynamic context integration
    const localPosts = JSON.parse(localStorage.getItem('nexora_posts') || '[]');
    const localCircles = JSON.parse(localStorage.getItem('nexora_db_joined_circles') || '[]');
    const localNotifications = JSON.parse(localStorage.getItem('nexora_notifications') || '[]');

    const response = await fetch('/api/voh-ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        context: {
          currentUser,
          posts: localPosts.slice(0, 10),
          circles: localCircles,
          notifications: localNotifications
        }
      })
    });

    if (!response.ok) {
      throw new Error('Server error');
    }

    return response.json();
  }
}
