import { type ChatInterface, type UserInterface } from '../types';

export const DEFAULT_GROUP_IMAGE = 'https://res.cloudinary.com/dxygc9jz4/image/upload/t_color-white/enifyimlrv3farvfto8k.jpg';


export const getChatObjectMetadata = (
  chat: ChatInterface,
  currentUser: UserInterface
) => {
  const currentUserId = currentUser._id || (currentUser as any).id;
  const otherParticipant = chat.participants.find(
    (p) => (p._id || p.toString()) !== currentUserId
  );

  const lastMessageObj = chat.lastMessageDetails?.[0];
  // If content is empty, use the first attachment's URL so that 
  // the frontend's renderAsLinkOrEmailOrImgs can match the media.
  const lastMessageContent = lastMessageObj?.content || (lastMessageObj?.attachments?.[0]?.url) || 'No messages';

  if (chat.isGroupChat) {
    return {
      title: chat.name,
      profilePicture: chat.profilePicture || DEFAULT_GROUP_IMAGE,
      _id: chat.group,
      participantId: '',
      lastMessageDetails: chat.lastMessageDetails,
      lastMessage: lastMessageContent,
      lastMessageTime: lastMessageObj?.createdAt || null,
    };
  }

  return {
    title: otherParticipant?.username || 'Deleted User',
    profilePicture: otherParticipant?.profilePicture || '',
    _id: otherParticipant?._id || '',
    participantId: otherParticipant?._id || '',
    lastMessageDetails: chat.lastMessageDetails,
    lastMessage: lastMessageContent,
    lastMessageTime: lastMessageObj?.createdAt || null,
  };
};

export const requestHandler = async (
  request: () => Promise<any>,
  showProgressBar: (loading: boolean) => void,
  onSuccess: (response: any) => void,
  onError: (error: any) => void
) => {
  try {
    showProgressBar && showProgressBar(true);
    const response = await request();
    onSuccess(response);
  } catch (error) {
    onError(error);
  } finally {
    showProgressBar && showProgressBar(false);
  }
};
