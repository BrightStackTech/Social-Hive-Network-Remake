export const ChatEventEnum = {
  CONNECTED_EVENT: 'connected',
  DISCONNECT_EVENT: 'disconnect',
  JOIN_CHAT_EVENT: 'join_chat',
  LEAVE_CHAT_EVENT: 'leave_chat',
  NEW_CHAT_EVENT: 'new_chat',
  TYPING_EVENT: 'typing',
  STOP_TYPING_EVENT: 'stop_typing',
  MESSAGE_RECEIVED_EVENT: 'message_received',
  MESSAGE_DELETE_EVENT: 'message_delete',
  MESSAGE_READ_EVENT: 'message_read',
  NEW_MESSAGE: 'new_message',
};

export const AvailableChatEvents = Object.values(ChatEventEnum);
