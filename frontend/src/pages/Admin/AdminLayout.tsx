import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { TrendingUp, UserX, Settings, ShieldCheck, ChevronRight, Menu, X, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    {
      path: '/secured/admin/growthpage',
      name: 'Platform Growth',
      icon: <TrendingUp size={20} />,
      color: 'text-blue-500'
    },
    {
      path: '/secured/admin/freeze-user',
      name: 'Freeze a User',
      icon: <UserX size={20} />,
      color: 'text-rose-500'
    },
    {
      path: '/secured/admin/reports',
      name: 'User Reports',
      icon: <ShieldAlert size={20} />,
      color: 'text-amber-500'
    },
    {
      path: '/secured/admin/settings',
      name: 'Admin Settings',
      icon: <Settings size={20} />,
      color: 'text-slate-400'
    }
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-bg-dark [html.light_&]:bg-bg-light">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-dark [html.light_&]:bg-white border-b border-border-dark [html.light_&]:border-border-light flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="font-bold text-text-dark [html.light_&]:text-text-light">Admin Console</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-text-dark [html.light_&]:text-text-light hover:bg-slate-500/10 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 lg:left-0 lg:right-auto w-64 
        border-l lg:border-r lg:border-l-0 border-border-dark [html.light_&]:border-border-light 
        flex flex-col bg-surface-dark [html.light_&]:bg-white shadow-xl z-50 
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-border-dark [html.light_&]:border-border-light hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Console
            </h1>
          </div>
        </div>

        {/* Mobile Sidebar Top Spacer */}
        <div className="h-16 lg:hidden border-b border-border-dark [html.light_&]:border-border-light flex items-center px-6">
           <span className="font-bold text-xs uppercase tracking-widest text-text-muted-dark">Menu Navigation</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted-dark hover:bg-surface-hover-dark [html.light_&]:text-text-muted-light [html.light_&]:hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-primary' : item.color} group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {isActive && <ChevronRight size={16} className="animate-in slide-in-from-left-2" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border-dark [html.light_&]:border-border-light">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-500/5">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-dark [html.light_&]:text-text-light">Super Admin</span>
              <span className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate w-24">Social Hive</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all duration-300 font-bold text-sm cursor-pointer"
          >
            <LogOut size={18} />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 overflow-y-auto mt-16 lg:mt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
