import { useState } from 'react';
import { Sun, Moon, X, Plus, PenSquare, LayoutGrid, UserPlus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import CreatePostModal from './posts/CreatePostModal';
import CreateGroupModal from './CreateGroupModal';
import CreateCategoryModal from './CreateCategoryModal';
import CreateChannelModal from './CreateChannelModal';
import CreateUpdatesModal from './CreateUpdatesModal';
import { Radio, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';

export default function ActionButton() {
  const [open, setOpen] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateUpdate, setShowCreateUpdate] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-center gap-3">
          {/* Main FAB */}
          <button
            onClick={() => setOpen(!open)}
            className={`w-14 h-14 rounded-full flex items-center justify-center
                        shadow-xl cursor-pointer transition-all duration-300
                        ${open
                          ? 'bg-indigo-600 rotate-0'
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
                        }`}
            aria-label="Action menu"
          >
            {open ? <X size={24} className="text-white" /> : <Plus size={24} className="text-white" />}
          </button>

          {/* Action items — appear when open */}
          <div className={`flex flex-col-reverse items-center gap-3 transition-all duration-300 ${
            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            {/* Theme toggle */}
            <button
              onClick={() => { toggleTheme(); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-surface-dark [html.light_&]:bg-gray-100 shadow-lg
                         border border-border-dark [html.light_&]:border-gray-200
                         cursor-pointer transition-all duration-200"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-gray-700" />}
            </button>

            {/* Add Group */}
            <button
              onClick={() => { setShowCreateGroup(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Add group"
              title="Add group"
            >
              <UserPlus size={20} className="text-white" />
            </button>

            {/* Add Channel */}
            <button
              onClick={() => { setShowCreateChannel(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Add channel"
              title="Add channel"
            >
              <Radio size={20} className="text-white" />
            </button>

            {/* Add Category */}
            <button
              onClick={() => { setShowCreateCategory(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-rose-500 hover:bg-rose-400 shadow-lg shadow-rose-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Add category"
              title="Add category"
            >
              <LayoutGrid size={20} className="text-white" />
            </button>

            {/* Create Post */}
            <button
              onClick={() => { setShowCreatePost(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Create post"
              title="Create post"
            >
              <PenSquare size={20} className="text-white" />
            </button>

            {/* Add Update (Story) */}
            <button
              onClick={() => { setShowCreateUpdate(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Add update"
              title="Add update"
            >
              <History size={20} className="text-white" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreated={() => setShowCreatePost(false)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => setShowCreateGroup(false)}
        />
      )}

      {showCreateCategory && (
        <CreateCategoryModal
          onClose={() => setShowCreateCategory(false)}
        />
      )}

      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreated={() => setShowCreateChannel(false)}
        />
      )}

      {showCreateUpdate && (
        <Dialog open={showCreateUpdate} onOpenChange={setShowCreateUpdate}>
            <DialogContent className="sm:max-w-lg bg-surface-dark border-border-dark p-6">
                <DialogHeader>
                    <DialogTitle className="text-white font-bold text-xl tracking-tight">Post New Story Update</DialogTitle>
                </DialogHeader>
                <CreateUpdatesModal 
                    onClose={() => setShowCreateUpdate(false)} 
                    onCreated={() => setShowCreateUpdate(false)}
                />
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
