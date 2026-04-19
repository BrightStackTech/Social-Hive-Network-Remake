import { useState } from 'react';
import { Loader2, X, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

const CHANNEL_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/channels`;

export default function CreateChannelModal({ onClose, onCreated }: CreateChannelModalProps) {
  const { api } = useAuth();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Channel name is required');
      return;
    }
    setCreating(true);
    try {
      // Note: Assuming a hypothetical endpoint similar to groups
      await api.post(`${CHANNEL_API}/create-channel`, {
        name: newName.trim(),
        description: newDesc.trim(),
      });
      toast.success('Channel created!');
      onCreated?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create channel');
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
          <div className="flex items-center gap-2">
            <Radio size={24} className="text-orange-500" />
            <h2 className="text-xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
              Create a New Channel
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={20} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          </button>
        </div>

        <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mb-6">
          Channels are great for broadcasting updates and sharing content with a large audience.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
              Channel Name
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Daily Tech News"
              className="w-full px-4 py-3 rounded-xl text-sm
                         bg-surface-elevated-dark [html.light_&]:bg-gray-50
                         border border-border-dark [html.light_&]:border-gray-200
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark/50
                         focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
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
              placeholder="What will you share in this channel?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none
                         bg-surface-elevated-dark [html.light_&]:bg-gray-50
                         border border-border-dark [html.light_&]:border-gray-200
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark/50
                         focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
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
                       bg-orange-500 text-white hover:bg-orange-400
                       shadow-lg shadow-orange-500/25 transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}
