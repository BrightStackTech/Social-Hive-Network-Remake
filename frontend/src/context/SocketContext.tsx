import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAllChats } from '../api';

type ChatType = 'individual' | 'group' | 'channel';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  unreadTypes: { individual: boolean; group: boolean; channel: boolean };
  resetUnreads: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [unreadTypes, setUnreadTypes] = useState({ individual: false, group: false, channel: false });
  const chatTypeCache = useRef<Record<string, ChatType>>({});

  const resetUnreads = useCallback(() => {
    setUnreadTypes({ individual: false, group: false, channel: false });
  }, []);

  // Populate chat type cache on load or whenever user changes
  useEffect(() => {
    if (token && user) {
      getAllChats().then(res => {
        const chats = res.data.data;
        chats.forEach((chat: any) => {
          if (!chat.isGroupChat) chatTypeCache.current[chat._id] = 'individual';
          else if (chat.group) chatTypeCache.current[chat._id] = 'group';
          else chatTypeCache.current[chat._id] = 'channel';
        });
      }).catch(() => {});
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) {
      if (socket?.connected) {
        socket.disconnect();
      }
      return;
    }

    console.log('Initializing socket connection for user:', user._id || (user as any).id);
    const newSocket = io(`${import.meta.env.VITE_SERVER_URL}`, {
      auth: {
        token,
        userId: user._id || (user as any).id,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully with ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('online-users-list', (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('userOnline', (userId: string) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    newSocket.on('userOffline', (userId: string) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    // Listen for new messages to update notification dots
    newSocket.on('message_received', (message: any) => {
        // If message is from current user, don't notify
        const currentUserId = user._id || (user as any).id;
        if (message.sender?._id === currentUserId || message.sender === currentUserId) return;
        
        const type = chatTypeCache.current[message.chat];
        if (type) {
            setUnreadTypes(prev => ({ ...prev, [type]: true }));
        }
    });

    // Also update cache if a new chat is created
    newSocket.on('new_chat', (chat: any) => {
        const type: ChatType = !chat.isGroupChat ? 'individual' : (chat.group ? 'group' : 'channel');
        chatTypeCache.current[chat._id] = type;
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('online-users-list');
      newSocket.off('userOnline');
      newSocket.off('userOffline');
      newSocket.off('message_received');
      newSocket.off('new_chat');
    };
  }, [token, user]); // Removed socket and chatTypeCache dependencies

  const value = useMemo(() => ({
    socket,
    isConnected,
    onlineUsers,
    unreadTypes,
    resetUnreads
  }), [socket, isConnected, onlineUsers, unreadTypes, resetUnreads]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
