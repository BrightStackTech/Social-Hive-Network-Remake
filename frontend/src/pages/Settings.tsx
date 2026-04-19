import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  HelpCircle,
  Palette,
  Star,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import ReportDialog from '../components/ReportDialog';

type TabType = 'account' | 'help' | 'appearance';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, api } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab ] = useState<TabType>('account');
  const [isSatisfactionDialogOpen, setIsSatisfactionDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  
  const [isResetting, setIsResetting] = useState(false);
  
  const [deleteStep, setDeleteStep] = useState(0); // 0: none, 1: confirm, 2: verify, 3: feedback
  const [deleteVerifyText, setDeleteVerifyText] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isDeletionStartedDialogOpen, setIsDeletionStartedDialogOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
    setIsLogoutDialogOpen(false);
  };

  const handleDeactivateConfirm = async () => {
    try {
      await api.post('/deactivate');
      logout();
      navigate('/login');
      toast.success('Account deactivated. You can log in anytime to reactivate.');
    } catch (error) {
      toast.error('Failed to deactivate account');
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return toast.error("User email not found");
    setIsResetting(true);
    try {
      await api.post('/request-password-reset', { email: user.email });
      toast.success("An email has been sent to this mail id to reset the password. Please check inbox (spam folder included)");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error sending reset email");
    } finally {
      setIsResetting(false);
    }
  };

  const submitSatisfaction = async () => {
    if (deleteStep === 3) {
      // Final step of deletion
      await finalizeAccountDeletion();
    } else {
      toast.success("Thank you for your feedback!");
      setIsSatisfactionDialogOpen(false);
      setSatisfactionRating(0);
      setFeedbackText('');
    }
  };

  const finalizeAccountDeletion = async () => {
    try {
      await api.post('/delete');
      setIsSatisfactionDialogOpen(false);
      setIsDeletionStartedDialogOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error deleting account");
      setDeleteStep(0);
      setIsSatisfactionDialogOpen(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'help', label: 'Help and Support', icon: HelpCircle },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto relative min-h-screen">
      <div className="flex relative items-stretch gap-0 md:gap-0 min-h-screen">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-20 md:hidden animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Navigation Sidebar */}
        <div 
          className={`flex flex-col transition-all duration-300 ease-in-out z-30
                     bg-surface-dark [html.light_&]:bg-surface-card-light
                     pt-8
                     ${isSidebarOpen 
                        ? 'w-64 opacity-100 border-r border-border-dark [html.light_&]:border-border-light' 
                        : 'w-0 opacity-0 -translate-x-full overflow-hidden'
                     }
                     absolute md:relative left-0 top-0 shadow-2xl md:shadow-none min-h-screen md:h-auto`}
        >
          {/* Internal Settings Title */}
          <div className="px-6 mb-8">
            <h1 className="text-2xl font-bold text-primary">Settings</h1>
          </div>
          <div className="flex-1 px-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as TabType)}
                className={`w-full whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left
                           ${activeTab === tab.id 
                             ? 'bg-primary/10 text-primary' 
                             : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:bg-white/5 [html.light_&]:hover:bg-black/5'
                           }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 cursor-pointer text-left"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-6 z-40 p-1 rounded-lg bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light shadow-xl text-primary hover:bg-primary/5 transition-all duration-300 cursor-pointer
                     ${isSidebarOpen ? 'left-[245px]' : 'left-4'}`}
        >
          {isSidebarOpen ? <ChevronRight size={18} className="rotate-180" /> : <ChevronRight size={18} />}
        </button>

        {/* Content Area */}
        <div className={`flex-1 pt-14 pb-8 px-4 md:px-12 transition-all duration-300 ${isSidebarOpen ? 'md:opacity-100' : 'opacity-100'}`}>
          <div className="mb-8 overflow-hidden">
             <h2 className="text-3xl font-bold text-text-dark [html.light_&]:text-text-light animate-in slide-in-from-top-4 duration-500">
                {activeTab === 'account' ? 'Account settings' : 
                 activeTab === 'help' ? 'Help and Support' : 
                 'Appearance'}
             </h2>
          </div>
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* Reset Password */}
               {user?.loginType !== 'google' && (
                 <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm">
                    <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Reset Password</h2>
                    <p className="text-sm text-text-muted-dark mb-4">Forgot your password? Reset it here by entering your email address.</p>
                    <div className="space-y-4">
                       <input type="email" value={user?.email || ''} readOnly className="w-full p-3 bg-white/5 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-border-light rounded-xl text-sm outline-none text-text-muted-dark" />
                       <Button disabled={isResetting} onClick={handleResetPassword} className="bg-primary hover:bg-primary-dark text-white rounded-xl px-6 py-2.5 font-bold text-sm h-auto inline-flex border border-transparent shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                          {isResetting ? 'Sending...' : 'Reset'}
                       </Button>
                    </div>
                 </div>
               )}

               {/* Logout */}
               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm">
                  <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Logout</h2>
                  <p className="text-sm text-text-muted-dark mb-4">Logout from your account on this device</p>
                  <Button onClick={handleLogout} className="bg-primary hover:bg-primary-dark text-white font-bold rounded-xl px-6 py-2.5 h-auto inline-flex border border-transparent shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     <LogOut size={18} className='mr-2'/> Logout
                  </Button>
               </div>

               {/* Need a break? */}
               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm">
                  <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Need a break?</h2>
                  <p className="text-sm text-text-muted-dark mb-4">Temporarily deactivate your account.</p>
                  <Button onClick={() => setIsDeactivateDialogOpen(true)} className="bg-primary hover:bg-primary-dark text-white font-bold rounded-xl px-6 py-2.5 h-auto inline-flex border border-transparent shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     Deactivate
                  </Button>
               </div>

               {/* Danger Zone */}
               <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl shadow-sm">
                  <h2 className="text-xl font-bold text-red-500 mb-1">Danger Zone</h2>
                  <p className="text-sm text-red-500/60 mb-4">Permanently delete your account. This action cannot be undone.</p>
                  <Button onClick={() => setDeleteStep(1)} className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-6 py-2.5 h-auto inline-flex shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                     Schedule for Deletion
                  </Button>
               </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Help and Support</h2>
                    <p className="text-sm text-text-muted-dark">Get help with any of our features</p>
                  </div>
                  <p className="text-sm text-text-muted-dark/80">We're here to help. If you have any questions, please reach out to us via email at socialhiveproject@gmail.com. We will get back to you as soon as possible.</p>
                  <a href="mailto:socialhiveproject@gmail.com" className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-xl px-6 py-2.5 font-bold text-sm transition-all no-underline shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     Mail us
                  </a>
               </div>

               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Feedback</h2>
                    <p className="text-sm text-text-muted-dark">Share your feedback with us</p>
                  </div>
                  <p className="text-sm text-text-muted-dark/80">We're always looking for ways to improve our product. Please let us know what you think. We appreciate your feedback!</p>
                  <button onClick={() => setIsSatisfactionDialogOpen(true)} className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-xl px-6 py-2.5 font-bold text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     Mail us
                  </button>
               </div>

               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">Report a User</h2>
                    <p className="text-sm text-text-muted-dark">Report violations or inappropriate behavior</p>
                  </div>
                  <p className="text-sm text-text-muted-dark/80">If you encounter anyone violating our community guidelines, please report them so our moderation team can investigate.</p>
                  <Button onClick={() => setIsReportDialogOpen(true)} className="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-2.5 font-bold text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                     Report a User
                  </Button>
               </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="p-6 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-sm">
                  <h2 className="text-lg font-bold text-text-dark [html.light_&]:text-text-light mb-6">Theme</h2>
                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => theme !== 'light' && toggleTheme()}
                       className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2
                                  ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border-dark text-text-muted-dark bg-white/5'}`}
                     >
                        <Sun size={20} />
                        <span className="text-sm font-bold">Light</span>
                     </button>
                     <button 
                       onClick={() => theme !== 'dark' && toggleTheme()}
                       className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2
                                  ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border-dark text-text-muted-dark bg-white/5'}`}
                     >
                        <Moon size={20} />
                        <span className="text-sm font-bold">Dark</span>
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isSatisfactionDialogOpen} onOpenChange={setIsSatisfactionDialogOpen}>
         <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-1">Feedback</h2>
            <p className="text-text-muted-dark text-sm mb-6">How was your journey on SocialHive?</p>
            
            <div className="space-y-6">
                <div className="flex justify-center gap-2">
                   {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setSatisfactionRating(star)} className={`p-1 cursor-pointer transition-all ${star <= satisfactionRating ? 'text-amber-400' : 'text-white/10 [html.light_&]:text-black/10'}`}>
                         <Star size={28} fill={star <= satisfactionRating ? "currentColor" : "none"} />
                      </button>
                   ))}
                </div>
                <textarea 
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us more..." 
                  className="w-full p-3 bg-white/5 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-border-light rounded-xl text-sm outline-none focus:border-primary/50 text-text-dark [html.light_&]:text-text-light min-h-[80px]"
                />
                <div className="flex gap-2">
                   <Button variant="ghost" className="flex-1" onClick={() => setIsSatisfactionDialogOpen(false)}>Stay</Button>
                   <Button disabled={satisfactionRating === 0} onClick={submitSatisfaction} className="flex-1 bg-red-500 text-white font-bold rounded-xl">Confirm</Button>
                </div>
            </div>
         </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-center text-lg md:text-xl text-text-dark [html.light_&]:text-text-light">
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
              className="flex-1 bg-gray-900 hover:bg-black text-white rounded-xl py-3 [html.light_&]:bg-red-500 [html.light_&]:hover:bg-red-600 shadow-md font-bold" 
              onClick={confirmLogout}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">
              Deactivate Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mt-4 mb-8">
            Are you sure you want to deactivate your account? This will make your account undiscoverable and all your posts, chats, etc will get hidden from the platform. You can reactivate your account by logging in again at anytime.
          </p>
          <div className="flex gap-4 justify-end">
            <Button 
               onClick={() => setIsDeactivateDialogOpen(false)} 
               className="bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-none"
            >
              No, Wait
            </Button>
            <Button 
               onClick={handleDeactivateConfirm} 
               className="bg-primary text-white hover:bg-primary-dark px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              Yes, Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Deletion - Step 1: Confirmation */}
      <Dialog open={deleteStep === 1} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-red-500 mb-1">
              Delete Account?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mt-4 mb-8">
            Are you sure you want to delete your account? all your posts, chats, etc will be deleted forever and cannot be recovered, do you still want to proceed?
          </p>
          <div className="flex gap-4 justify-end">
            <Button 
               onClick={() => setDeleteStep(0)} 
               className="bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-none"
            >
              No, Keep it
            </Button>
            <Button 
               onClick={() => setDeleteStep(2)} 
               className="bg-red-500 text-white hover:bg-red-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              Yes, Proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Deletion - Step 2: Verification */}
      <Dialog open={deleteStep === 2} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">
              Verify Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mt-4 mb-4">
            Please type <span className="font-bold text-red-500">DELETE MY ACCOUNT</span> to confirm.
          </p>
          <input
            type="text"
            placeholder="Type here..."
            value={deleteVerifyText}
            onChange={(e) => setDeleteVerifyText(e.target.value)}
            className="w-full p-3 bg-white/5 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-border-light rounded-xl text-sm outline-none focus:border-red-500/50 text-text-dark [html.light_&]:text-text-light mb-8"
          />
          <div className="flex gap-4 justify-end">
            <Button
               onClick={() => setDeleteStep(0)}
               className="bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-none"
            >
              Cancel
            </Button>
            <Button
               disabled={deleteVerifyText !== 'DELETE MY ACCOUNT'}
               onClick={() => {
                 setDeleteStep(3);
                 setIsSatisfactionDialogOpen(true);
               }}
               className="bg-red-500 text-white hover:bg-red-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        reportedUser={{ email: '' }}
      />

      {/* Deletion Process Started Dialog */}
      <Dialog open={isDeletionStartedDialogOpen} onOpenChange={setIsDeletionStartedDialogOpen}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">
              Deletion Process Started
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mt-4 mb-8">
            Deletion process takes about a week (7 days). You can terminate the deletion process anytime by login into your account.
          </p>
          <div className="flex justify-end">
            <Button
               onClick={() => {
                 setIsDeletionStartedDialogOpen(false);
                 toast.success("Deletion Process has begun", { icon: '🗑️' });
                 logout();
                 navigate('/login');
               }}
               className="bg-primary text-white hover:bg-primary-light px-8 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
            >
              Okay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
