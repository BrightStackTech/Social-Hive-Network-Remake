import { useState } from 'react';
import { Sun, Moon, X, Plus, FilePlus, Globe2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import CreateComPostModal from './composts/CreateComPostModal';
import CreateCommunityModal from './communities/CreateCommunityModal';

export default function CommunitiesActionButton() {
  const [open, setOpen] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
          {/* Main FAB */}
          <button
            onClick={() => setOpen(!open)}
            className={`w-14 h-14 rounded-full flex items-center justify-center
                        shadow-xl cursor-pointer transition-all duration-300
                        ${open
                          ? 'bg-amber-500 rotate-0'
                          : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
                        }`}
            aria-label="Community action menu"
          >
            {open ? <X size={24} className="text-white" /> : <Plus size={24} className="text-white" />}
          </button>

          {/* Action items — appear when open */}
          <div className={`flex flex-col-reverse items-end gap-3 transition-all duration-300 ${
            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            {/* Theme toggle */}
            <button
              onClick={() => { toggleTheme(); setOpen(false); }}
              className="h-12 px-5 rounded-full flex items-center gap-3
                         bg-surface-dark [html.light_&]:bg-white shadow-xl
                         border border-border-dark [html.light_&]:border-gray-200
                         hover:scale-105 active:scale-95 transition-all duration-200 group"
              aria-label="Toggle theme"
            >
              <span className="text-sm font-bold text-text-dark [html.light_&]:text-text-light">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/10 [html.light_&]:bg-gray-100">
                {theme === 'dark' ? <Sun size={18} className="text-white" /> : <Moon size={18} className="text-gray-700" />}
              </div>
            </button>

            {/* Add Community */}
            <button
              onClick={() => { setShowCreateCommunity(true); setOpen(false); }}
              className="h-12 px-5 rounded-full flex items-center gap-3
                         bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30
                         hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Create Community"
            >
              <span className="text-sm font-bold text-white">Create Community</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                <Globe2 size={18} className="text-white" />
              </div>
            </button>

            {/* Create ComPost */}
            <button
              onClick={() => { setShowCreatePost(true); setOpen(false); }}
              className="h-12 px-5 rounded-full flex items-center gap-3
                         bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-500/30
                         hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Create Community Post"
            >
              <span className="text-sm font-bold text-white">New Community Post</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                <FilePlus size={18} className="text-white" />
              </div>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modals */}
      {showCreatePost && (
        <CreateComPostModal onClose={() => setShowCreatePost(false)} />
      )}

      {showCreateCommunity && (
        <CreateCommunityModal onClose={() => setShowCreateCommunity(false)} />
      )}
    </>
  );
}
