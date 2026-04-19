import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_GROUP_IMAGE } from '../utils';


const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

interface Member {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
}

interface GroupData {
  _id: string;
  name: string;
  description: string;
  admin: Member;
  members: Member[];
  profilePicture?: string;
  hasRequested: boolean;
}

export default function GroupView() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      try {
        const res = await api.get(`${GROUP_API}/get-group-for-visitors/${groupId}`);
        const g = res.data.group;
        setGroup(g);
        setHasRequested(g.hasRequested);
        document.title = `SocialHive — ${g.name}`;
      } catch (error: any) {
        if (error.response?.status === 403) {
          // Already a member — redirect to the full group page
          navigate(`/groups/${groupId}`, { replace: true });
        } else {
          toast.error('Failed to load group');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  const handleJoinRequest = async () => {
    setJoining(true);
    try {
      await api.post(`${GROUP_API}/request-to-join-group/${groupId}`);
      toast.success('Join request sent!');
      setHasRequested(true);
      setConfirmJoin(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setJoining(false);
    }
  };

  // ─── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">
            Loading group...
          </p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">Group not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* ── Group Header ────────────────────────────── */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 mx-auto mb-4">
          <img
            src={group.profilePicture || DEFAULT_GROUP_IMAGE}
            alt={group.name}
            className="w-full h-full rounded-2xl object-cover border-4 border-surface-card-dark [html.light_&]:border-surface-card-light shadow-xl"
          />
        </div>
        <h1 className="text-3xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          {group.name}
        </h1>
        {group.description && (
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light max-w-lg mx-auto">
            {group.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-primary" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {group.members.length}
            </span>
            <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Members</span>
          </div>
        </div>

        {/* Join button */}
        <div className="mt-5">
          {hasRequested ? (
            <button
              disabled
              className="px-6 py-2.5 rounded-xl text-sm font-semibold
                         bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-muted-dark [html.light_&]:text-text-muted-light
                         cursor-not-allowed opacity-70"
            >
              Request Sent
            </button>
          ) : (
            <button
              onClick={() => setConfirmJoin(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                         bg-primary text-white hover:bg-primary-light
                         shadow-lg shadow-primary/25 transition-all duration-300"
            >
              Send Join Request
            </button>
          )}
        </div>
      </div>

      {/* ── Members List ────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-lg font-display font-semibold text-text-dark [html.light_&]:text-text-light mb-4">
          Members
        </h2>

        <div className="space-y-2">
          {group.members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-3 p-4 rounded-xl
                         glass-dark [html.light_&]:glass-light
                         border border-border-dark [html.light_&]:border-border-light"
            >
              <Link
                to={`/profile/${member.username}`}
                className="flex items-center gap-3 min-w-0 no-underline group/link"
              >
                <img
                  src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.username}&background=4361ee&color=fff&size=48`}
                  alt={member.username}
                  className="w-10 h-10 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate
                                group-hover/link:text-primary transition-colors">
                    {member.username}
                  </p>
                  {member.email && (
                    <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                      {member.email}
                    </p>
                  )}
                </div>
              </Link>

              <div className="shrink-0">
                {member._id === group.admin._id ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-success">
                    <Shield size={13} /> Admin
                  </span>
                ) : (
                  <span className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                    Member
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm Join Dialog ─────────────────────── */}
      {confirmJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-2xl
                          bg-surface-card-dark [html.light_&]:bg-surface-card-light
                          border border-border-dark [html.light_&]:border-border-light shadow-2xl">
            <h3 className="text-lg font-semibold text-text-dark [html.light_&]:text-text-light">
              Join {group.name}?
            </h3>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              This will send a join request to the group admin for approval.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmJoin(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                           text-text-muted-dark [html.light_&]:text-text-muted-light
                           hover:text-text-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRequest}
                disabled={joining}
                className="px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer
                           bg-primary text-white hover:bg-primary-light
                           shadow-lg shadow-primary/25 transition-all duration-300
                           disabled:opacity-50 flex items-center gap-2"
              >
                {joining && <Loader2 size={14} className="animate-spin" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
