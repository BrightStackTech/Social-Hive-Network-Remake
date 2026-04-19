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
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-center gap-3">
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

            {/* Add Community */}
            <button
              onClick={() => { setShowCreateCommunity(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Create Community"
              title="Create Community"
            >
              <Globe2 size={20} className="text-white" />
            </button>

            {/* Create ComPost */}
            <button
              onClick={() => { setShowCreatePost(true); setOpen(false); }}
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-500/30
                         cursor-pointer transition-all duration-200"
              aria-label="Create Community Post"
              title="Create Community Post"
            >
              <FilePlus size={20} className="text-white" />
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
