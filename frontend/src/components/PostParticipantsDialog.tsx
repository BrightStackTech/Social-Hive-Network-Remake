import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { getPostParticipants } from '../api/index';

export interface ParticipantUser {
  _id: string;
  username: string;
  profilePicture: string;
  college: string;
}

interface PostParticipantsDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'likes' | 'reposts';
  postId: string;
}

export default function PostParticipantsDialog({
  open,
  onClose,
  type,
  postId,
}: PostParticipantsDialogProps) {
  const [users, setUsers] = useState<ParticipantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchList = async () => {
      setLoading(true);
      try {
        const res = await getPostParticipants({ postId, type });
        setUsers(res.data.users);
      } catch {
        toast.error(`Failed to load ${type}`);
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [open, type, postId]);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.college?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm
                    transition-opacity duration-300
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`fixed z-[999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-[90vw] max-w-md max-h-[70vh] flex flex-col
                    rounded-2xl overflow-hidden
                    bg-surface-dark [html.light_&]:bg-surface-card-light
                    border border-border-dark [html.light_&]:border-border-light
                    shadow-2xl
                    transition-all duration-300
                    ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark [html.light_&]:border-border-light">
          <h2 className="text-lg font-display font-bold text-text-dark [html.light_&]:text-text-light capitalize">
            {type === 'likes' ? 'Liked By' : 'Reposted By'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full
                       border border-border-dark [html.light_&]:border-border-light
                       text-text-muted-dark hover:text-text-dark
                       [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light
                       hover:bg-white/5 [html.light_&]:hover:bg-black/5
                       transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3.5 bg-surface-elevated-dark/10 [html.light_&]:bg-black/[0.02] border-b border-border-dark [html.light_&]:border-border-light">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={`Search participants...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-text-muted-dark/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-text-muted-dark [html.light_&]:text-text-muted-light italic">
              No results found for "{searchQuery}"
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredUsers.map((u) => (
                <div key={u._id} className="flex items-center gap-3 px-3 py-3 rounded-xl
                                            hover:bg-white/5 [html.light_&]:hover:bg-black/5
                                            transition-all duration-200">
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 min-w-0 no-underline"
                  >
                    <img
                      src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.username}&background=4361ee&color=fff&size=44`}
                      alt={u.username}
                      className="w-11 h-11 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                        {u.username}
                      </p>
                      {u.college && (
                        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate mt-0.5">
                          {u.college}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
