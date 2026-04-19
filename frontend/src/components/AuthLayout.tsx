import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ActionButton from '../components/ActionButton';
import { useAuth } from '../context/AuthContext';
import GroupSearchPanel from '../components/GroupSearchPanel';
import RecommendationsSidebar from '../components/RecommendationsSidebar';
import CommunityRightPanel from './communities/CommunityRightPanel';
import CommunitiesActionButton from './CommunitiesActionButton';
import ChannelSearchPanel from './ChannelSearchPanel';

export default function AuthLayout() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isProfileRoute = location.pathname.startsWith('/profile');
  const isSearchRoute = location.pathname.startsWith('/search');
  const isGroupsRoute = location.pathname.startsWith('/groups');
  const isChatRoute = location.pathname.startsWith('/chats');
  const isExploreRoute = location.pathname.startsWith('/explore');
  const isChannelsRoute = location.pathname.startsWith('/channels');
  const isCommunityRoute = location.pathname.startsWith('/communities') || 
                           location.pathname.startsWith('/compost') || 
                           location.pathname.startsWith('/com-search');
  const isLiveSessionsRoute = location.pathname.startsWith('/live-sessions');
  const isSettingsRoute = location.pathname.startsWith('/settings');

  // Logic to show recommendations on Explore, Profile, and Search pages
  const showRecommendations = isExploreRoute || isProfileRoute || isSearchRoute;
  const hideGlobalRightPanel = isChatRoute || isLiveSessionsRoute || isSettingsRoute;

  return (
    <div className="min-h-screen">
      <Sidebar />

      {/* Content area — offset for desktop sidebar, 3-column grid on large screens */}
      <div className="lg:ml-64">
        <div className={`grid ${hideGlobalRightPanel ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[1fr_320px]'}`}>
          {/* Main content */}
          <main className="min-h-screen">
            <Outlet />
          </main>

          {/* Right panel */}
          {!hideGlobalRightPanel && (
            <aside className="hidden xl:block border-l border-border-dark [html.light_&]:border-border-light min-h-screen">
              {isGroupsRoute && <GroupSearchPanel />}
              {isChannelsRoute && <ChannelSearchPanel />}
              {showRecommendations && <RecommendationsSidebar />}
              {isCommunityRoute && <CommunityRightPanel />}
            </aside>
          )}
        </div>
      </div>

      {isChatRoute ? null : isCommunityRoute ? <CommunitiesActionButton /> : <ActionButton />}
    </div>
  );
}
