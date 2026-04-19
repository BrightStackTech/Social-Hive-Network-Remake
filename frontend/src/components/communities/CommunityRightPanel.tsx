import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Globe, Search as SearchIcon, Loader2 } from 'lucide-react';
import { JoinLeaveButton } from './JoinLeaveButton';

interface Community {
  _id: string;
  communityName: string;
  profilePicture: string;
  joinedCount: number;
  description?: string;
  removedMem: string[];
  pendingReq: string[];
}

const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

const CommunityRightPanel = () => {
  const { token } = useAuth();
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [browseCommunities, setBrowseCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [browseSearch, setBrowseSearch] = useState('');
  const [joinedSearch, setJoinedSearch] = useState('');
  const [resizableHeight, setResizableHeight] = useState(50);

  const fetchData = async () => {
    try {
      const [joinedRes, unjoinedRes] = await Promise.all([
        axios.get(`${SERVER_URI}/communities/joined-communities`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${SERVER_URI}/communities/unjoined-communities`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setJoinedCommunities(joinedRes.data.data || []);
      setBrowseCommunities(unjoinedRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();

    // Poll for updates every 30 seconds to keep the "Browse" list fresh
    const interval = setInterval(fetchData, 30000);

    // Re-fetch when the window gets focus (user returns to the tab)
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);

    const handleRefresh = () => fetchData();
    window.addEventListener('communityChange', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('communityChange', handleRefresh);
    };
  }, [token]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startHeight = resizableHeight;

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newHeight = startHeight + (deltaY / window.innerHeight) * 100;
      setResizableHeight(Math.min(Math.max(newHeight, 20), 80));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const filteredJoined = joinedCommunities.filter(c => 
    c.communityName?.toLowerCase().includes(joinedSearch.toLowerCase())
  );

  const filteredBrowse = browseCommunities.filter(c => 
    c.communityName?.toLowerCase().includes(browseSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-surface-dark [html.light_&]:bg-surface-light border-l border-border-dark [html.light_&]:border-border-light overflow-hidden">
      
      {/* Top Section: Browse Communities */}
      <div 
        className="flex flex-col overflow-hidden" 
        style={{ height: `${100 - resizableHeight}%` }}
      >
        <div className="p-4 space-y-4">
          <h2 className="text-sm font-black  text-text-dark [html.light_&]:text-text-light uppercase opacity-80">Browse Communities</h2>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark" size={14} />
            <input 
              type="text"
              placeholder="Search top communities..."
              className="w-full bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light"
              value={browseSearch}
              onChange={(e) => setBrowseSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : filteredBrowse.length > 0 ? (
            filteredBrowse.map(c => (
              <CommunityCard key={c._id} community={c} isJoined={false} />
            ))
          ) : (
            <p className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light font-bold text-center py-8">NO NEW COMMUNITIES FOUND</p>
          )}
        </div>
      </div>

      {/* Resizer Bar */}
      <div 
        className="h-1.5 bg-border-dark [html.light_&]:bg-border-light cursor-row-resize hover:bg-primary transition-colors flex items-center justify-center group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-1 rounded-full bg-text-muted-dark/30 group-hover:bg-white/50 transition-colors" />
      </div>

      {/* Bottom Section: Joined Communities */}
      <div 
        className="flex flex-col overflow-hidden" 
        style={{ height: `${resizableHeight}%` }}
      >
        <div className="p-4 space-y-4">
          <h2 className="text-sm font-black  text-text-dark [html.light_&]:text-text-light uppercase opacity-80">Joined Communities</h2>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark" size={14} />
            <input 
              type="text"
              placeholder="Search joined communities..."
              className="w-full bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light"
              value={joinedSearch}
              onChange={(e) => setJoinedSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide space-y-1">
          {filteredJoined.length > 0 ? (
            filteredJoined.map(c => (
              <CommunityCard key={c._id} community={c} isJoined={true} />
            ))
          ) : !loading && (
            <p className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light font-bold text-center py-8">NO JOINED COMMUNITIES FOUND</p>
          )}
        </div>
      </div>
    </div>
  );
};

const CommunityCard = ({ community, isJoined }: { community: Community, isJoined: boolean }) => {
  const { user } = useAuth();
  return (
    <Link 
      to={`/communities/c/${community.communityName}`}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 [html.light_&]:hover:bg-black/5 transition-all group no-underline"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-elevated-dark [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-border-light flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300">
        {community.profilePicture ? (
          <img src={community.profilePicture} alt={community.communityName} className="w-full h-full object-cover" />
        ) : (
          <Globe className="text-text-muted-dark [html.light_&]:text-text-muted-light group-hover:text-primary transition-colors" size={20} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-text-dark [html.light_&]:text-text-light truncate">c/{community.communityName}</p>
        <p className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light font-bold truncate opacity-60">
          {community.description || `${community.joinedCount} members joined`}
        </p>
      </div>
      <JoinLeaveButton 
        communityName={community.communityName}
        isJoined={isJoined}
        isRemoved={user?._id ? community.removedMem?.includes(user._id) : false}
        isPending={user?._id ? community.pendingReq?.includes(user._id) : false}
        onJoinLeave={() => {}}
      />
    </Link>
  );
};

export default CommunityRightPanel;
