import { ChatEventEnum } from '../constants.js';

const onlineUsers = new Map(); // Map<userId, Set<socketId>>

export const socketIoInitializer = (io) => {
  io.on('connection', (socket) => {
    // console.log('New socket connection:', socket.id);

    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(userId);
      
      // Add socket to user's set
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // If this is the first socket for this user, notify others
      if (onlineUsers.get(userId).size === 1) {
        socket.broadcast.emit('userOnline', userId);
      }

      // Send the current list of online users to the connecting user
      socket.emit('online-users-list', Array.from(onlineUsers.keys()));
    }

    socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
      socket.join(chatId);
      // console.log(`User joined chat: ${chatId}`);
    });

    socket.on(ChatEventEnum.TYPING_EVENT, (data) => {
      socket.to(data.chatId).emit(ChatEventEnum.TYPING_EVENT, data);
    });

    socket.on(ChatEventEnum.STOP_TYPING_EVENT, (data) => {
      socket.to(data.chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, data);
    });

    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, (message) => {
      const chatId = message.chat;
      socket.to(chatId).emit(ChatEventEnum.MESSAGE_RECEIVED_EVENT, message);
    });

    socket.on(ChatEventEnum.MESSAGE_DELETE_EVENT, (message) => {
      const chatId = message.chat;
      socket.to(chatId).emit(ChatEventEnum.MESSAGE_DELETE_EVENT, message);
    });

    socket.on(ChatEventEnum.MESSAGE_READ_EVENT, (data) => {
      socket.to(data.chatId).emit(ChatEventEnum.MESSAGE_READ_EVENT, data);
    });

    socket.on(ChatEventEnum.NEW_CHAT_EVENT, (chat) => {
      socket.broadcast.emit(ChatEventEnum.NEW_CHAT_EVENT, chat);
    });

    socket.on(ChatEventEnum.LEAVE_CHAT_EVENT, (chat) => {
      socket.broadcast.emit(ChatEventEnum.LEAVE_CHAT_EVENT, chat);
    });

    socket.on('disconnect', () => {
      if (userId && onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        
        // If no more sockets for this user, notify others
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('userOffline', userId);
        }
      }
      // console.log('Socket disconnected:', socket.id);
    });
  });
};

export const emitSocketEvent = (req, userId, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.to(userId).emit(event, data);
  }
};
