import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  Mail,
  ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { createReport } from '../api';
import toast from 'react-hot-toast';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUser: {
    _id?: string;
    email?: string;
  };
}

export default function ReportDialog({ open, onOpenChange, reportedUser }: ReportDialogProps) {
  const [manualEmail, setManualEmail] = useState(reportedUser.email || '');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update email if reportedUser changes
  useEffect(() => {
    if (open && reportedUser.email) {
      setManualEmail(reportedUser.email);
    }
  }, [open, reportedUser.email]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!manualEmail.trim()) {
      toast.error('Reported user email is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a description of the violation');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (reportedUser._id) formData.append('reportedUserId', reportedUser._id);
      if (manualEmail) formData.append('reportedEmail', manualEmail);
      formData.append('description', description);
      if (selectedFile) {
        formData.append('media', selectedFile);
      }

      await createReport(formData);
      setStep('success');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a small delay to avoid UI jumping
    setTimeout(() => {
      setStep('form');
      setDescription('');
      setManualEmail(reportedUser.email || '');
      setSelectedFile(null);
      setPreviewUrl(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface-dark border-border-dark p-0 overflow-hidden rounded-3xl">
        {step === 'form' ? (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-danger/10 text-danger">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-display font-bold text-white">
                    Report Violation
                  </DialogTitle>
                  <p className="text-xs text-text-muted-dark mt-0.5 uppercase tracking-wider font-semibold">
                    platform safety report
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Manual Email / Target Identification */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted-dark px-1 flex items-center gap-2">
                  <Mail size={14} className="text-primary" />
                  Reported User Email
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="e.g. user@college.edu"
                    className="w-full bg-white/5 border border-border-dark rounded-2xl py-3 px-4 text-white placeholder:text-text-muted-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted-dark px-1">
                  Why are you reporting this user?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what happened..."
                  className="w-full h-32 bg-white/5 border border-border-dark rounded-2xl p-4 text-white placeholder:text-text-muted-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted-dark px-1">
                  Attach Evidence (Optional)
                </label>
                
                {previewUrl ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-border-dark aspect-video bg-black/20">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video src={previewUrl} className="w-full h-full object-contain" controls />
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-border-dark rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-text-muted-dark hover:text-primary cursor-pointer"
                  >
                    <Upload size={24} />
                    <span className="text-sm font-medium">Click to upload image or video</span>
                    <span className="text-xs opacity-60">Max size 10MB</span>
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="flex-1 rounded-2xl h-12 text-text-muted-dark hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !description.trim()}
                  className="flex-1 rounded-2xl h-12 bg-danger hover:bg-danger-hover text-white font-bold"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
                <div className="relative flex items-center justify-center w-full h-full bg-success/10 text-success rounded-full border border-success/30">
                    <CheckCircle2 size={40} />
                </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-black text-white tracking-tight">
                Report Received!
              </h2>
              <p className="text-text-muted-dark leading-relaxed">
                We will be looking at your report shortly. Thanks for reporting, this keeps our platform safe.
              </p>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleClose}
                className="w-full h-12 rounded-2xl text-black hover:bg-gray-100 font-black tracking-tight flex items-center justify-center gap-2 group"
              >
                Thank You
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
