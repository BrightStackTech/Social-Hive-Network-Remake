import { useEffect, useState } from 'react';
import { Settings, Shield, Crown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

interface Member {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
  college?: string;
  engineeringDomain?: string;
}

interface GroupData {
  _id: string;
  name: string;
  description: string;
  admin: Member;
  members: Member[];
}

interface GroupSettingsProps {
  group: GroupData;
  refreshFunc: () => void;
}

export default function GroupSettings({ group, refreshFunc }: GroupSettingsProps) {
  const { api } = useAuth();

  // Update details state
  const [groupName, setGroupName] = useState(group.name);
  const [groupDescription, setGroupDescription] = useState(group.description || '');
  const [updateDisabled, setUpdateDisabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Change admin state
  const [confirmChangeAdmin, setConfirmChangeAdmin] = useState<string | null>(null);
  const [changingAdmin, setChangingAdmin] = useState(false);

  // Enable/disable save button based on changes
  useEffect(() => {
    const nameChanged = groupName !== group.name;
    const descChanged = groupDescription !== (group.description || '');
    setUpdateDisabled(!(nameChanged || descChanged) || groupName.trim().length === 0);
  }, [groupName, groupDescription, group.name, group.description]);

  const handleUpdateDetails = async () => {
    if (updateDisabled) return;
    setSaving(true);
    try {
      await api.patch(`${GROUP_API}/update-group-details/${group._id}`, {
        name: groupName.trim(),
        description: groupDescription.trim(),
      });
      toast.success('Group details updated');
      refreshFunc();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAdmin = async (userId: string) => {
    setChangingAdmin(true);
    try {
      await api.patch(`${GROUP_API}/change-group-admin/${group._id}/${userId}`);
      toast.success('Admin changed successfully');
      setConfirmChangeAdmin(null);
      refreshFunc();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change admin');
    } finally {
      setChangingAdmin(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Update Group Details ─────────────────── */}
      <div className="rounded-2xl p-6 glass-dark [html.light_&]:glass-light
                      border border-border-dark [html.light_&]:border-border-light">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={18} className="text-primary" />
          <h2 className="text-base font-display font-bold text-text-dark [html.light_&]:text-text-light">
            Update Group Details
          </h2>
        </div>
        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light mb-4">
          Update name and description of the group
        </p>

        <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
          Group Name
        </label>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm mb-4
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all duration-200"
        />

        <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
          Description
        </label>
        <textarea
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl text-sm mb-5 resize-none
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all duration-200"
        />

        <button
          onClick={handleUpdateDetails}
          disabled={updateDisabled || saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                     bg-primary text-white hover:bg-primary-light
                     shadow-lg shadow-primary/25 transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save Changes
        </button>
      </div>

      {/* ── Change Admin ────────────────────────── */}
      <div className="rounded-2xl p-6 glass-dark [html.light_&]:glass-light
                      border border-border-dark [html.light_&]:border-border-light">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={18} className="text-warning" />
          <h2 className="text-base font-display font-bold text-text-dark [html.light_&]:text-text-light">
            Change Admin
          </h2>
        </div>
        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light mb-4">
          Transfer admin rights to another member
        </p>

        <div className="space-y-2">
          {group.members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl
                         bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/50
                         border border-border-dark/50 [html.light_&]:border-border-light/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.username}&background=4361ee&color=fff&size=40`}
                  alt={member.username}
                  className="w-9 h-9 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                    {member.username}
                  </p>
                  {member.college && (
                    <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                      {member.college}
                    </p>
                  )}
                </div>
              </div>

              {member._id === group.admin._id ? (
                <span className="text-xs font-semibold text-success flex items-center gap-1 shrink-0">
                  <Shield size={13} /> Current Admin
                </span>
              ) : (
                <button
                  onClick={() => setConfirmChangeAdmin(member._id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0
                             bg-warning/10 text-warning border border-warning/30
                             hover:bg-warning hover:text-white transition-all duration-300"
                >
                  Make Admin
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm Change Admin Dialog ──────────── */}
      {confirmChangeAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-2xl
                          bg-surface-card-dark [html.light_&]:bg-surface-card-light
                          border border-border-dark [html.light_&]:border-border-light shadow-2xl">
            <h3 className="text-lg font-semibold text-warning">Change Admin?</h3>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Are you sure you want to transfer admin rights? You will lose admin privileges for this group.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmChangeAdmin(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                           text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleChangeAdmin(confirmChangeAdmin)}
                disabled={changingAdmin}
                className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer
                           bg-warning text-white hover:bg-warning/80 transition-all
                           disabled:opacity-50 flex items-center gap-2"
              >
                {changingAdmin && <Loader2 size={14} className="animate-spin" />}
                Change Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
