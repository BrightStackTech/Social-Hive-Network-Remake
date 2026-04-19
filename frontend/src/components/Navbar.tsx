import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sun, Moon, Home, Users, FileEdit, Info, Tv, Globe, MonitorPlay } from 'lucide-react';

import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const navLinks: { name: string; path: string; icon: ReactNode }[] = [
  { name: 'Home', path: '/', icon: <Home size={18} /> },
  { name: 'Posts', path: '/login', icon: <FileEdit size={18} /> },
  { name: 'Groups', path: '/login', icon: <Users size={18} /> },
  { name: 'Channels', path: '/login', icon: <Tv size={18} /> },
  { name: 'Communities', path: '/login', icon: <Globe size={18} /> },
  { name: 'Live Sessions', path: '/login', icon: <MonitorPlay size={18} /> },
  { name: 'About', path: '/about', icon: <Info size={18} /> },

];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  // const location = useLocation();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full transition-colors duration-300
                      bg-surface-dark/80 backdrop-blur-xl border-b border-border-dark
                      [html.light_&]:bg-surface-card-light/80 [html.light_&]:border-border-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link to={user ? "/explore" : "/"} className="flex items-center gap-2 group no-underline">
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

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                              no-underline text-text-muted-dark hover:text-text-dark hover:bg-white/5 [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light [html.light_&]:hover:bg-black/5
                              `}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Right side: CTA + theme toggle */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2 rounded-full text-sm font-semibold
                           border border-primary text-primary
                           hover:bg-primary hover:text-white
                           transition-all duration-300 no-underline"
              >
                Login / Register
              </Link>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-300 cursor-pointer
                           text-text-muted-dark hover:text-text-dark hover:bg-white/10
                           [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light [html.light_&]:hover:bg-black/10"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            {/* Mobile: theme toggle + hamburger */}
            <div className="flex md:hidden items-center gap-2">
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
      </nav>

      {/* Sidebar rendered via portal to avoid sticky/stacking-context issues */}
      {createPortal(
        <>
          {/* Overlay backdrop */}
          <div
            className={`fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm
                        transition-opacity duration-300
                        ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar drawer */}
          <div
            className={`fixed top-0 right-0 z-[999] h-full w-72
                        bg-surface-dark [html.light_&]:bg-surface-card-light
                        border-l border-border-dark [html.light_&]:border-border-light
                        shadow-2xl transition-transform duration-300 ease-in-out
                        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Sidebar header — close button */}
            <div className="flex items-center justify-end px-4 py-4">
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

            {/* Sidebar links with icons */}
            <div className="px-5 py-2 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium
                              transition-colors no-underline text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5
                    `}
                >
                  <span className="text-text-muted-dark [html.light_&]:text-text-muted-light">
                    {link.icon}
                  </span>
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Sidebar bottom CTA */}
            <div className="absolute left-0 right-0 p-5
                            border-t border-border-dark [html.light_&]:border-border-light">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-center
                           bg-primary text-white hover:bg-primary-light transition-colors no-underline
                           shadow-lg shadow-primary/25"
              >
                Login / Register
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
