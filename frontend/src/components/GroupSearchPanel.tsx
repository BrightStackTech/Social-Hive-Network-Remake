import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

interface GroupResult {
  _id: string;
  name: string;
  description: string;
  members: { _id: string; username: string; profilePicture: string }[];
  admin: { _id: string; username: string };
  hasRequested: boolean;
}

export default function GroupSearchPanel() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GroupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [requested, setRequested] = useState(false);

  // Auto-search with debounce when query changes
  useEffect(() => {
    const trimmed = query.trim();

    // Reset if empty
    if (!trimmed) {
      setResult(null);
      setSearched(false);
      setIsMember(false);
      setRequested(false);
      return;
    }

    // Only search if it looks like a valid MongoDB ObjectID (24 hex chars)
    const isValidId = /^[a-f\d]{24}$/i.test(trimmed);
    if (!isValidId) return;

    const timeout = setTimeout(() => {
      fetchGroup(trimmed);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const fetchGroup = async (groupId: string) => {
    setLoading(true);
    setResult(null);
    setSearched(true);
    setIsMember(false);
    setRequested(false);

    try {
      const res = await api.get(`${GROUP_API}/get-group-for-visitors/${groupId}`);
      const group = res.data.group;
      setResult(group);
      setRequested(group.hasRequested || false);
    } catch (error: any) {
      if (error.response?.status === 403) {
        // User is already a member
        setIsMember(true);
      }
      // 404 or other — result stays null
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!result || requested) return;
    setJoining(true);
    try {
      await api.post(`${GROUP_API}/request-to-join-group/${result._id}`);
      toast.success('Join request sent!');
      setRequested(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-display font-bold text-text-dark [html.light_&]:text-text-light mb-3">
        Search Groups
      </h3>

      {/* Search input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2
                     text-text-muted-dark [html.light_&]:text-text-muted-light"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search using Group ID"
          className="w-full pl-8 pr-4 py-2.5 rounded-xl text-xs
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all duration-200"
        />
      </div>

      {/* Results */}
      <div className="mt-3">
        {/* Loading */}
        {loading && (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Already a member */}
        {!loading && searched && isMember && (
          <div className="p-3 rounded-xl glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light">
            <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light mb-2">
              You're already a member of this group.
            </p>
            <button
              onClick={() => navigate(`/groups/${query.trim()}`)}
              className="w-full py-2 rounded-lg text-xs font-semibold cursor-pointer
                         bg-primary text-white hover:bg-primary-light transition-all"
            >
              Open Group
            </button>
          </div>
        )}

        {/* Not found */}
        {!loading && searched && !result && !isMember && (
          <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light text-center py-4">
            No group found with that ID
          </p>
        )}

        {/* Found a group */}
        {!loading && result && (
          <div className="p-3 rounded-xl glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                  {result.name}
                </h4>
                {result.description && (
                  <p className="mt-0.5 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-2">
                    {result.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                  <Users size={12} />
                  <span>{result.members.length} members</span>
                </div>
              </div>
              <Users size={20} className="shrink-0 mt-1 text-text-muted-dark [html.light_&]:text-text-muted-light" />
            </div>

            {/* Action button */}
            <div className="mt-3">
              {requested ? (
                <button
                  disabled
                  className="w-full py-2 rounded-lg text-xs font-semibold
                             bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-muted-dark [html.light_&]:text-text-muted-light
                             cursor-not-allowed opacity-70"
                >
                  Request Sent
                </button>
              ) : (
                <button
                  onClick={handleJoinRequest}
                  disabled={joining}
                  className="w-full py-2 rounded-lg text-xs font-semibold cursor-pointer
                             bg-primary text-white hover:bg-primary-light
                             shadow-lg shadow-primary/25 transition-all duration-300
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-1.5"
                >
                  {joining && <Loader2 size={12} className="animate-spin" />}
                  Send Request
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
