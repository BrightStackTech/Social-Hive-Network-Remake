import React, { useState } from 'react';
import { Button } from './ui/Button';
import { X, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { createUpdate } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from './ui/Dialog';

interface CreateUpdatesModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateUpdatesModal({ onClose, onCreated }: CreateUpdatesModalProps) {
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isMediaSelected, setIsMediaSelected] = useState(false);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File size should be less than 10MB");
        return;
      }
      setSelectedMedia(file);
      setIsMediaSelected(false);
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      setIsPreviewDialogOpen(true);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaUrl(null);
    setIsMediaSelected(false);
  };

  const handleSelectMedia = () => {
    setIsMediaSelected(true);
    setIsPreviewDialogOpen(false);
  };

  const handleCancelPreview = () => {
    setSelectedMedia(null);
    setMediaUrl(null);
    setIsMediaSelected(false);
    setIsPreviewDialogOpen(false);
  };

  // Camera Effects
  React.useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera access error:", err);
          toast.error("Camera access denied or unavailable");
          setIsCameraActive(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedMedia(file);
            setMediaUrl(URL.createObjectURL(file));
            setIsMediaSelected(true);
            setIsCameraActive(false);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedMedia || !isMediaSelected) return;

    setLoading(true);
    const toastId = toast.loading("Uploading story...");

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', selectedMedia);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'socialhive_preset');
      
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'socialhive'}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const cloudinaryData = await uploadRes.json();
      
      if (!cloudinaryData.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      // 2. Save to Backend
      await createUpdate({
        media: cloudinaryData.secure_url,
        description,
      });

      toast.success("Story posted successfully!", { id: toastId });
      if (onCreated) onCreated();
      onClose();
      
      // Optionally navigate to feed or profile
      if (user) {
        navigate(`/updates/${user._id}`);
      }
    } catch (error) {
      console.error('Error creating update:', error);
      toast.error("Failed to post story", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-1 space-y-4">
      <div className="flex flex-col gap-4">
        {!selectedMedia && !isCameraActive && (
            <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => document.getElementById('mediaInput')?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-white/10 [html.light_&]:border-black/10 hover:border-primary/50 [html.light_&]:hover:bg-primary/5 [html.light_&]:hover:border-primary/50 transition-all text-white/60 [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-primary cursor-pointer group"
                >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="text-primary" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">Image/Video</span>
                </button>
                <button
                    onClick={() => setIsCameraActive(true)}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-white/10 [html.light_&]:border-black/10 hover:border-primary/50 [html.light_&]:hover:bg-primary/5 [html.light_&]:hover:border-primary/50 transition-all text-white/60 [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-primary cursor-pointer group"
                >
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera size={20} className="text-amber-500" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">Capture</span>
                </button>
            </div>
        )}

        {!selectedMedia && isCameraActive && (
          <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border border-border-dark [html.light_&]:border-border-light group mt-2">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }} // Mirror the preview
            />
            
            <button 
              onClick={() => setIsCameraActive(false)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 backdrop-blur-md transition-all z-20"
            >
              <X size={20} />
            </button>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
              <button 
                onClick={handleCapturePhoto}
                className="w-16 h-16 bg-white hover:bg-white/90 rounded-full flex items-center justify-center text-primary shadow-2xl transition-transform hover:scale-105 active:scale-95 border-4 border-primary/20"
              >
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera size={28} fill="currentColor" />
                   </div>
                </div>
              </button>
            </div>

            {/* Hint text */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Live Preview</span>
            </div>
          </div>
        )}

        <input
          id="mediaInput"
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaChange}
          className="hidden"
        />
      </div>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light">
          <DialogHeader>
            <DialogTitle className="text-white [html.light_&]:text-text-light font-bold tracking-tight">Preview Media</DialogTitle>
          </DialogHeader>
          
          {mediaUrl && (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {selectedMedia?.type.startsWith('image/') ? (
                <img src={mediaUrl} alt="Preview" className="w-full h-auto max-h-[400px] object-contain mx-auto" />
              ) : (
                <video src={mediaUrl} controls className="w-full h-auto max-h-[400px] object-contain mx-auto" />
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleCancelPreview} className="rounded-xl border-white/10 [html.light_&]:border-border-light [html.light_&]:text-text-light">
              Cancel
            </Button>
            <Button onClick={handleSelectMedia} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6">
              Select
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {mediaUrl && isMediaSelected && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 group">
          {selectedMedia?.type.startsWith('image/') ? (
            <img src={mediaUrl} alt="Selected" className="w-full h-auto max-h-[300px] object-contain mx-auto" />
          ) : (
            <video src={mediaUrl} controls className="w-full h-auto max-h-[300px] object-contain mx-auto" />
          )}
          <button 
            className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur-md transition-all scale-0 group-hover:scale-100 cursor-pointer" 
            onClick={handleRemoveMedia}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 [html.light_&]:text-text-muted-light uppercase tracking-widest pl-1">Caption</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-white/5 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-border-light rounded-2xl text-white [html.light_&]:text-text-light placeholder:text-white/20 [html.light_&]:placeholder:text-text-muted-light focus:border-primary/50 outline-none transition-all resize-none min-h-[100px]"
            placeholder="What's happening? (optional)"
          />
      </div>

      <div className="flex pt-2">
        <Button 
            onClick={handleSubmit} 
            disabled={!selectedMedia || !isMediaSelected || loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Posting Update...
            </div>
          ) : (
            "Post Story Update"
          )}
        </Button>
      </div>
    </div>
  );
}
