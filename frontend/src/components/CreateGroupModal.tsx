import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const { api } = useAuth();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Group name is required');
      return;
    }
    setCreating(true);
    try {
      await api.post(`${GROUP_API}/create-group`, {
        name: newName.trim(),
        description: newDesc.trim(),
      });
      toast.success('Group created!');
      onCreated?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md p-6 rounded-2xl
                    bg-surface-card-dark [html.light_&]:bg-surface-card-light
                    border border-border-dark [html.light_&]:border-border-light
                    shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
            Create a New Group
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={20} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          </button>
        </div>

        <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mb-6">
          Groups are perfect for collaborating with your college mates and sharing specific interests.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
              Group Name
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Web Dev Team"
              className="w-full px-4 py-3 rounded-xl text-sm
                         bg-surface-elevated-dark [html.light_&]:bg-gray-50
                         border border-border-dark [html.light_&]:border-gray-200
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark/50
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                         transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What is this group about?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none
                         bg-surface-elevated-dark [html.light_&]:bg-gray-50
                         border border-border-dark [html.light_&]:border-gray-200
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark/50
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                         transition-all duration-200"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer
                       text-text-muted-dark [html.light_&]:text-text-muted-light
                       hover:bg-white/5 [html.light_&]:hover:bg-black/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer
                       bg-primary text-white hover:bg-primary-light
                       shadow-lg shadow-primary/25 transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
