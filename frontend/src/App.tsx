import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CategoryProvider } from './context/CategoryContext';
import MainLoadingScreen from './components/MainLoadingScreen';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import About from './pages/About';
import SetLogin from './pages/SetLogin';
import SendVerificationEmail from './pages/SendVerificationEmail';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import AuthLayout from './components/AuthLayout';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import OtherUserProfile from './pages/OtherUserProfile';
import Settings from './pages/Settings';
import SearchPage from './pages/SearchPage';
import ScrollToTop from './components/ScrollToTop';
import Chats from './pages/Chats';
import ExplorePosts from './pages/ExplorePosts';
import CommunitiesPage from './pages/CommunitiesPage';
import LiveSessionsPage from './pages/LiveSessionsPage';
import LiveSessionsHistory from './pages/LiveSessionsHistory';

import GoogleCallback from './pages/GoogleCallback';
import GroupsPage from './pages/GroupsPage';
import GroupIdPage from './pages/GroupIdPage';
import GroupView from './pages/GroupView';
import ChannelsPage from './pages/ChannelsPage';
import PostPage from './pages/PostPage';
import CategoryPage from './pages/CategoryPage';
import ChannelIdPage from './pages/ChannelIdPage';
import CommunityViewPage from './pages/CommunityViewPage';
import ComPostPage from './pages/ComPostPage';
import ComSearchPage from './pages/ComSearchPage';
import LiveSessionRoomPage from './pages/LiveSessionRoomPage';
import CreateSessionPage from './pages/CreateSessionPage';
import JoinSessionPage from './pages/JoinSessionPage';
import AdminLayout from './pages/Admin/AdminLayout';
import GrowthPage from './pages/Admin/GrowthPage';
import UserFreezePage from './pages/Admin/UserFreezePage';
import ReportsPage from './pages/Admin/ReportsPage';
import AdminPasswordPage from './pages/Admin/AdminPasswordPage';
import AdminRoute from './components/AdminRoute';
import CheckUserUpdatePage from './pages/CheckUserUpdatePage';



function App() {
  return (
    <ThemeProvider>
      <MainLoadingScreen>
      <AuthProvider>
        <CategoryProvider>
          <SocketProvider>
            <Toaster

            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a2236',
                color: '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid #1e293b',
              },
            }}
          />
          <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/set-login" element={<SetLogin />} />
            <Route path="/send-email-verification" element={<SendVerificationEmail />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/live-session-room/:meetingId" element={<LiveSessionRoomPage />} />

            {/* Authenticated routes — wrapped in sidebar layout */}
            <Route element={<AuthLayout />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/editProfile" element={<EditProfile />} />
              <Route path="/profile/:username" element={<OtherUserProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/chats/:username" element={<Chats />} />
              <Route path="/chats/group/:groupId" element={<Chats />} />
              <Route path="/chats/channel/:channelId" element={<Chats />} />
              <Route path="/chats/channel/:channelId/:messageId" element={<Chats />} />

              <Route path="/explore" element={<ExplorePosts />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/live-sessions" element={<LiveSessionsPage />} />
              <Route path="/live-sessions/create" element={<CreateSessionPage />} />
              <Route path="/live-sessions/join" element={<JoinSessionPage />} />
              <Route path="/live-sessions/history" element={<LiveSessionsHistory />} />
              <Route path="/updates/:userId" element={<CheckUserUpdatePage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:groupId" element={<GroupIdPage />} />
              <Route path="/groups/view/:groupId" element={<GroupView />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/channels/:channelId" element={<ChannelIdPage />} />
              <Route path="/post/:postId" element={<PostPage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/communities/c/:communityName" element={<CommunityViewPage />} />
              <Route path="/compost/:id" element={<ComPostPage />} />
              <Route path="/com-search" element={<ComSearchPage />} />

            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/secured/admin" element={<AdminLayout />}>
                <Route path="growthpage" element={<GrowthPage />} />
                <Route path="freeze-user" element={<UserFreezePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<AdminPasswordPage />} />
              </Route>
            </Route>
          </Routes>
          </BrowserRouter>
        </SocketProvider>
      </CategoryProvider>
    </AuthProvider>
      </MainLoadingScreen>
    </ThemeProvider>

  );
}

export default App;
