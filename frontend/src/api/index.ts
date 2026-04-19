import axios from 'axios';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

const api = axios.create({ baseURL: API_URL });

// Add token to headers if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Endpoints
export const login = (data: any) => api.post('/users/login', data);
export const register = (data: any) => api.post('/users/register', data);
export const logout = () => api.post('/users/logout');

// User Endpoints
export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data: any) => api.put('/users/profile', data);
export const getUser = (username: string) => api.get(`/users/user/${username}`);
export const followUser = (userId: string) => api.post(`/users/follow/${userId}`);
export const unfollowUser = (userId: string) => api.post(`/users/unfollow/${userId}`);
export const getFollowers = ({ username }: { username: string }) => api.get(`/users/user/${username}/follow-list?type=followers`);
export const getFollowing = ({ username }: { username: string }) => api.get(`/users/user/${username}/follow-list?type=following`);
export const getAccountsToFollow = () => api.get('/users/recommendations');
export const getUserFeed = ({ limit, skip }: { limit: number; skip: number }) => api.get(`/users/feed?limit=${limit}&skip=${skip}`);

// Post Endpoints
export const createPost = (data: any) => api.post('/posts', data);
export const getPosts = () => api.get('/posts');
export const getPost = (postId: string) => api.get(`/posts/${postId}`);
export const updatePost = (postId: string, data: any) => {
  if (data instanceof FormData) {
    return api.put(`/posts/${postId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return api.put(`/posts/${postId}`, data);
};
export const deletePost = (postId: string) => api.delete(`/posts/${postId}`);
export const likePost = ({ postId }: { postId: string }) => api.post(`/posts/${postId}/like`);
export const createRepost = ({ postId }: { postId: string }) => api.post(`/posts/repost`, { postId });
export const sharePost = (postId: string) => api.post(`/posts/${postId}/share`);
export const savePost = (postId: string) => api.post(`/posts/${postId}/save`);
export const unlikePost = (postId: string) => api.post(`/posts/${postId}/unlike`);
export const getPostParticipants = ({ postId, type }: { postId: string; type: 'likes' | 'reposts' }) => 
  api.get(`/posts/${postId}/participants?type=${type}`);

// New Profile-related Post Fetchers
export const getUserPostsByUsername = (username: string) => api.get(`/posts/user/${username}`);
export const getUserRepostsByUsername = (username: string) => api.get(`/posts/user/${username}/reposts`);
export const getUserLikedPostsByUsername = (username: string) => api.get(`/posts/user/${username}/liked`);
export const getUserSavedPosts = () => api.get('/posts/user/saved');
export const getUserCommunityPosts = (userId: string) => api.get(`/composts/user/${userId}/community-posts`);

// Comment Endpoints
export const getCommentsByPost = (postId: string) => api.get(`/comments/${postId}`);
export const addComment = (postId: string, comment: string, parentId?: string) => api.post(`/comments/${postId}`, { comment, parentId });
export const deleteComment = (commentId: string) => api.delete(`/comments/${commentId}`);
export const likeComment = (commentId: string) => api.post(`/comments/${commentId}/like`);

// Group Endpoints
export const createGroup = (data: any) => api.post('/groups', data);
export const getGroups = () => api.get('/groups');
export const getGroup = (groupId: string) => api.get(`/groups/${groupId}`);
export const updateGroup = (groupId: string, data: any) => api.put(`/groups/${groupId}`, data);
export const deleteGroup = (groupId: string) => api.delete(`/groups/${groupId}`);
export const joinGroup = (groupId: string) => api.post(`/groups/${groupId}/join`);
export const leaveGroup = (groupId: string) => api.post(`/groups/${groupId}/leave`);
export const getUserGroups = () => api.get(`/groups/get-my-groups`);

// Category Endpoints
export const createCategory = (data: any) => {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description);
  if (data.image) formData.append('image', data.image);
  return api.post('/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getCategories = (createdBy?: string) => 
  api.get(`/categories${createdBy ? `?createdBy=${createdBy}` : ''}`);
export const getCategory = (id: string) => api.get(`/categories/${id}`);
export const updateCategory = (id: string, data: any) => {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.image) formData.append('image', data.image);
  return api.put(`/categories/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);

// Search Endpoints
export const searchUsers = (q: string) => api.get(`/users/search?q=${q}`);
export const searchPosts = (query: string) => api.get(`/posts/search?query=${query}`);
export const searchCommunity = ({ query }: { query: string }) => api.get(`/communities/search?query=${query}`);
export const searchComPosts = ({ query }: { query: string }) => api.get(`/composts/search?query=${query}`);

// Chat Endpoints
export const getAllChats = () => api.get('/chats');
export const createOrGetOneToOneChat = ({ receiverId }: { receiverId: string }) =>
  api.post('/chats/c/oneToOne', { receiverId });
export const createGroupChat = ({ groupId }: { groupId: string }) =>
  api.post('/chats/c/group', { groupId });
export const createChannelChat = ({ channelId }: { channelId: string }) =>
  api.post('/chats/c/channel', { channelId });
export const deleteChat = ({ chatId }: { chatId: string }) => api.delete(`/chats/delete-chat/${chatId}`);

// Message Endpoints
export const sendMessage = (data: any) => {
  const formData = new FormData();
  if (data.content) formData.append('content', data.content);
  if (data.attachments) {
    data.attachments.forEach((file: any) => {
      formData.append('attachments', file);
    });
  }
  if (data.uploadedAttachments && data.uploadedAttachments.length > 0) {
    formData.append('uploadedAttachments', JSON.stringify(data.uploadedAttachments));
  }
  if (data.replyTo) formData.append('replyTo', data.replyTo);
  if (data.parentMessage) formData.append('parentMessage', data.parentMessage);
  return api.post(`/messages/send-message/${data.chatId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getThreadMessages = ({ messageId }: { messageId: string }) =>
  api.get(`/messages/get-thread-messages/${messageId}`);

export const pinMessage = (chatId: string, messageId: string) => {
  return api.patch(`/chats/pin/${chatId}/${messageId}`);
};

export const unpinMessage = (chatId: string, messageId: string) => {
  return api.patch(`/chats/unpin/${chatId}/${messageId}`);
};

// ── Notice Board ──────────────────────────────────────────
export const addNotice = (groupId: string, content: string) => {
  return api.post(`/groups/add-notice/${groupId}`, { content });
};

export const deleteNotice = (groupId: string, noticeId: string) => {
  return api.delete(`/groups/delete-notice/${groupId}/${noticeId}`);
};

export const clearAllNotices = (groupId: string) => {
  return api.delete(`/groups/clear-notices/${groupId}`);
};
export const getAllMessages = ({ chatId }: { chatId: string }) =>
  api.get(`/messages/get-messages/${chatId}`);
export const deleteMessage = ({ messageId }: { messageId: string }) =>
  api.delete(`/messages/delete-message/${messageId}`);

// Live Session Endpoints
export const createLiveSession = (data: any) => api.post('/livesessions', data);
export const addParticipantToLiveSession = (meetingId: string) => api.post('/livesessions/join', { meetingId });
export const getLiveSessionsHistory = () => api.get('/livesessions/history');
export const updateSessionTitle = (meetingId: string, data: any) => api.patch(`/livesessions/title/${meetingId}`, data);
export const terminateLiveSession = (meetingId: string) => api.patch(`/livesessions/terminate/${meetingId}`);
export const updateRecordingURL = (meetingId: string, recordingUrl?: string) => api.patch(`/livesessions/recordings/${meetingId}`, { recordingUrl });
export const kickParticipant = (meetingId: string, userIdToKick: string) => api.post(`/livesessions/kick/${meetingId}`, { userIdToKick });
export const transferHost = (meetingId: string, newHostId: string) => api.post(`/livesessions/transfer-host/${meetingId}`, { newHostId });
export const hideSessionFromView = (meetingId: string) => api.patch(`/livesessions/hide/${meetingId}`);
export const deleteLiveSession = (meetingId: string) => api.delete(`/livesessions/${meetingId}`);

// Updates (Stories) Endpoints
export const createUpdate = (data: any) => api.post('/updates', data);
export const getUpdates = (userId: string) => api.get(`/updates/${userId}`);
export const deleteUpdate = (updateId: string) => api.delete(`/updates/${updateId}`);
export const incrementUpdateViewCount = (updateId: string) => api.post(`/updates/${updateId}/view`);
export const getUpdateViewers = (updateId: string) => api.get(`/updates/${updateId}/viewers`);
export const checkHasUpdates = (userId: string) => api.get(`/updates/has-updates/${userId}`);

export const createReport = (data: FormData) => api.post('/reports/create', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Admin Reports & User Suggestions
export const getAllReportsForAdmin = (query?: string) => api.get(`/users/admin/all-reports${query ? `?query=${query}` : ''}`);
export const searchUsersForFreezeAdmin = (q: string) => api.get(`/users/admin/search-users?q=${q}`);

export default api;
