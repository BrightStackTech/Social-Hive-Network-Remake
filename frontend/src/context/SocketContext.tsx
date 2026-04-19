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
  unreadCountMap: Record<string, number>;
  resetUnreads: () => void;
  resetChatUnread: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [unreadTypes, setUnreadTypes] = useState({ individual: false, group: false, channel: false });
  const [unreadCountMap, setUnreadCountMap] = useState<Record<string, number>>({});
  const chatTypeCache = useRef<Record<string, ChatType>>({});

  console.log('Sidebar unreadTypes:', unreadTypes);

  const resetUnreads = useCallback(() => {
    setUnreadTypes({ individual: false, group: false, channel: false });
  }, []);

  const resetChatUnread = useCallback((chatId: string) => {
    setUnreadCountMap(prev => {
        const next = { ...prev };
        delete next[chatId];
        return next;
    });
  }, []);

  // Populate chat type cache on load or whenever user changes
  useEffect(() => {
    if (token && user) {
      getAllChats().then(res => {
        const chats = res.data.data;
        if (Array.isArray(chats)) {
          chats.forEach((chat: any) => {
            const chatId = chat._id?.toString() || chat._id;
            if (!chat.isGroupChat) chatTypeCache.current[chatId] = 'individual';
            else if (chat.group) chatTypeCache.current[chatId] = 'group';
            else chatTypeCache.current[chatId] = 'channel';
          });
          // console.log('Chat type cache populated:', Object.keys(chatTypeCache.current).length, 'chats');
        }
      }).catch(() => {});
    }
  }, [token, user]);

  const fetchAndCacheChat = async (chatId: string) => {
    try {
      const res = await getAllChats();
      const chats = res.data.data;
      if (Array.isArray(chats)) {
        chats.forEach((chat: any) => {
          const id = chat._id?.toString() || chat._id;
          if (!chat.isGroupChat) chatTypeCache.current[id] = 'individual';
          else if (chat.group) chatTypeCache.current[id] = 'group';
          else chatTypeCache.current[id] = 'channel';
        });
        return chatTypeCache.current[chatId];
      }
    } catch (e) {}
    return null;
  };

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
    newSocket.on('message_received', async (message: any) => {
        const currentUserId = (user?._id || (user as any)?.id)?.toString();
        const senderId = message.sender?._id?.toString() || message.sender?.toString() || message.sender;
        
        console.log('Socket received message. Sender:', senderId, 'Me:', currentUserId);
        if (senderId === currentUserId) return;

        const chatId = message.chat?._id?.toString() || message.chat?.toString() || message.chat;
        if (!chatId) return;

        let type: ChatType | null | undefined = chatTypeCache.current[chatId];
        
        // Fallback: If type not in cache, try to refresh cache once
        if (!type) {
            console.log('SocketContext: type not in cache for chat', chatId, 'fetching...');
            type = await fetchAndCacheChat(chatId);
        }
        
        console.log('SocketContext: Message from', chatId, 'detected as type:', type);

        if (type) {
            setUnreadTypes(prev => {
                const updated = { ...prev, [type as ChatType]: true };
                console.log('SocketContext: Updated unreadTypes:', updated);
                return updated;
            });
            setUnreadCountMap(prev => ({
                ...prev,
                [chatId]: (prev[chatId] || 0) + 1
            }));
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
    unreadCountMap,
    resetUnreads,
    resetChatUnread
  }), [socket, isConnected, onlineUsers, unreadTypes, unreadCountMap, resetUnreads, resetChatUnread]);

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
