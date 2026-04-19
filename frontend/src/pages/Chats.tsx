import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { getAllChats, sendMessage, getAllMessages, deleteMessage, deleteChat, createOrGetOneToOneChat, createGroupChat, createChannelChat, pinMessage, unpinMessage, getThreadMessages } from '../api/index';
import { ArrowLeft, Search, Mic, Square, Play, Pause, X, Send, Image as ImageIcon, Camera, FileText, Paperclip, Loader2, Folder, ChevronUp, ChevronDown, Archive } from 'lucide-react';
import { FaFilePdf, FaFileWord, FaFileAudio, FaFileVideo, FaFilePowerpoint, FaFileExcel, FaFileAlt, FaEye, FaDownload, FaImage, FaMicrophone } from 'react-icons/fa';
import { type ChatInterface, type ChatMessageInterface } from '../types';
import { getChatObjectMetadata, DEFAULT_GROUP_IMAGE } from '../utils'; // Ensure this exists and returns correctly
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import ForwardDialog from '../components/ForwardDialog';

const MESSAGE_LENGTH_LIMIT = 100;
const CHAT_EVENTS = {
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
};

export default function Chats() {
  document.title = 'Chats - Social Hive';
  const { socket, onlineUsers, resetUnreads } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    resetUnreads();
  }, [resetUnreads]);
  const { username, groupId, channelId, messageId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [chats, setChats] = useState<ChatInterface[]>([]);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageInterface[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<ChatMessageInterface[]>([]);
  const currentChat = useRef<ChatInterface | null>(null);

  const [chatsSearch, setChatsSearch] = useState<string>('');
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsFetched, setChatsFetched] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessageInterface | null>(null);
  const [activeThread, setActiveThread] = useState<ChatMessageInterface | null>(null);
  
  // Sidebar Explorer State
  const [openSections, setOpenSections] = useState<string[]>(['Individuals']);
  const [archivedChatIds, setArchivedChatIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('archivedChatIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [resizableHeight, setResizableHeight] = useState(50);
  const [_tick, setTick] = useState(0); // for force re-renders if needed
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessageInterface | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mention system state
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionTriggerPos, setMentionTriggerPos] = useState(0);
  const [filteredParticipants, setFilteredParticipants] = useState<any[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("Type a message...");

  const canChat = useMemo(() => {
    if (!currentChat.current) return true;
    
    // Channel logic: Only admin can speak (unless in a discussion thread)
    if (currentChat.current.channel) {
      if (activeThread) return true; // Discussions are open to all
      const uId = user?._id || (user as any)?.id;
      return currentChat.current.admin === uId;
    }

    if (currentChat.current.isGroupChat) return true;
    
    const otherParticipant = currentChat.current.participants.find(p => {
       const pId = p._id;
       const uId = user?._id || (user as any)?.id;
       return pId !== uId;
    });
    
    if (!otherParticipant) return true;
    
    // Exempt hiveai
    if (otherParticipant.username === 'hiveai' || otherParticipant._id === 'hiveai') return true;
    
    const following = (user as any)?.following || [];
    const followers = (user as any)?.followers || [];
    const followsThem = following.some((id: any) => id.toString() === otherParticipant._id.toString());
    const theyFollowUs = followers.some((id: any) => id.toString() === otherParticipant._id.toString());
    
    return followsThem && theyFollowUs;
  }, [currentChat.current, user, activeThread]);

  useEffect(() => {
    const placeholders = ["Type a message...", "Try @hiveai followed by a question..."];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % placeholders.length;
      setCurrentPlaceholder(placeholders[index]);
    }, 4000); // switch every 4 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle share parameters from ShareDialog
  useEffect(() => {
    const text = searchParams.get('text');
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const url = searchParams.get('url');

    if (text && title && description && url) {
      const formattedMessage = `${text}\n**${title}**\n${description}\n${url}`;
      setMessage(formattedMessage);
      // Remove the query parameters from the URL
      navigate(`/chats/${username}${groupId ? `?groupId=${groupId}` : ''}${channelId ? `?channelId=${channelId}` : ''}`, { replace: true });
    }
  }, [searchParams, username, groupId, channelId, navigate]);

  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((_err) => {
          toast.error("Camera access denied or unavailable");
          setIsCameraActive(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setAttachmentFiles(prev => [...prev, file]);
            setIsCameraActive(false);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleCameraClick = () => {
    setShowAttachments(false);
    setIsCameraActive(true);
  };
  
  const handleGalleryClick = () => {
    setShowAttachments(false);
    cameraInputRef.current?.click();
  };

  const handleDocsClick = () => {
    setShowAttachments(false);
    docsInputRef.current?.click();
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target?.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setAttachmentFiles((prev) => [...prev, ...selectedFiles]);
    }
    if (e.target) e.target.value = '';
  };
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    msg: ChatMessageInterface | null;
    isMine: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    msg: null,
    isMine: false,
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [showFileModal, setShowFileModal] = useState(false);
  const [activeFileTab, setActiveFileTab] = useState<'Documents' | 'Images' | 'Videos' | 'Audios' | 'Pinned'>('Documents');
  const [_pinnedMessages, _setPinnedMessages] = useState<ChatMessageInterface[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessageInterface, isMine: boolean) => {
    e.preventDefault();
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Bounds checking
    const hasImage = msg.attachments?.some(file => file.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
    const menuWidth = 160;
    let menuHeight = isMine ? 120 : 80;
    if (hasImage) menuHeight += 48;

    const x = clickX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : clickX;
    const y = clickY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : clickY;

    setContextMenu({
      visible: true,
      x,
      y,
      msg,
      isMine,
    });
  };

  const groupedFiles = React.useMemo(() => {
    let itemsToGroup: any[] = [];

    if (activeFileTab === 'Pinned') {
      itemsToGroup = (currentChat.current?.pinnedMessages || []).map(msg => ({
        ...msg,
        isPinnedItem: true,
      }));
    } else {
      const allAttachments: any[] = [];
      messages.forEach(msg => {
        if (msg.attachments) {
          msg.attachments.forEach(att => {
            allAttachments.push({
              ...att,
              createdAt: msg.createdAt, 
            });
          });
        }
      });

      itemsToGroup = allAttachments.filter(item => {
        const fileNameLower = (item.fileName || '').toLowerCase();
        const urlLower = (item.url || '').toLowerCase();
        const localPathLower = (item.localPath || '').toLowerCase();
        const sourceText = `${fileNameLower} ${urlLower} ${localPathLower}`;

        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|svg)(\?|$)/i.test(sourceText) || 
                        urlLower.includes('/image/upload/');

        const isAudioExt = /\.(mp3|wav|ogg|m4a|aac|flac|opus|oga)(\?|$)/i.test(sourceText);
        const hasAudioHint =
          sourceText.includes('recording') ||
          sourceText.includes('audio') ||
          sourceText.includes('voice') ||
          sourceText.includes('blob');
        
        const isWebm = /\.webm(\?|$)/i.test(sourceText);
        const isVideoPath = urlLower.includes('/video/upload/');
        const isAudio = isAudioExt || ((isWebm || isVideoPath) && hasAudioHint);

        const isVideoExt = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?|$)/i.test(sourceText);
        const isVideo = (isVideoExt || isVideoPath) && !isAudio && !isImage;
        
        if (activeFileTab === 'Images') return isImage;
        if (activeFileTab === 'Videos') return isVideo;
        if (activeFileTab === 'Audios') return isAudio;
        return !isImage && !isVideo && !isAudio;
      });
    }

    const filtered = itemsToGroup.filter(item => {
      const q = fileSearchQuery.toLowerCase();
      if (!q) return true;
      if (item.isPinnedItem) {
        return (item.content || '').toLowerCase().includes(q) || 
               (item.sender?.username || '').toLowerCase().includes(q) ||
               format(new Date(item.createdAt), 'MMMM d, yyyy').toLowerCase().includes(q);
      }
      const fileName = (item.fileName || '').toLowerCase();
      const dateStr = format(new Date(item.createdAt), 'MMMM d, yyyy').toLowerCase();
      return fileName.includes(q) || dateStr.includes(q);
    });

    const sortedFiltered = [...filtered].sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      const nameA = a.isPinnedItem ? a.content : (a.fileName || '');
      const nameB = b.isPinnedItem ? b.content : (b.fileName || '');
      return (nameB || '').localeCompare(nameA || '');
    });

    const groups: { [key: string]: any[] } = {};
    sortedFiltered.forEach(item => {
      const dateKey = format(new Date(item.createdAt), 'MMMM d, yyyy');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [messages, activeFileTab, fileSearchQuery, currentChat.current?.pinnedMessages]);

  const downloadImage = async (url: string, fileName?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'downloaded_image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Message copied');
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch chats on mount
  useEffect(() => {
    setChatsLoading(true);
    getAllChats()
      .then((res: { data: { data: ChatInterface[] } }) => {
        setChats(res.data.data);
        setChatsLoading(false);
        setChatsFetched(true);
      })
      .catch(() => {
        toast.error('Failed to load chats');
        setChatsLoading(false);
        setChatsFetched(true);
      });
  }, []);

  // Handle param routing for direct or group chats
  useEffect(() => {
    if (!user || !chatsFetched) return;

    if (groupId) {
      const chat = chats.find((c) => c.isGroupChat && c.group === groupId);
      if (chat) {
        handleOnChatClick(chat);
      } else {
        createGroupChat({ groupId }).then((res: { data: { data: ChatInterface } }) => {
          const newChat = res.data.data;
          setChats((prev) => {
             if (prev.find(c => c._id === newChat._id)) return prev;
             return [newChat, ...prev];
          });
          handleOnChatClick(newChat);
        }).catch((err: any) => {
          toast.error(err.response?.data?.message || 'Failed to open group chat');
          navigate('/chats');
        });
      }
    } else if (channelId) {
      const chat = chats.find((c) => c.channel === channelId);
      if (chat) {
        handleOnChatClick(chat);
      } else {
        createChannelChat({ channelId }).then((res: { data: { data: ChatInterface } }) => {
          const newChat = res.data.data;
          setChats((prev) => {
             if (prev.find(c => c._id === newChat._id)) return prev;
             return [newChat, ...prev];
          });
          handleOnChatClick(newChat);
        }).catch((err: any) => {
          toast.error(err.response?.data?.message || 'Failed to open channel chat');
          navigate('/chats');
        });
      }
    } else if (username) {
      const chat = chats.find(
        (c) => getChatObjectMetadata(c, user)?.title === username && !c.isGroupChat
      );
      if (chat) {
        handleOnChatClick(chat);
      } else {
        createOrGetOneToOneChat({ receiverId: username }).then((res: { data: { data: ChatInterface } }) => {
          const newChat = res.data.data;
          setChats((prev) => {
             if (prev.find(c => c._id === newChat._id)) return prev;
             return [newChat, ...prev];
          });
          handleOnChatClick(newChat);
        }).catch((err: any) => {
          toast.error(err.response?.data?.message || 'Failed to open chat with user');
          navigate('/chats'); // replace URL
        });
      }
    } else {
      // No params: Close any open chat
      currentChat.current = null;
      setMessages([]);
      
      // Clear search and highlights
      setShowSearchInput(false);
      setSearchText('');
      setCurrentSearchIndex(null);
      setHighlightedMessageId(null);
    }
  }, [username, groupId, user, chatsFetched]);

  const handleOnChatClick = (clickedChat: ChatInterface) => {
    // Navigate even if it's the current chat to keep URL in sync
    if (clickedChat.channel) {
      navigate(`/chats/channel/${clickedChat.channel}`);
    } else if (clickedChat.isGroupChat) {
      navigate(`/chats/group/${clickedChat.group}`);
    } else {
      const metadata = getChatObjectMetadata(clickedChat, user!);
      if (metadata?.title) {
        navigate(`/chats/${metadata.title}`);
      }
    }

    if (currentChat.current?._id === clickedChat._id) return;

    // Clear search state when switching chats
    setShowSearchInput(false);
    setSearchText('');
    setCurrentSearchIndex(null);
    setHighlightedMessageId(null);
    setReplyingTo(null);
    setActiveThread(null);

    setMessages([]);
    currentChat.current = clickedChat;
    setMessagesLoading(true);

    socket?.emit(CHAT_EVENTS.JOIN_CHAT_EVENT, clickedChat._id);

    getAllMessages({ chatId: clickedChat._id })
      .then((res: { data: { data: ChatMessageInterface[] } }) => {
        setMessages(res.data.data);
        setMessagesLoading(false);
        // Deep link to message thread if messageId is in URL
        if (messageId) {
          const targetMsg = res.data.data.find(m => m._id === messageId);
          if (targetMsg) {
             handleOpenThread(targetMsg);
          }
        }
      })
      .catch((err: { response?: { status: number } }) => {
        if (err.response?.status === 402) {
          setMessages([]);
        } else {
          toast.error('Failed to load messages');
        }
        setMessagesLoading(false);
      });

    setUnreadMessages((prev) => prev.filter((msg) => msg.chat !== clickedChat._id));
    setTick(t => t + 1);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !recordedAudio && attachmentFiles.length === 0) return;
    if (!currentChat.current) return;

    setIsSending(true);

    const filesToSend = [...attachmentFiles];
    if (recordedAudio) {
      filesToSend.push(new File([recordedAudio], `audio-${Date.now()}.webm`, { type: 'audio/webm' }));
    }

    sendMessage({
      chatId: currentChat.current._id,
      content: message,
      attachments: filesToSend,
      replyTo: replyingTo?._id,
      parentMessage: activeThread?._id,
    })
      .then((res: { data: { data: any } }) => {
        const data = res.data.data;
        if (data.isAI) {
          setMessages((prev) => [...prev, data.senderMessage, data.botMessage]);
          updateChatInList(data.botMessage);
        } else {
          setMessages((prev) => [...prev, data]);
          updateChatInList(data);
        }
        setMessage('');
        setShowMentionList(false);
        setReplyingTo(null);
        setAttachmentFiles([]);
        if (recordedAudio) {
          setRecordedAudio(null);
          setAudioUrl(null);
        }
        setIsSending(false);
      })
      .catch(() => {
        toast.error('Failed to send message');
        setIsSending(false);
      });
  };

  const handleOpenThread = async (msg: ChatMessageInterface) => {
    setActiveThread(msg);
    if (channelId) {
      navigate(`/chats/channel/${channelId}/${msg._id}`, { replace: true });
    }
    setMessagesLoading(true);
    try {
      const res = await getThreadMessages({ messageId: msg._id });
      setMessages(res.data.data);
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleCloseThread = () => {
    setActiveThread(null);
    if (channelId) {
      navigate(`/chats/channel/${channelId}`, { replace: true });
    }
    if (currentChat.current) {
      getAllMessages({ chatId: currentChat.current._id })
        .then((res: { data: { data: ChatMessageInterface[] } }) => {
          setMessages(res.data.data);
        });
    }
  };

  const handleSelectMention = (p: any) => {
    const textBefore = message.substring(0, mentionTriggerPos);
    const textAfter = message.substring(mentionTriggerPos + mentionSearch.length + 1);
    const newText = `${textBefore}@${p.username} ${textAfter}`;
    setMessage(newText);
    setShowMentionList(false);
  };

  const handleDeleteChat = (e: React.MouseEvent, chat: ChatInterface) => {
    e.stopPropagation();
    if (currentChat.current?._id === chat._id) currentChat.current = null;
    deleteChat({ chatId: chat._id })
      .then(() => {
        setChats((prev) => prev.filter((c) => c._id !== chat._id));
        toast.success('Chat removed from list');
      })
      .catch(() => {
        toast.error('Failed to remove chat');
      });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage({ messageId })
      .then(() => {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      })
      .catch(() => {
        toast.error('Failed to delete message');
      });
  };

  const updateChatInList = (message: ChatMessageInterface) => {
    setChats((prevChats) => {
      const chatIndex = prevChats.findIndex((c) => c._id === message.chat);
      if (chatIndex === -1) return prevChats;

      const updatedChat = { 
        ...prevChats[chatIndex], 
        lastMessageDetails: [message],
        updatedAt: new Date().toISOString()
      };
      
      const otherChats = prevChats.filter((_, i) => i !== chatIndex);
      return [updatedChat, ...otherChats];
    });
  };

  const handleReceiveMessage = (data: ChatMessageInterface) => {
    updateChatInList(data);
    if (currentChat.current?._id === data.chat) {
      setMessages((prev) => {
        // Prevent duplicate append
        if (prev.find(m => m._id === data._id)) return prev;

        // If in a thread view, only add if it belongs to this thread
        if (activeThread) {
          if (data.parentMessage === activeThread._id) {
            return [...prev, data];
          }
          return prev;
        } 
        
        // If in main list, only add if it's NOT a comment
        if (!data.parentMessage) {
          return [...prev, data];
        }

        return prev;
      });
    } else {
      setUnreadMessages((prev) => {
         if (prev.find(m => m._id === data._id)) return prev;
         return [...prev, data];
      });
    }
  };

  const handlePinMessage = async (msg: ChatMessageInterface) => {
    if (!currentChat.current) return;
    try {
      await pinMessage(currentChat.current._id, msg._id);
      
      // Update local state for immediate UI refresh
      const updatedPinned = [...(currentChat.current.pinnedMessages || []), msg];
      currentChat.current.pinnedMessages = updatedPinned;
      
      setChats(prev => prev.map(c => 
        c._id === currentChat.current?._id ? { ...c, pinnedMessages: updatedPinned } : c
      ));
      
      toast.success('Message pinned');
    } catch (err) {
      toast.error('Failed to pin message');
    }
  };

  const handleUnpinMessage = async (msg: ChatMessageInterface) => {
    if (!currentChat.current) return;
    try {
      await unpinMessage(currentChat.current._id, msg._id);
      
      // Update local state for immediate UI refresh
      const updatedPinned = (currentChat.current.pinnedMessages || []).filter(pm => pm._id !== msg._id);
      currentChat.current.pinnedMessages = updatedPinned;
 
      setChats(prev => prev.map(c => 
        c._id === currentChat.current?._id ? { ...c, pinnedMessages: updatedPinned } : c
      ));

      toast.success('Message unpinned');
    } catch (err) {
      toast.error('Failed to unpin message');
    }
  };

  const handleForwardSelect = (msg: ChatMessageInterface) => {
    setForwardingMessage(msg);
    setShowForwardDialog(true);
  };

  const handleForwardSend = async (selectedTargets: { id: string; type: 'user' | 'group'; name: string }[]) => {
    if (!forwardingMessage) return;

    try {
      const forwardPromises = selectedTargets.map(async (target) => {
        let chatId = '';

        if (target.type === 'group') {
          // Find if we already have a chat for this group
          const existingChat = chats.find(c => c.group === target.id);
          if (existingChat) {
            chatId = existingChat._id;
          } else {
            // Should not happen if correctly fetched but handle just in case
            const res = await createGroupChat({ groupId: target.id });
            chatId = res.data.data._id;
          }
        } else {
          // For users, we need to get or create a one-to-one chat
          const res = await createOrGetOneToOneChat({ receiverId: target.id });
          chatId = res.data.data._id;
        }

        // Send message with uploaded attachments if they exist
        const attachmentsToSend = forwardingMessage.attachments?.map(att => ({
          url: att.url,
          localPath: att.localPath,
          fileName: att.fileName
        })) || [];

        return sendMessage({
          chatId,
          content: forwardingMessage.content,
          uploadedAttachments: attachmentsToSend,
        });
      });

      await Promise.all(forwardPromises);
      toast.success(`Message forwarded to ${selectedTargets.length} recipient${selectedTargets.length !== 1 ? 's' : ''}`);
      setShowForwardDialog(false);
      setForwardingMessage(null);
      
      // Refresh chats to show last message updated
      getAllChats().then(res => setChats(res.data.data));

    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Failed to forward message to some recipients');
    }
  };

  // Categorize chats
  const partitionedChats = React.useMemo(() => {
    const categories = {
      Individuals: [] as ChatInterface[],
      Groups: [] as ChatInterface[],
      Channels: [] as ChatInterface[],
      Archived: [] as ChatInterface[],
    };

    chats.forEach(chat => {
      if (archivedChatIds.includes(chat._id)) {
        categories.Archived.push(chat);
      } else if (!chat.isGroupChat) {
        categories.Individuals.push(chat);
      } else if (chat.isGroupChat) {
        // Distinguish Groups vs Channels here if logic exists. 
        // For now, if chat.group exists it goes to Groups.
        if (chat.group) {
          categories.Groups.push(chat);
        } else {
          categories.Channels.push(chat);
        }
      }
    });

    return categories;
  }, [chats, archivedChatIds]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      if (prev.includes(section)) {
        return prev.filter(s => s !== section);
      }
      const newOpen = [...prev, section];
      if (newOpen.length > 2) {
        // Keep the two most recently opened
        return newOpen.slice(-2);
      }
      return newOpen;
    });
  };

  const toggleArchive = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setArchivedChatIds(prev => {
      const isArchived = prev.includes(chatId);
      const next = isArchived ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem('archivedChatIds', JSON.stringify(next));
      return next;
    });
    toast.success('Chat archive state updated');
  };

  const handleResizerMouseDown = (e: React.MouseEvent) => {
    const sidebar = document.getElementById('chat-list-container');
    if (!sidebar) return;
    
    const startY = e.clientY;
    const startHeight = resizableHeight;
    const totalHeight = sidebar.clientHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      // Moving DOWN (deltaY > 0) should INCREASE the top section height
      const deltaPercent = (deltaY / totalHeight) * 100;
      const newHeight = startHeight + deltaPercent;
      setResizableHeight(Math.min(Math.max(newHeight, 20), 80));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderChatItem = (chat: ChatInterface) => {
    const metadata = getChatObjectMetadata(chat, user!);
    const isSelected = currentChat.current?._id === chat._id;
    const unreadCount = unreadMessages.filter((m) => m.chat === chat._id).length;
    const isArchived = archivedChatIds.includes(chat._id);

    const activeCount = chat.isGroupChat ? chat.participants.filter(p => {
      const pId = typeof p === 'string' ? p : p._id;
      return onlineUsers.includes(pId?.toString());
    }).length : 0;
    
    return (
      <div
        key={chat._id}
        onClick={() => {
           handleOnChatClick(chat);
           setTick(t => t + 1);
        }}
        className={`group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-300
                    ${isSelected 
                      ? 'bg-primary text-white shadow-xl shadow-primary/30 ring-1 ring-white/20' 
                      : 'text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5 hover:translate-x-1'}`}
      >
        <div className="relative shrink-0">
          <img
            src={metadata?.profilePicture || (chat.isGroupChat ? DEFAULT_GROUP_IMAGE : `https://ui-avatars.com/api/?name=${metadata?.title}&background=4361ee&color=fff`)}
            className="w-12 h-12 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light shadow-sm transition-transform duration-500 group-hover:scale-105"
            alt="Avatar"
          />
          {!chat.isGroupChat ? (
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-dark [html.light_&]:border-white ${
              onlineUsers.includes(metadata?._id || '') ? 'bg-green-500' : 'bg-red-500'
            }`} />
          ) : activeCount > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-surface-dark [html.light_&]:border-white shadow-lg">
              {activeCount}
            </div>
          )}
          {unreadCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-surface-dark [html.light_&]:border-white shadow-lg animate-bounce">
              {unreadCount}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold truncate tracking-tight">{metadata?.title}</h3>
            <span className={`text-[10px] shrink-0 font-semibold ${isSelected ? 'text-white' : 'text-text-muted-dark'}`}>
              {chat.updatedAt && formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true }).replace('about ', '')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={`text-xs truncate font-medium ${isSelected ? 'text-white items-center flex gap-1.5' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}>
              {renderAsLinkOrEmailOrImgs(chat.lastMessageDetails?.[0]?.content || (chat.isGroupChat ? 'Group chat started' : 'Click to start chatting'))}
            </p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={(e) => toggleArchive(e, chat._id)}
                className={`p-1.5 rounded-lg hover:bg-white/10 ${isSelected ? 'text-white' : 'text-text-muted-dark'}`}
                title={isArchived ? "Unarchive chat" : "Archive chat"}
              >
                <Archive size={14} className={isArchived ? 'fill-current' : ''} />
              </button>
              <Link
                to="/chats"
                onClick={(e) => handleDeleteChat(e, chat)}
                className={`p-1.5 rounded-lg hover:bg-danger/20 hover:text-danger ${isSelected ? 'text-white' : 'text-text-muted-dark'}`}
                title="Remove Chat"
              >
                <X size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Socket listeners
  useEffect(() => {
    if (socket) {
      socket.on(CHAT_EVENTS.MESSAGE_RECEIVED_EVENT, handleReceiveMessage);
      socket.on(CHAT_EVENTS.MESSAGE_DELETE_EVENT, (msg: ChatMessageInterface) => {
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      });
      socket.on(CHAT_EVENTS.NEW_CHAT_EVENT, (data: ChatInterface) => {
        setChats((prev) => {
           if (prev.find(c => c._id === data._id)) return prev;
           return [data, ...prev];
        });
      });
    }

    return () => {
      socket?.off(CHAT_EVENTS.MESSAGE_RECEIVED_EVENT);
      socket?.off(CHAT_EVENTS.MESSAGE_DELETE_EVENT);
      socket?.off(CHAT_EVENTS.NEW_CHAT_EVENT);
    };
  }, [socket, chats]);

  // Audio recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Could not access microphone');
    }
  };

  const handleStopRecordingAndDiscard = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // Prevent blob generation
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      setRecordedAudio(null);
      setAudioUrl(null);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayPauseAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Re-render helper

  const handleViewFile = (url: string, fileName?: string) => {
    const MicrosoftFileExtensions = ['.doc', '.docx', '.ppt', '.xlsx', '.pptx', 'xls'];
    const safeFileName = (fileName || '').toLowerCase();
    const isMicrosoftFile = MicrosoftFileExtensions.some(ext => safeFileName.endsWith(ext));
    const officeViewerUrl = "https://view.officeapps.live.com/op/view.aspx?src=";
    
    if (isMicrosoftFile) {
      window.open(`${officeViewerUrl}${encodeURIComponent(url)}`, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSearch = () => {
    if (!searchText.trim()) return; 

    const cloudinaryPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*`, 'gi');
    const urlPattern = new RegExp(`^https://${import.meta.env.VITE_AWS_BUCKET_NAME}\\.s3\\.${import.meta.env.VITE_AWS_REGION}\\.amazonaws\\.com\\/`);
    const cloudinaryVideoPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.(mp4|mov|ogg)`, 'gi');
    const cloudinaryAudioPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.webm`, 'gi');

    // Searching from end to find 'recent' match as per name in user request
    const recentIndex = [...messages].reverse().findIndex((message) => {
      const content = message.content.toLowerCase();
      const st = searchText.toLowerCase();
      return content.includes(st) &&
        !cloudinaryPattern.test(content) &&
        !urlPattern.test(content) &&
        !cloudinaryVideoPattern.test(content) &&
        !cloudinaryAudioPattern.test(content);
    });

    if (recentIndex !== -1) {
      const finalIndex = messages.length - 1 - recentIndex;
      const element = document.getElementById(`message-${finalIndex}`);
      if (element) {
        setHighlightedMessageId(messages[finalIndex]._id);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedMessageId(null), 1500);
        setCurrentSearchIndex(finalIndex);
      }
    }
  };

  const handleSearchUp = () => {
    if (!searchText.trim() || currentSearchIndex === null) return;

    const cloudinaryPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*`, 'gi');
    const urlPattern = new RegExp(`^https://${import.meta.env.VITE_AWS_BUCKET_NAME}\\.s3\\.${import.meta.env.VITE_AWS_REGION}\\.amazonaws\\.com\\/`);
    const cloudinaryVideoPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.(mp4|mov|ogg)`, 'gi');
    const cloudinaryAudioPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.webm`, 'gi');

    const previousIndex = messages
      .slice(0, currentSearchIndex)
      .reverse()
      .findIndex((message) => {
        const content = message.content.toLowerCase();
        const st = searchText.toLowerCase();
        return content.includes(st) &&
          !cloudinaryPattern.test(content) &&
          !urlPattern.test(content) &&
          !cloudinaryVideoPattern.test(content) &&
          !cloudinaryAudioPattern.test(content);
      });

    if (previousIndex !== -1) {
      const newIndex = currentSearchIndex - previousIndex - 1;
      const element = document.getElementById(`message-${newIndex}`);
      if (element) {
        setHighlightedMessageId(messages[newIndex]._id);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedMessageId(null), 1500);
        setCurrentSearchIndex(newIndex);
      }
    }
  };

  const handleSearchDown = () => {
    if (!searchText.trim() || currentSearchIndex === null) return;

    const cloudinaryPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*`, 'gi');
    const urlPattern = new RegExp(`^https://${import.meta.env.VITE_AWS_BUCKET_NAME}\\.s3\\.${import.meta.env.VITE_AWS_REGION}\\.amazonaws\\.com\\/`);
    const cloudinaryVideoPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.(mp4|mov|ogg)`, 'gi');
    const cloudinaryAudioPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.webm`, 'gi');

    const nextIndex = messages
      .slice(currentSearchIndex + 1)
      .findIndex((message) => {
        const content = message.content.toLowerCase();
        const st = searchText.toLowerCase();
        return content.includes(st) &&
          !cloudinaryPattern.test(content) &&
          !urlPattern.test(content) &&
          !cloudinaryVideoPattern.test(content) &&
          !cloudinaryAudioPattern.test(content);
      });

    if (nextIndex !== -1) {
      const newIndex = currentSearchIndex + nextIndex + 1;
      const element = document.getElementById(`message-${newIndex}`);
      if (element) {
        setHighlightedMessageId(messages[newIndex]._id);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedMessageId(null), 1500);
        setCurrentSearchIndex(newIndex);
      }
    }
  };

  const getFileIcon = (fileName?: string) => {
    const safeFileName = fileName || '';
    const extension = safeFileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FaFilePdf className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-500" />;
      case 'mp3':
        return <FaFileAudio className="text-green-500" />;
      case 'mp4':
        return <FaFileVideo className="text-purple-500" />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint className="text-orange-500" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="text-green-500" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getFileIconHtml = (fileName?: string, size: string = 'fa-lg') => {
    const safeFileName = fileName || '';
    const extension = safeFileName.split('.').pop()?.toLowerCase();
    const sizeClass = size === 'small' ? 'fa-sm' : 'fa-lg';
    const fileIconMap: { [key: string]: string } = {
        pdf: `<i class="fa fa-file-pdf text-red-500 ${sizeClass}"></i>`,
        doc: `<i class="fa fa-file-word text-blue-500 ${sizeClass}"></i>`,
        docx: `<i class="fa fa-file-word text-blue-500 ${sizeClass}"></i>`,
        mp3: `<i class="fa fa-file-audio text-green-500 ${sizeClass}"></i>`,
        mp4: `<i class="fa fa-file-video text-purple-500 ${sizeClass}"></i>`,
        ppt: `<i class="fa fa-file-powerpoint text-orange-500 ${sizeClass}"></i>`,
        pptx: `<i class="fa fa-file-powerpoint text-orange-500 ${sizeClass}"></i>`,
        xls: `<i class="fa fa-file-excel text-green-500 ${sizeClass}"></i>`,
        xlsx: `<i class="fa fa-file-excel text-green-500 ${sizeClass}"></i>`,
        png: `<i class="fa fa-file-image text-yellow-500 ${sizeClass}"></i>`,
        jpg: `<i class="fa fa-file-image text-yellow-500 ${sizeClass}"></i>`,
        jpeg: `<i class="fa fa-file-image text-yellow-500 ${sizeClass}"></i>`,
        default: `<i class="fa fa-file-alt text-gray-500 ${sizeClass}"></i>`,
    };
    return fileIconMap[extension || 'default'] || fileIconMap['default'];
  };

  const renderAsLinkOrEmailOrImgs = (text: string) => {
    if (!text || text === 'No messages' || text === 'Click to start chatting') return text;

    // Helper to truncate a URL if too long
    const truncateLink = (url: string, maxLength: number): string => {
      return url.length > maxLength ? url.slice(0, maxLength) + "..." : url;
    };

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
    const s3Pattern = new RegExp(`https://${import.meta.env.VITE_AWS_BUCKET_NAME}\\.s3(?:\\.[a-z0-9-]+)?\\.amazonaws\\.com/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*`, 'gi');

    const urls = text.match(urlRegex);
    const emails = text.match(emailRegex);

    const cloudinaryPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*`, 'gi');
    const cloudinaryVideoPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.(mp4|mov|ogg)`, 'gi');
    const cloudinaryAudioPattern = new RegExp(`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*\\.webm`, 'gi');
    
    if (cloudinaryPattern.test(text)) {
      return (
        <span className="flex items-center">
          <FaImage className="inline-block mr-1" /> Photo
        </span>
      );
    }
    if (cloudinaryVideoPattern.test(text)) {
      return (
        <span className="flex items-center">
          <FaFileVideo className="inline-block mr-1" /> Video
        </span>
      );
    }
    if (cloudinaryAudioPattern.test(text)) {
      return (
        <span className="flex items-center">
          <FaMicrophone className="inline-block mr-1" /> Audio
        </span>
      );
    }

    if (s3Pattern.test(text)) { 
      const fileName = decodeURIComponent(text.split('/').pop() || '');
      const cleanedFileName = fileName.replace(/^\d+[-_]/, '');
      const fileNamePattern = new RegExp(`filename=([^&]+)`);
      const match = fileNamePattern.exec(text);
      const displayName = match ? decodeURIComponent(match[1]) : cleanedFileName;
      
      const fileIconHtml = getFileIconHtml(fileName, 'small');
      return (
        <span className="flex items-center">
          <span dangerouslySetInnerHTML={{ __html: fileIconHtml }} style={{ marginRight: '5px' }}/> {displayName}
        </span>
      );
    }

    if (emails && emails.length > 0) {
      return emails[0];
    } else if (urls && urls.length > 0) {
      const url = urls[0];
      return truncateLink(url, 30);
    } else {
      return text;
    }
  };

  const renderMessageWithLinks = (content: string, isMine: boolean) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:opacity-80 transition-opacity drop-shadow-sm ${isMine ? 'text-white font-medium' : 'text-primary font-medium'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      
      // Handle mentions and **bold** text
      const boldRegex = /(\*\*[^*]+\*\*)/g;
      
      // Look for @username patterns
      const mentionRegex = /(@[\w.-]+)/g;
      const mentionParts = part.split(mentionRegex);
      
      return mentionParts.map((mPart, j) => {
        // Check if it's a mention
        if (mPart.startsWith('@')) {
          const mUsername = mPart.substring(1);
          const isBot = mUsername === 'hiveai';
          // Always render mentions as links
          return (
            <span 
              key={`${i}-${j}`} 
              onClick={() => !isBot && navigate(`/profile/${mUsername}`)}
              className={`font-bold drop-shadow-sm transition-all hover:scale-105 inline-block cursor-pointer ${isMine ? 'text-white underline underline-offset-4 decoration-white/30' : 'text-primary underline underline-offset-4 decoration-primary/30'}`}
            >
              {mPart}
            </span>
          );
        }
        
        // Handle bold text in non-mention parts
        const boldParts = mPart.split(boldRegex);
        return boldParts.map((bPart, k) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            const boldText = bPart.slice(2, -2);
            return (
              <span key={`${i}-${j}-${k}`} className={`font-extrabold drop-shadow-md ${isMine ? 'text-white' : 'text-text-dark [html.light_&]:text-text-light'}`}>
                {boldText}
              </span>
            );
          }
          return bPart;
        });
      });
    });
  };

  const getReplyPreview = (msg: ChatMessageInterface) => {
    if (msg.attachments && msg.attachments.length > 0) {
      const firstAttachment = msg.attachments[0];
      const fileNameLower = (firstAttachment.fileName || '').toLowerCase();
      const urlLower = (firstAttachment.url || '').toLowerCase();
      const sourceText = `${fileNameLower} ${urlLower}`;
      
      if (/\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|svg)(\?|$)/i.test(sourceText)) {
        return <><FaImage size={14} className="mr-1.5" /> Photo</>;
      }
      if (/\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?|$)/i.test(sourceText)) {
        return <><FaFileVideo size={14} className="mr-1.5" /> Video</>;
      }
      if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|oga)(\?|$)/i.test(sourceText)) {
        return <><FaFileAudio size={14} className="mr-1.5" /> Audio</>;
      }
      return <><Folder size={14} className="mr-1.5" /> {firstAttachment.fileName || 'Archive'}</>;
    }
    return msg.content || '...';
  };


  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen w-full bg-surface-base-dark [html.light_&]:bg-surface-base-light overflow-hidden">
      {/* ─── LEFT PANEL: CHAT LIST ─── */}
      <div
        className={`flex-col h-full border-r border-border-dark [html.light_&]:border-border-light
                    bg-surface-dark/50 [html.light_&]:bg-surface-light/50
                    ${currentChat.current ? 'hidden md:flex w-full md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'}`}
      >
        <div className="p-4 border-b border-border-dark [html.light_&]:border-border-light">
          <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light mb-4">
            Your Chats
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light" size={18} />
            <input
              type="text"
              placeholder="Search chats..."
              value={chatsSearch}
              onChange={(e) => setChatsSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm
                         bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-dark [html.light_&]:text-text-light
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div id="chat-list-container" className="flex-1 flex flex-col overflow-hidden p-2">
          {chatsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            (() => {
              const SECTION_ORDER = ['Individuals', 'Groups', 'Channels', 'Archived'];
              const visibleOpenSections = SECTION_ORDER.filter(s => openSections.includes(s));
              const hasTwoOpen = visibleOpenSections.length === 2;

              return SECTION_ORDER.map((section) => {
                const sectionKey = section as keyof typeof partitionedChats;
                const isOpen = openSections.includes(section);
                const sectionChats = partitionedChats[sectionKey].filter(chat => 
                  getChatObjectMetadata(chat, user!)?.title?.toLowerCase().includes(chatsSearch.toLowerCase())
                );
                
                sectionChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                const isTopVisible = visibleOpenSections[0] === section;
                const isBottomVisible = visibleOpenSections[1] === section;

                let style = {};
                if (isOpen) {
                  if (hasTwoOpen) {
                    // resizableHeight now represents the top section's height
                    style = { height: isTopVisible ? `${resizableHeight}%` : `${100 - resizableHeight}%` };
                  } else {
                    style = { flex: 1 };
                  }
                }

                return (
                  <React.Fragment key={section}>
                    {/* Add resizer BEFORE the bottom visible open section if 2 are open */}
                    {hasTwoOpen && isBottomVisible && (
                      <div 
                        className="h-2 bg-transparent cursor-row-resize flex items-center justify-center group shrink-0 z-10"
                        onMouseDown={handleResizerMouseDown}
                      >
                        <div className="w-12 h-1 rounded-full bg-border-dark [html.light_&]:bg-border-light group-hover:bg-primary group-active:bg-primary transition-all shadow-sm" />
                      </div>
                    )}

                    <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? '' : 'shrink-0'}`} style={style}>
                      <button
                        onClick={() => toggleSection(section)}
                        className="flex items-center justify-between w-full p-2 hover:bg-white/5 [html.light_&]:hover:bg-black/5 rounded-lg transition-colors group shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown 
                            size={16} 
                            className={`text-text-muted-dark transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} 
                          />
                          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-text-muted-dark group-hover:text-text-dark">
                            {section} ({sectionChats.length})
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 py-1 px-2 custom-scrollbar">
                          {sectionChats.length > 0 ? (
                            sectionChats.map(chat => renderChatItem(chat))
                          ) : (
                            <div className="text-center py-8 text-[10px] font-bold text-text-muted-dark/50 uppercase tracking-widest">
                              No {section.toLowerCase()} yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: CHAT BOX ─── */}
      <div
        className={`flex-col h-full flex-1 bg-surface-dark [html.light_&]:bg-surface-light
                    ${currentChat.current ? 'flex w-full' : 'hidden md:flex'}`}
      >
        {currentChat.current ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b border-border-dark [html.light_&]:border-border-light bg-surface-dark [html.light_&]:bg-surface-card-light/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                {!activeThread && (
                  <button
                    onClick={() => {
                      currentChat.current = null;
                      setTick(t => t+1);
                    }}
                    className="p-1 -ml-1 text-text-dark [html.light_&]:text-text-light hover:opacity-70 transition-colors"
                  >
                    <ArrowLeft size={22} strokeWidth={2} />
                  </button>
                )}
                {!activeThread ? (
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const chat = currentChat.current;
                      if (!chat) return;
                      if (chat.channel) {
                        navigate(`/channels/${chat.channel}`);
                      } else if (chat.isGroupChat) {
                        navigate(`/groups/view/${chat.group}`);
                      } else {
                        const metadata = getChatObjectMetadata(chat, user!);
                        if (metadata?.title) {
                          navigate(`/profile/${metadata.title}`);
                        }
                      }
                    }}
                  >
                    <img
                      src={getChatObjectMetadata(currentChat.current, user!)?.profilePicture || (currentChat.current.isGroupChat ? DEFAULT_GROUP_IMAGE : `https://ui-avatars.com/api/?name=${getChatObjectMetadata(currentChat.current, user!)?.title}&background=4361ee&color=fff`)}
                      className="w-10 h-10 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                      alt="Profile"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
                        <h2 className="font-bold text-[14px] md:text-[17px] text-text-dark [html.light_&]:text-text-light flex items-center md:gap-2 gap-1 overflow-hidden">
                          <span className="truncate">{getChatObjectMetadata(currentChat.current, user!)?.title}</span>
                          {!currentChat.current?.isGroupChat && (
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              onlineUsers.includes(getChatObjectMetadata(currentChat.current, user!)?._id || '') 
                                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' 
                                : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
                            }`} />
                          )}
                        </h2>

                        {currentChat.current?.isGroupChat && currentChat.current.participants && (
                          <span className="text-[11px] md:text-[13px] font-medium text-primary bg-primary/10 px-2 py-0.2 md:py-0.5 rounded-full w-fit">
                            {currentChat.current.participants.filter(p => {
                              const pId = typeof p === 'string' ? p : p._id;
                              return onlineUsers.includes(pId?.toString());
                            }).length} active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseThread}
                      className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Back to channel"
                    >
                      <ArrowLeft size={22} strokeWidth={2.5} />
                    </button>
                    <div>
                      <h2 className="font-bold text-[15px] text-text-dark [html.light_&]:text-text-light">Discussion</h2>
                      <p className="text-[11px] text-text-muted-dark">Replying to post</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center md:gap-5 gap-2 text-text-muted-dark [html.light_&]:text-text-muted-light pr-2">
                <button 
                  onClick={() => currentChat.current && toggleArchive({ stopPropagation: () => {} } as any, currentChat.current._id)}
                  className={`p-1 hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-lg transition-colors cursor-pointer ${archivedChatIds.includes(currentChat.current?._id || '') ? 'text-primary bg-primary/10' : ''}`} 
                  title={archivedChatIds.includes(currentChat.current?._id || '') ? "Unarchive chat" : "Archive chat"}
                >
                  <Archive size={22} strokeWidth={2} />
                </button>
                <button 
                  onClick={() => setShowFileModal(true)}
                  className="p-1 hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-lg transition-colors cursor-pointer" 
                  title="Files"
                >
                  <Folder fill="currentColor" size={24} strokeWidth={1} />
                </button>
                <button 
                  onClick={() => {
                    setShowSearchInput(!showSearchInput);
                    if (!showSearchInput) {
                      setSearchText('');
                      setCurrentSearchIndex(null);
                    }
                  }}
                  className={`p-1 hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-lg transition-colors cursor-pointer ${showSearchInput ? 'bg-white/20' : ''}`} 
                  title="Search"
                >
                  <Search size={22} className="font-bold" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {showSearchInput && (
              <div className="px-4 py-2 bg-surface-elevated-dark/30 [html.light_&]:bg-surface-elevated-light/30 border-b border-border-dark/30 [html.light_&]:border-border-light/30 flex items-center gap-3 animate-in slide-in-from-top duration-200">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search messages..."
                    className="w-full bg-surface-dark/50 [html.light_&]:bg-surface-light border border-border-dark [html.light_&]:border-border-light rounded-lg py-1.5 pl-9 pr-4 text-sm text-text-dark [html.light_&]:text-text-light outline-none focus:border-primary transition-colors"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleSearchUp}
                    disabled={!searchText.trim()}
                    className="p-1.5 hover:bg-white/10 [html.light_&]:hover:bg-black/5 disabled:opacity-50 rounded-lg text-text-dark [html.light_&]:text-text-light transition-colors"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button 
                    onClick={handleSearchDown}
                    disabled={!searchText.trim()}
                    className="p-1.5 hover:bg-white/10 [html.light_&]:hover:bg-black/5 disabled:opacity-50 rounded-lg text-text-dark [html.light_&]:text-text-light transition-colors"
                  >
                    <ChevronDown size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setShowSearchInput(false);
                      setSearchText('');
                      setCurrentSearchIndex(null);
                    }}
                    className="p-1.5 hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-lg text-text-dark [html.light_&]:text-text-light transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading && (
                <div className="flex items-center justify-center p-8">
                   <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
               {messages.length === 0 && !messagesLoading && !activeThread ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-text-muted-dark [html.light_&]:text-text-muted-light">
                  <div className="w-16 h-16 rounded-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light flex items-center justify-center mb-4">
                    <Send size={24} className="text-primary opacity-50" />
                  </div>
                  <p>Send a message to start the conversation.</p>
                </div>
              ) : (
                <>
                  {activeThread && (
                    <div className="mb-8 px-4 flex flex-col items-center">
                       {/* Render the parent message first */}
                       <div className="w-full flex justify-start mb-4">
                          <div className="bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-primary/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-lg">
                             <div className="text-[14px] font-bold text-primary mb-1">{activeThread.sender?.username}</div>
                             {activeThread.content && <p className="text-[15px] leading-relaxed">{activeThread.content}</p>}
                             <p className="text-[11px] mt-1 text-text-muted-dark italic">Original Post • {format(new Date(activeThread.createdAt), 'hh:mm a')}</p>
                          </div>
                       </div>
                       {/* Then the badge */}
                       <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-primary/20">
                         Discussion started
                       </div>
                    </div>
                  )}
                  {messages.map((msg, index) => {
                  const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
                  const currentUserId = user?._id || (user as any)?.id;
                  const isMine = senderId === currentUserId;
                  const isHighlighted = msg._id === highlightedMessageId;
                  const isPinned = currentChat.current?.pinnedMessages?.some(pm => pm._id === msg._id);
                  
                  return (
                    <div
                      key={msg._id}
                      id={`message-${index}`}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'} transition-all duration-300 ${isHighlighted ? 'scale-[1.02] z-10' : ''}`}
                    >
                      <div
                        onContextMenu={(e) => handleContextMenu(e, msg, isMine)}
                        className={`group relative max-w-[75%] md:max-w-md px-4 py-2.5 rounded-2xl ${
                          isMine
                            ? `bg-primary text-white rounded-tr-sm ${isPinned ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0b101e]' : ''}`
                            : `bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light text-text-dark [html.light_&]:text-text-light border border-border-dark [html.light_&]:border-border-light rounded-tl-sm ${isPinned ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : ''}`
                        } cursor-context-menu transition-all duration-500 ${
                          isHighlighted ? 'ring-4 ring-primary/40 shadow-[0_0_20px_rgba(67,97,238,0.4)] scale-105' : ''
                        }`}
                      >
                        {!isMine && currentChat.current?.isGroupChat && (
                          <div className="text-[14px] font-bold text-primary mb-1 opacity-90 truncate">
                            {msg.sender?.username || 'Deleted User'}
                          </div>
                        )}
                        {isPinned && (
                          <div className={`absolute -top-2 ${isMine ? '-left-2' : '-right-2'} bg-emerald-500 text-white p-1 rounded-full shadow-lg z-20`}>
                            <Paperclip size={10} className="rotate-45" />
                          </div>
                        )}
                        {msg.replyTo && (
                          <div 
                            onClick={() => {
                              const targetIndex = messages.findIndex(m => m._id === msg.replyTo?._id);
                              if (targetIndex !== -1) {
                                const element = document.getElementById(`message-${targetIndex}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  setHighlightedMessageId(msg.replyTo?._id || null);
                                  setTimeout(() => setHighlightedMessageId(null), 1500);
                                }
                              }
                            }}
                            className={`mb-2 p-2 rounded-lg text-xs cursor-pointer border-l-4 ${
                              isMine 
                                ? 'bg-white/10 border-white/30 text-white/90' 
                                : 'bg-surface-dark/40 [html.light_&]:bg-black/5 border-primary/50 text-text-muted-dark [html.light_&]:text-text-muted-light'
                            } hover:opacity-80 transition-opacity`}
                          >
                            <div className="font-bold mb-0.5 opacity-80">
                              {msg.replyTo.sender?.username || 'Deleted User'}
                            </div>
                            <div className="flex items-center overflow-hidden whitespace-nowrap">
                              <span className="truncate">{getReplyPreview(msg.replyTo as any)}</span>
                            </div>
                          </div>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map((file, idx) => {
                              const fileNameLower = (file.fileName || '').toLowerCase();
                              const urlLower = (file.url || '').toLowerCase();
                              const sourceText = `${fileNameLower} ${urlLower}`;
                              const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|svg)(\?|$)/i.test(sourceText);
                              const hasAudioHint =
                                sourceText.includes('recording') ||
                                sourceText.includes('audio') ||
                                sourceText.includes('voice') ||
                                sourceText.includes('blob')
                                ;
                              const isAudioExt = /\.(mp3|wav|ogg|m4a|aac|flac|opus|oga)(\?|$)/i.test(sourceText);
                              const isWebm = /\.webm(\?|$)/i.test(sourceText);
                              const isAudio = isAudioExt || (isWebm && hasAudioHint);
                              const isVideoExt = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?|$)/i.test(sourceText);
                              const isVideo = isVideoExt && !isAudio && !isImage;

                              if (isImage) {
                                return (
                                  <div key={idx} className="relative group/img mb-1 mt-1 cursor-pointer" onClick={() => setPreviewImage(file.url)}>
                                    <img 
                                      src={file.url} 
                                      alt="Attachment" 
                                      className="max-w-full rounded-xl h-auto max-h-72 object-cover shadow-sm border border-white/10" 
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                                       <Search size={24} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                );
                              } else if (isAudio) {
                                return (
                                  <div key={idx} className={`p-1.5 rounded-full mb-1 mt-1 w-fit ${isMine ? 'bg-white/90' : 'bg-white/20'}`}>
                                    <audio controls src={file.url} className="h-9 w-60 outline-none" />
                                  </div>
                                );
                              } else if (isVideo) {
                                return (
                                  <video
                                    key={idx}
                                    controls
                                    src={file.url}
                                    className="max-w-full rounded-xl h-auto max-h-72 object-cover"
                                  />
                                );
                              } else if (file.fileName) {
                                return (
                                  <div key={idx} className="flex flex-col bg-surface-elevated-dark/20 [html.light_&]:bg-surface-elevated-light/40 border border-emerald-600/30 rounded-xl p-3 mb-1 min-w-[220px] max-w-[280px]">
                                      <div className="flex items-center gap-3 mb-3 shrink-0">
                                        {getFileIcon(file.fileName)}
                                        <span className="text-[15px] font-medium truncate flex-1 leading-snug drop-shadow-sm">
                                          {file.fileName.replace(/^\d+[-_]/, '')}
                                        </span>
                                      </div>
                                    <div className="flex items-center gap-2">
                                       <button onClick={() => handleViewFile(file.url, file.fileName || '')} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-dark/40 [html.light_&]:bg-surface-light border border-border-dark [html.light_&]:border-border-light hover:bg-emerald-600/90 hover:text-white transition-colors py-1.5 rounded-lg text-[13px] font-medium shadow-sm">
                                         <FaEye size={14} /> View
                                       </button>
                                       <a href={file.url} download={file.fileName} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-surface-dark/40 [html.light_&]:bg-surface-light border border-border-dark [html.light_&]:border-border-light hover:bg-emerald-600/90 hover:text-white transition-colors py-1.5 rounded-lg text-[13px] font-medium shadow-sm">
                                         <FaDownload size={13} /> Download
                                       </a>
                                    </div>
                                  </div>
                                );
                              } else {
                                return null;
                              }
                            })}
                          </div>
                        )}
                        {msg.content && (
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {renderMessageWithLinks(msg.content, isMine)}
                          </p>
                        )}
                        <p className={`text-[11px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}>
                          {msg.createdAt ? format(new Date(msg.createdAt), 'hh:mm a') : format(new Date(), 'hh:mm a')}
                        </p>
                        
                        {/* Leave a comment footer for channel messages (only in main list, not in thread view) */}
                        {currentChat.current?.channel && !activeThread && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenThread(msg);
                            }}
                            className={`mt-2 pt-2 border-t flex items-center justify-between group/comment cursor-pointer hover:opacity-80 ${isMine ? 'border-white/20' : 'border-border-dark/30 [html.light_&]:border-border-light/30'}`}
                          >
                             <div className="flex items-center gap-2">
                               <span className={`text-[13px] font-bold group-hover/comment:underline ${isMine ? 'text-white' : 'text-primary'}`}>
                                 {msg.commentCount || 0} comments
                               </span>
                             </div>
                             <ChevronUp size={14} className={`rotate-90 ${isMine ? 'text-white' : 'text-primary'}`} />
                          </div>
                        )}
                        {currentChat.current?.channel && !activeThread && (
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenThread(msg);
                            }}
                            className={`mt-1 w-full text-center py-1.5 text-[13px] font-bold border-t transition-colors ${isMine ? 'text-white hover:bg-white/10 border-white/10' : 'text-primary hover:bg-primary/5 border-border-dark/20'}`}
                           >
                             Leave a comment
                           </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            </div>

            {/* Chat input */}
            <div className="p-4 bg-surface-dark [html.light_&]:bg-surface-light relative z-10 w-full max-w-full">
              {replyingTo && (
                <div className="flex items-center gap-3 p-3 mb-2 bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/80 border-l-4 border-primary rounded-r-xl animate-in slide-in-from-bottom-2 duration-200 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary mb-0.5">
                      Replying to {replyingTo.sender?.username || 'Deleted User'}
                    </div>
                    <div className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light truncate flex items-center">
                      {getReplyPreview(replyingTo)}
                    </div>
                  </div>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X size={16} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
                  </button>
                </div>
              )}
              {isRecording && (
                <div className="flex items-center justify-between p-4 mb-3 bg-[#0b0f19] rounded-2xl overflow-hidden shadow-2xl border border-border-dark [html.light_&]:border-border-light w-full">
                  <div className="flex items-center gap-3">
                     <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-black animate-ping absolute"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-black relative z-10"></div>
                     </div>
                     <span className="text-white font-medium text-[16px]">Recording...</span>
                  </div>
                  <button 
                    onClick={handleStopRecordingAndDiscard}
                    className="text-white hover:text-danger p-1 rounded-full transition-colors z-20"
                  >
                    <X size={20} strokeWidth={3.5} />
                  </button>
                </div>
              )}

              {recordedAudio && !isRecording && (
                <div className="flex items-center gap-3 p-3 mb-3 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-primary/30 rounded-xl max-w-sm w-full">
                  <button
                    onClick={handlePlayPauseAudio}
                    className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-full bg-primary text-white"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
                  </button>
                  <div className="flex-1">
                    <div className="overflow-hidden h-2 bg-black/20 rounded-full relative w-full mb-1">
                       <div className="absolute left-0 top-0 h-full bg-primary opacity-80" style={{ width: `${audioProgress}%`, transition: 'width 0.1s linear' }} />
                    </div>
                    <span className="text-xs text-text-muted-dark font-medium">Audio Preview</span>
                  </div>
                  <button
                    onClick={() => {
                      setRecordedAudio(null);
                      setAudioUrl(null);
                      setIsPlaying(false);
                      setAudioProgress(0);
                    }}
                    className="p-2 bg-surface-dark rounded-full text-text-muted-dark hover:text-danger [html.light_&]:text-text-muted-light transition-colors shadow-sm"
                  >
                    <X size={16} />
                  </button>
                  <audio 
                    ref={audioRef}
                    src={audioUrl || ''}
                    onEnded={() => {
                       setIsPlaying(false);
                       setAudioProgress(0);
                    }}
                    onTimeUpdate={() => {
                      if (audioRef.current && audioRef.current.duration) {
                        setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                      }
                    }}
                  />
                </div>
              )}

              {isCameraActive && (
                <div className="relative w-full max-w-2xl mx-auto mb-3 bg-black rounded-2xl overflow-hidden shadow-2xl border border-border-dark [html.light_&]:border-border-light">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-auto object-contain max-h-[50vh]"
                  />
                  
                  <button 
                    onClick={() => setIsCameraActive(false)}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-20"
                  >
                    <X size={20} />
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex justify-center z-10">
                    <button 
                      onClick={handleCapturePhoto}
                      className="w-14 h-14 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 border-4 border-white/20"
                    >
                      <Camera size={24} fill="currentColor" className="text-white" />
                    </button>
                  </div>
                </div>
              )}
              {attachmentFiles.length > 0 && (
                <div className="flex gap-4 mb-3 overflow-x-auto p-4 bg-surface-elevated-dark/90 [html.light_&]:bg-surface-elevated-light/90 backdrop-blur-md border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-inner">
                  {attachmentFiles.map((file, idx) => {
                    const isDoc = file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i);
                    return (
                      <div key={idx} className="relative shrink-0 group">
                        {isDoc ? (
                          <div className="flex flex-col items-center justify-center w-24 h-24 bg-surface-dark [html.light_&]:bg-surface-light rounded-xl border border-primary/30 shadow-md">
                             {getFileIcon(file.name)}
                             <span className="text-[10px] mt-2 max-w-[80px] truncate">{file.name}</span>
                          </div>
                        ) : (
                          <img src={URL.createObjectURL(file)} alt="preview" className="w-24 h-24 object-cover rounded-xl border border-primary/30 shadow-md transition-transform group-hover:scale-[1.02]" />
                        )}
                        <button
                          onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2.5 -right-2.5 bg-surface-dark [html.light_&]:bg-surface-light hover:bg-danger text-text-muted-dark hover:text-white [html.light_&]:text-text-muted-light rounded-full p-1.5 shadow-lg border border-border-dark [html.light_&]:border-border-light transition-colors z-10"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex items-end gap-3 max-w-full relative">
                {canChat ? (
                  <>
                    <div className="flex-1 min-w-0 relative flex items-center bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light rounded-xl border border-border-dark [html.light_&]:border-border-light pl-4 pr-2 min-h-[52px]">
                      {/* Mention List UI */}
                      {showMentionList && filteredParticipants.length > 0 && (
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-surface-dark/95 [html.light_&]:bg-surface-light/95 backdrop-blur-xl border border-border-dark [html.light_&]:border-border-light rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
                          <div className="p-2 border-b border-border-dark/50 [html.light_&]:border-border-light/50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-muted-dark uppercase tracking-wider">Mention member</span>
                            <span className="text-[10px] text-text-muted-dark/50">↑↓ to navigate, Enter to select</span>
                          </div>
                          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {filteredParticipants.map((p, idx) => (
                              <div
                                key={p._id}
                                onClick={() => handleSelectMention(p)}
                                onMouseEnter={() => setMentionIndex(idx)}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${idx === mentionIndex ? 'bg-primary/20 bg-primary/10' : 'hover:bg-surface-elevated-dark/50 [html.light_&]:hover:bg-surface-elevated-light/50'}`}
                              >
                                <img src={p.profilePicture} alt={p.username} className="w-8 h-8 rounded-full border border-border-dark" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate text-text-dark [html.light_&]:text-text-light">{p.username}</div>
                                  <div className="text-[10px] text-text-muted-dark truncate">{p.email || 'Member'}</div>
                                </div>
                                {idx === mentionIndex && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <textarea
                        maxLength={MESSAGE_LENGTH_LIMIT}
                        value={message}
                        onChange={(e) => {
                          const val = e.target.value;
                          const cursorPos = e.target.selectionStart;
                          setMessage(val);
                          
                          const textBeforeCursor = val.substring(0, cursorPos);
                          const lastAtPos = textBeforeCursor.lastIndexOf('@');
                          
                          if (lastAtPos !== -1) {
                            const afterAt = textBeforeCursor.substring(lastAtPos + 1);
                            if (!afterAt.includes(' ')) {
                              setMentionSearch(afterAt);
                              setMentionTriggerPos(lastAtPos);
                              setShowMentionList(true);
                              setMentionIndex(0);
                              
                              // Filter participants
                              const filtered = (currentChat.current?.participants || []).filter(p => 
                                p.username.toLowerCase().includes(afterAt.toLowerCase())
                              );
                              // Also allow hiveai
                              if ('hiveai'.includes(afterAt.toLowerCase())) {
                                filtered.push({ 
                                  _id: 'hiveai', 
                                  username: 'hiveai', 
                                  profilePicture: 'https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png',
                                  email: 'hiveai@bot.com'
                                });
                              }
                              setFilteredParticipants(filtered);
                              return;
                            }
                          }
                          setShowMentionList(false);
                        }}
                        onKeyDown={(e) => {
                          if (showMentionList && filteredParticipants.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionIndex(prev => (prev + 1) % filteredParticipants.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionIndex(prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSelectMention(filteredParticipants[mentionIndex]);
                            } else if (e.key === 'Escape') {
                              setShowMentionList(false);
                            }
                          } else if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={currentPlaceholder}
                        disabled={!!recordedAudio}
                        rows={1}
                        className="flex-1 min-w-0 text-[15px] bg-transparent border-none text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-0 resize-none self-center h-auto min-h-[22px] max-h-[120px] py-3.5 m-0 shadow-none leading-relaxed"
                      />
                      <div className="flex items-center gap-1.5 pl-2 shrink-0">
                        <span className="text-xs font-medium text-emerald-500/90 [html.light_&]:text-emerald-600/90 mr-1 select-none">
                          {message.length}/{MESSAGE_LENGTH_LIMIT}
                        </span>
                        <button
                          onClick={isRecording ? handleStopRecording : handleStartRecording}
                          className={`p-2 rounded-full transition-colors ${isRecording ? 'text-danger animate-pulse bg-danger/10' : 'text-text-muted-dark hover:text-text-dark [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light'}`}
                        >
                          {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowAttachments(!showAttachments)}
                            className={`p-2 rounded-full transition-colors ${showAttachments ? 'text-primary bg-primary/10' : 'text-text-muted-dark hover:text-text-dark [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light'}`}
                          >
                            <Paperclip size={20} className={showAttachments ? "rotate-45 transition-transform" : "transition-transform"} />
                          </button>

                          {/* Floating Attachment Buttons */}
                          <div className={`absolute bottom-full right-0 mb-4 flex flex-col gap-3 transition-all duration-300 ${showAttachments ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
                            <button onClick={handleGalleryClick} className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105">
                              <ImageIcon size={22} className="text-white" />
                            </button>
                            <button onClick={handleCameraClick} className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105">
                              <Camera size={22} className="text-white" />
                            </button>
                            <button onClick={handleDocsClick} className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105">
                              <FileText size={22} className="text-white" />
                            </button>
                          </div>
                          
                          {/* Hidden image inputs for Gallery */}
                          <input 
                            type="file" 
                            ref={cameraInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*,video/*" 
                            className="hidden" 
                            multiple
                          />
                          <input 
                            type="file" 
                            ref={docsInputRef} 
                            onChange={handleFileChange} 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" 
                            className="hidden" 
                            multiple
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={(!message.trim() && !recordedAudio && attachmentFiles.length === 0) || isRecording || isSending}
                      onClick={handleSendMessage}
                      className="w-[52px] h-[52px] shrink-0 rounded-xl bg-white [html.light_&]:bg-surface-elevated-dark text-black [html.light_&]:text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      {isSending ? <Loader2 size={24} className="stroke-current animate-spin" /> : <Send size={22} className="mr-0.5" />}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 relative flex items-center justify-center bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/50 rounded-xl border border-border-dark [html.light_&]:border-border-light px-4 py-3 min-h-[52px]">
                      <span className="text-danger font-bold text-[13px] text-center tracking-tight">
                        {currentChat.current?.channel 
                          ? "You need to be admin inorder to send messages in a channel"
                          : "Both parties must follow each other inorder to continue this chat"
                        }
                      </span>
                    </div>

                    <button
                      disabled
                      className="w-[52px] h-[52px] shrink-0 rounded-xl bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/50 text-text-muted-dark flex items-center justify-center opacity-50 cursor-not-allowed border border-border-dark [html.light_&]:border-border-light shadow-sm"
                    >
                      <Send size={22} className="mr-0.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted-dark [html.light_&]:text-text-muted-light p-8">
            <div className="w-20 h-20 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light rounded-full flex items-center justify-center mb-6">
               <Send size={32} className="text-primary opacity-50 ml-1" />
            </div>
            <h2 className="text-xl font-display font-medium text-text-dark [html.light_&]:text-text-light mb-2">
              Your Messages
            </h2>
            <p className="max-w-sm">
              Select a conversation from the sidebar or start a new one from a user's profile.
            </p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.msg && (
        <div
          className="fixed z-50 py-1 rounded-xl bg-[#0b101e] [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light shadow-xl shadow-black/50 overflow-hidden w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              handleForwardSelect(contextMenu.msg!);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-surface-elevated-dark [html.light_&]:text-text-light [html.light_&]:hover:bg-surface-elevated-light transition-colors"
          >
            Forward
          </button>
          <button
            onClick={() => {
              setReplyingTo(contextMenu.msg);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-surface-elevated-dark [html.light_&]:text-text-light [html.light_&]:hover:bg-surface-elevated-light transition-colors"
          >
            Reply
          </button>
          <button
            onClick={() => {
              handleCopyMessage(contextMenu.msg!.content);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-surface-elevated-dark [html.light_&]:text-text-light [html.light_&]:hover:bg-surface-elevated-light transition-colors"
          >
            Copy
          </button>
          {(!currentChat.current?.channel || currentChat.current?.admin === user?._id) && (
            <>
              {currentChat.current?.pinnedMessages?.some(pm => pm._id === contextMenu.msg!._id) ? (
                <button
                  onClick={() => {
                    handleUnpinMessage(contextMenu.msg!);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  Unpin
                </button>
              ) : (
                <button
                  onClick={() => {
                    handlePinMessage(contextMenu.msg!);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                >
                  Pin
                </button>
              )}
            </>
          )}
          {contextMenu.msg!.attachments?.some(file => file.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) && (
            <>
              <div className="mx-2 my-1 border-t border-border-dark [html.light_&]:border-border-light opacity-50" />
              <button
                onClick={() => {
                  const imageFile = contextMenu.msg!.attachments?.find(file => file.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
                  if (imageFile) {
                    downloadImage(imageFile.url, imageFile.fileName || 'image.jpg');
                  }
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-4 py-2 text-sm text-green-500 hover:bg-green-500/10 transition-colors font-medium"
              >
                Download Image
              </button>
            </>
          )}
          {contextMenu.isMine && (
            <>
              <div className="mx-2 my-1 border-t border-border-dark [html.light_&]:border-border-light opacity-50" />
              <button
                onClick={() => {
                  handleDeleteMessage(contextMenu.msg!._id);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                Delete Message
              </button>
            </>
          )}
        </div>
      )}

      {/* File Gallery Modal */}
      {showFileModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-300"
          onClick={() => {
            setShowFileModal(false);
            setFileSearchQuery('');
          }}
        >
          <div 
            className="bg-[#0b101e] [html.light_&]:bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-dark [html.light_&]:border-border-light animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-dark [html.light_&]:border-border-light">
              <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar">
                {['Documents', 'Images', 'Videos', 'Audios', 'Pinned'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFileTab(tab as any)}
                    className={`pb-2 text-base font-medium transition-all relative shrink-0
                                ${activeFileTab === tab 
                                  ? 'text-primary' 
                                  : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'}`}
                  >
                    {tab}
                    {activeFileTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1" />
                    )}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => {
                   setShowFileModal(false);
                   setFileSearchQuery('');
                }}
                className="p-2 hover:bg-surface-elevated-dark [html.light_&]:hover:bg-surface-elevated-light rounded-full transition-colors ml-4"
              >
                <X size={20} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
              </button>
            </div>

            {/* Section Title & Search */}
            <div className="px-8 pt-8 pb-4">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-3xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
                    {activeFileTab}
                  </h2>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light" size={16} />
                    <input 
                      type="text" 
                      placeholder={`Search ${activeFileTab.toLowerCase()}...`}
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      className="w-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-dark [html.light_&]:text-text-light"
                    />
                  </div>
               </div>
            </div>

            {/* Scrollable Gallery Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
              {groupedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40 text-text-dark [html.light_&]:text-text-light">
                  <Folder size={48} className="mb-4" />
                  <p>No {activeFileTab.toLowerCase()} found</p>
                </div>
              ) : (
                groupedFiles.map(([date, items]) => (
                  <div key={date} className="mb-10 last:mb-0 text-text-dark [html.light_&]:text-text-light">
                    <h3 className="text-sm font-semibold text-text-muted-dark [html.light_&]:text-text-muted-light mb-6 uppercase tracking-wider">
                      {date}
                    </h3>
                    
                    {activeFileTab === 'Documents' && (
                      <div className="flex flex-col gap-1 border-t border-border-dark/30 [html.light_&]:border-border-light/30">
                        {items.map((item, idx) => (
                          (() => {
                            const displayFileName = (item.fileName || item.url?.split('/').pop() || 'Untitled file').replace(/^\d+[-_]/, '');
                            const rawFileName = item.fileName || displayFileName;
                            return (
                           <div key={idx} className="flex items-center justify-between py-4 border-b border-border-dark/30 [html.light_&]:border-border-light/30 hover:bg-white/5 [html.light_&]:hover:bg-black/5 px-2 rounded-lg group transition-colors text-text-dark [html.light_&]:text-text-light">
                              <div className="flex items-center gap-4 min-w-0">
                                 {getFileIcon(rawFileName)}
                                 <span className="text-base font-medium truncate flex-1 leading-snug drop-shadow-sm">
                                   {displayFileName}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleViewFile(item.url, rawFileName)} className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors" title="View">
                                   <FaEye size={16} />
                                 </button>
                                 <a href={item.url} download={rawFileName} className="p-2 hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors" title="Download">
                                   <FaDownload size={15} />
                                 </a>
                              </div>
                           </div>
                            );
                          })()
                        ))}
                      </div>
                    )}

                    {activeFileTab === 'Images' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                               setShowFileModal(false);
                               setPreviewImage(item.url);
                            }}
                            className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative bg-surface-elevated-dark shadow-sm border border-border-dark/20"
                          >
                            <img src={item.url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <Search size={24} className="text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFileTab === 'Videos' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                             <div className="aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center relative group">
                                <video src={item.url} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <button className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all group-hover:scale-110 border border-white/30">
                                      <Play fill="white" size={24} className="text-white ml-1" />
                                   </button>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFileTab === 'Audios' && (
                       <div className="flex flex-col gap-4">
                          {items.map((item, idx) => (
                            <div key={idx} className="bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/50 p-4 rounded-3xl flex items-center gap-4 border border-border-dark/30 [html.light_&]:border-border-light/30">
                               <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                  <Mic size={24} />
                               </div>
                               <audio controls src={item.url} className="flex-1 h-10 filter brightness-110" />
                            </div>
                          ))}
                       </div>
                    )}
                    {activeFileTab === 'Pinned' && (
                      <div className="flex flex-col gap-2">
                        {items.map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setShowFileModal(false);
                              const targetIndex = messages.findIndex(m => m._id === item._id);
                              if (targetIndex !== -1) {
                                document.getElementById(`message-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setHighlightedMessageId(item._id);
                                setTimeout(() => setHighlightedMessageId(null), 2000);
                              }
                            }}
                            className="p-4 rounded-2xl glass-dark [html.light_&]:glass-light border border-border-dark/30 [html.light_&]:border-border-light/30 cursor-pointer hover:bg-white/5 transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-primary">{item.sender?.username || 'Unknown'}</span>
                              {(!currentChat.current?.channel || currentChat.current?.admin === user?._id) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnpinMessage(item);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 rounded-md text-danger transition-all"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2 opacity-80">{item.content}</p>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-text-muted-dark">
                                <Paperclip size={12} /> {item.attachments.length} attachments
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[121]"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
          >
            <X size={28} />
          </button>
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
      
      <ForwardDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={forwardingMessage}
        onForward={handleForwardSend}
      />
    </div>
  );
}
