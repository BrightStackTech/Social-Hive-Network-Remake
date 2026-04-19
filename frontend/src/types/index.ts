export interface ChatMessageInterface {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profilePicture: string;
    email: string;
  };
  content: string;
  chat: string;
  replyTo?: {
    _id: string;
    sender: {
      username: string;
      profilePicture: string;
    };
    content: string;
    attachments?: {
      url: string;
      fileName?: string;
    }[];
  };
  parentMessage?: string;
  commentCount?: number;
  attachments?: {
    url: string;
    localPath: string;
    fileName?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatInterface {
  _id: string;
  name?: string;
  isGroupChat: boolean;
  profilePicture?: string;
  lastMessage?: string;
  lastMessageDetails: ChatMessageInterface[];
  participants: {
    _id: string;
    username: string;
    profilePicture: string;
    email: string;
  }[];
  admin: string;
  group?: string;
  channel?: string;
  pinnedMessages?: ChatMessageInterface[];
  createdAt: string;
  updatedAt: string;
}

export interface UserInterface {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
  college: string;
  engineeringDomain: string;
  isEmailVerified: boolean;
  bio: string;
  phone: string;
  followers: string[];
  following: string[];
  posts: string[];
  yearOfGraduation: string;
  showYearOfGraduation: boolean;
  loginType: string;
  isAdmin?: boolean;
  isFreezed?: boolean;
  isDeletionScheduled?: boolean;
  deletionScheduleDate?: string;
}
