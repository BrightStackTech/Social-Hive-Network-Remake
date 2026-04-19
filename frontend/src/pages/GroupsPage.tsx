import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import CreateGroupModal from '../components/CreateGroupModal';
import JoinGroupByIdDialog from '../components/JoinGroupByIdDialog';
import { DEFAULT_GROUP_IMAGE } from '../utils';


const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

interface GroupItem {
  _id: string;
  name: string;
  description: string;
  members: string[];
  profilePicture?: string;
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinById, setShowJoinById] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'SocialHive — Groups';
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${GROUP_API}/get-my-groups`);
      setGroups(res.data.groups || []);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">
            Loading groups...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          Your Groups
        </h1>
        <div className="flex flex-col w-full sm:w-auto sm:items-end gap-4">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-primary text-white hover:bg-primary-light transition-all duration-300 cursor-pointer
                       w-full sm:w-auto"
          >
            <Plus size={18} />
            Create Group
          </button>
          
          <button
            onClick={() => setShowJoinById(true)}
            className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                       bg-surface-elevated-dark/50 [html.light_&]:bg-black/10 
                       text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-all duration-300 cursor-pointer
                       w-full sm:w-auto"
          >
            <Search size={14} />
            Join using ID
          </button>
        </div>
      </div>

      <div className="mb-6 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark/40"
        />
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchGroups}
        />
      )}

      <JoinGroupByIdDialog 
        open={showJoinById} 
        onOpenChange={setShowJoinById} 
      />

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-text-muted-dark/20 [html.light_&]:text-text-muted-light/20" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">
            You haven't joined any groups yet.
          </p>
          <p className="mt-1 text-sm text-text-muted-dark/60 [html.light_&]:text-text-muted-light/60">
            Create one or ask a friend to invite you.
          </p>
        </div>
      )}

      {/* Group cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.filter(g => 
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          g.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).map((group) => (
          <button
            key={group._id}
            onClick={() => navigate(`/groups/${group._id}`)}
            className="text-left p-5 rounded-2xl cursor-pointer
                       glass-dark [html.light_&]:glass-light
                       border border-border-dark [html.light_&]:border-border-light
                       hover:border-primary/40 hover:glow-sm
                       transition-all duration-300 group/card"
          >
            <div className="flex items-start gap-4">
              <img
                src={group.profilePicture || DEFAULT_GROUP_IMAGE}
                alt={group.name}
                className="w-12 h-12 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="mt-1 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                  <Users size={13} />
                  <span>{group.members?.length || 0} members</span>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="mt-1 text-text-muted-dark [html.light_&]:text-text-muted-light
                           opacity-0 group-hover/card:opacity-100 transition-opacity"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
