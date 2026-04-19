import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Search, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateChannelModal from '../components/CreateChannelModal';
import JoinChannelByIdDialog from '../components/JoinChannelByIdDialog';
import { useAuth } from '../context/AuthContext';

interface ChannelItem {
  _id: string;
  name: string;
  description: string;
  members?: string[];
  membersCount?: number;
  profilePicture?: string;
  isJoined?: boolean;
}

export default function ChannelsPage() {
  const { api } = useAuth();
  const [yourChannels, setYourChannels] = useState<ChannelItem[]>([]);
  const [browseChannels, setBrowseChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [yourChannelsOpen, setYourChannelsOpen] = useState(true);
  const [browseChannelsOpen, setBrowseChannelsOpen] = useState(true);
  const [browseLimit, setBrowseLimit] = useState(4);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinById, setShowJoinById] = useState(false);

  useEffect(() => {
    document.title = 'SocialHive — Channels';
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        api.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/my-channels`),
        api.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/all`)
      ]);

      const myChannelsList = myRes.data.channels || [];
      const allChannelsList = allRes.data.channels || [];

      // Filter out joined channels from the browse list
      const joinedIds = new Set(myChannelsList.map((c: any) => c._id));
      const filteredBrowse = allChannelsList.filter((c: any) => !joinedIds.has(c._id));

      setYourChannels(myChannelsList);
      setBrowseChannels(filteredBrowse);
    } catch (error) {
      // toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const filteredYour = yourChannels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBrowse = browseChannels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSeeMore = () => {
    setBrowseLimit(browseChannels.length);
    setYourChannelsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">
            Loading channels...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light flex items-center gap-2">
          Channels
        </h1>
        <div className="flex flex-col w-full sm:w-auto sm:items-end gap-3">
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                             bg-primary text-white hover:bg-primary-light
                             shadow-lg shadow-primary/25 transition-all duration-300 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={18} />
            Create Channel
          </button>
          
          <button
            onClick={() => setShowJoinById(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                       bg-surface-elevated-dark/50 [html.light_&]:bg-black/10 
                       text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-all duration-300 cursor-pointer
                       w-full sm:w-auto md:hidden"
          >
            <Search size={14} />
            Join using ID
          </button>
        </div>
      </div>

      {/* Main Search */}
      <div className="mb-6 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark/40"
        />
      </div>

      {/* Your Channels Section */}
      <div className="space-y-4">
        <button 
          onClick={() => setYourChannelsOpen(!yourChannelsOpen)}
          className="flex items-center gap-2 text-text-muted-dark hover:text-text-dark [html.light_&]:hover:text-text-light transition-colors "
        >
          {yourChannelsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Your Joined Channels ({filteredYour.length})
          </h2>
        </button>

        {yourChannelsOpen && (
          <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredYour.length === 0 ? (
              <p className="text-sm text-text-muted-dark py-4 text-center">No joined channels found</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                {filteredYour.map((channel) => (
                  <ChannelCard key={channel._id} channel={channel} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border-dark/50 [html.light_&]:bg-border-light/50 my-6" />

      {/* Browse Channels Section */}
      <div className="space-y-4">
        <button 
          onClick={() => setBrowseChannelsOpen(!browseChannelsOpen)}
          className="flex items-center gap-2 text-text-muted-dark hover:text-text-dark [html.light_&]:hover:text-text-light transition-colors"
        >
          {browseChannelsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Discover Channels
          </h2>
        </button>

        {browseChannelsOpen && (
          <div className={`${browseLimit > 4 ? 'max-h-[450px] overflow-y-auto' : ''} pr-2 custom-scrollbar space-y-4`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredBrowse.slice(0, browseLimit).map((channel) => (
                <ChannelCard key={channel._id} channel={channel} />
              ))}
            </div>

            {browseLimit < filteredBrowse.length && (
              <div className="flex justify-center pt-2">
                <button 
                  onClick={handleSeeMore}
                  className="px-4 py-1.5 rounded-lg bg-surface-elevated-dark/50 [html.light_&]:bg-black/5 
                             text-[10px] font-bold uppercase tracking-wider text-text-muted-dark hover:text-text-dark [html.light_&]:hover:text-text-light
                             hover:bg-primary/10 transition-all duration-300"
                >
                  See More
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchChannels();
          }}
        />
      )}

      <JoinChannelByIdDialog 
        open={showJoinById}
        onOpenChange={setShowJoinById}
      />
    </div>
  );
}

const DEFAULT_CHANNEL_IMAGE = "https://res.cloudinary.com/domckasfk/image/upload/v1776156528/default-channel-image_zod7df.png";

function ChannelCard({ channel }: { channel: ChannelItem }) {
  return (
    <Link
      to={`/channels/${channel._id}`}
      className="group relative overflow-hidden rounded-3xl p-5
                 glass-dark [html.light_&]:glass-light
                 border border-border-dark [html.light_&]:border-border-light
                 hover:border-primary/40 hover:glow-sm
                 transition-all duration-300 transform hover:-translate-y-1 block"
    >
      <div className="flex items-start gap-4">
        <img
          src={channel.profilePicture || DEFAULT_CHANNEL_IMAGE}
          alt={channel.name}
          className="w-12 h-12 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light shadow-sm shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-dark [html.light_&]:text-text-light truncate">
            {channel.name}
          </h3>
          <p className="mt-1 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-2">
            {channel.description}
          </p>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
              <Users size={13} />
              <span>{(channel.members?.length || channel.membersCount || 0).toLocaleString()} members</span>
            </div>
          </div>
        </div>
        
        <ArrowRight
          size={18}
          className="mt-1 text-text-muted-dark [html.light_&]:text-text-muted-light
                     opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </Link>
  );
}
