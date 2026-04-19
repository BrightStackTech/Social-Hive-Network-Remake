import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Compass,
  Search,
  MessageCircle,
  Users,
  Globe,
  MonitorPlay,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Tv,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';

import { useSocket } from '../context/SocketContext';

const sidebarLinks = [
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Search', path: '/search', icon: Search },
  { name: 'Chats', path: '/chats', icon: MessageCircle },
  { name: 'Groups', path: '/groups', icon: Users },
  { name: 'Channels', path: '/channels', icon: Tv },
  { name: 'Communities', path: '/communities', icon: Globe },
  { name: 'Live Sessions', path: '/live-sessions', icon: MonitorPlay },

  { name: 'Profile', path: '/profile', icon: UserCircle },
];

const bottomLinks = [
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadTypes } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
    setMobileOpen(false);
    setIsLogoutDialogOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const profilePicUrl = user?.profilePicture ||
    `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=4361ee&color=fff&size=40`;

  // ─── SHARED NAV CONTENT ────────────────────────
  const renderNavLinks = (onNavigate?: () => void) => (
    <>
      <div className="flex-1 px-3 py-4 space-y-1">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          const onChatsPage = location.pathname.startsWith('/chats');

          return (
            <Link
              key={link.name}
              to={link.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium
                          transition-all duration-200 no-underline
                          ${active
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5'
                          }`}
            >
              <div className="relative">
                {link.name === 'Profile' ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <Icon size={22} className={active ? 'text-primary' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'} />
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span>{link.name}</span>
                {/* 3 Dots implementation for Chats */}
                {link.name === 'Chats' && !onChatsPage && (
                  <div className="flex gap-1 items-center ml-1">
                    {unreadTypes.individual && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
                    {unreadTypes.group && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                    {unreadTypes.channel && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-border-dark [html.light_&]:border-border-light pt-3">
        {bottomLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <Link
              key={link.name}
              to={link.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium
                          transition-all duration-200 no-underline
                          ${active
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5'
                          }`}
            >
              <Icon size={22} className={active ? 'text-primary' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'} />
              {link.name}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl text-sm font-semibold
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     hover:border-danger hover:text-danger
                     transition-all duration-300 cursor-pointer"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-64
                         bg-surface-dark [html.light_&]:bg-surface-card-light
                         border-r border-border-dark [html.light_&]:border-border-light
                         z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border-dark [html.light_&]:border-border-light">
          <Link to="/explore" className="flex items-center gap-2 group no-underline">
            <img
              src="https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png"
              alt="SocialHive"
              className="h-9 w-9 rounded-full object-cover shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow duration-300"
            />
            <span className="text-xl font-display font-bold text-text-dark
                             [html.light_&]:text-text-light transition-colors">
              SocialHive
            </span>
          </Link>
        </div>

        {renderNavLinks()}
      </aside>

      {/* ─── MOBILE TOP BAR ─── */}
      <div className="lg:hidden sticky top-0 z-50 w-full
                       bg-surface-dark/80 backdrop-blur-xl border-b border-border-dark
                       [html.light_&]:bg-surface-card-light/80 [html.light_&]:border-border-light">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <Link to="/explore" className="flex items-center gap-2 no-underline">
            <img
              src="https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png"
              alt="SocialHive"
              className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-primary/25"
            />
            <span className="text-lg font-display font-bold text-text-dark
                             [html.light_&]:text-text-light">
              SocialHive
            </span>
          </Link>

          {/* Right: profile pic + theme + hamburger */}
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <img
                src={profilePicUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
              />
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-colors cursor-pointer
                         text-text-muted-dark hover:text-text-dark
                         [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg transition-colors cursor-pointer
                         text-text-muted-dark hover:text-text-dark
                         [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE SIDEBAR OVERLAY ─── */}
      {createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm
                        transition-opacity duration-300
                        ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 z-[999] h-full w-72 flex flex-col
                        bg-surface-dark [html.light_&]:bg-surface-card-light
                        border-l border-border-dark [html.light_&]:border-border-light
                        shadow-2xl transition-transform duration-300 ease-in-out
                        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Close button */}
            <div className="flex items-center justify-end px-4 py-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full transition-colors cursor-pointer
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-muted-dark hover:text-text-dark hover:bg-white/5
                           [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light [html.light_&]:hover:bg-black/5"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {renderNavLinks(() => setMobileOpen(false))}
          </div>
        </>,
        document.body
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-center text-lg md:text-xl">
              Are you sure you want to log out?
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 mt-8">
            <Button 
              variant="ghost" 
              className="flex-1 rounded-xl py-3 text-text-dark [html.light_&]:text-text-light bg-white/5 [html.light_&]:bg-black/5 hover:bg-black/5 hover:text-white [html.light_&]:hover:bg-black/10"
              onClick={() => setIsLogoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 bg-gray-900 hover:bg-black text-white rounded-xl py-3 [html.light_&]:bg-red-500 [html.light_&]:hover:bg-red-600 shadow-md font-bold"  
              onClick={confirmLogout}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
