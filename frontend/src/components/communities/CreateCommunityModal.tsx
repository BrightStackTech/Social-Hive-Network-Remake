import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Cropper from "react-cropper";
import { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog';
import { useAuth } from '../../context/AuthContext';
import { Camera, Loader2, X, Edit2 } from 'lucide-react';

interface CreateCommunityModalProps {
  onClose: () => void;
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isUnique, setIsUnique] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>();
  const [croppedProfilePicture, setCroppedProfilePicture] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

  useEffect(() => {
    const checkCommunityNameUnique = async () => {
      setCheckingName(true);
      try {
        const response = await axios.get(`${SERVER_URI}/communities/check-community-name`, {
          params: { communityName: name },
        });
        setIsUnique(response.data.data);
      } catch (error) {
        console.error('Error checking community name uniqueness:', error);
      } finally {
        setCheckingName(false);
      }
    };

    if (name.length > 0) {
      const timeoutId = setTimeout(checkCommunityNameUnique, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsUnique(true);
    }
  }, [name]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePictureUrl(reader.result as string);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureCrop = () => {
    if (!cropperRef.current?.cropper) {
      toast.error('Cropper not loaded properly');
      return;
    }

    const canvas = cropperRef.current.cropper.getCroppedCanvas();
    if (!canvas) {
      toast.error('Failed to crop image');
      return;
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'profile_picture.png', { type: 'image/png' });
        setCroppedProfilePicture(file);
        setProfilePictureUrl(URL.createObjectURL(file));
        setIsCropDialogOpen(false);
      } else {
        toast.error('Failed to process image');
      }
    }, 'image/png');
  };

  const handleCreateCommunity = async () => {
    try {
      setLoading(true);
      let pfpUrl = '';

      // Only try to upload if user selected and finalized an image
      if (croppedProfilePicture) {
        const formData = new FormData();
        formData.append('file', croppedProfilePicture);

        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'socialhive_pfp';
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'domckasfk';

        console.log('Cloudinary config:', { cloudName, uploadPreset, fileSize: croppedProfilePicture.size });

        formData.append('upload_preset', uploadPreset);

        try {
          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
          });

          const cloudinaryResponse = await response.json();
          console.log('Cloudinary response:', cloudinaryResponse);

          if (!response.ok) {
            throw new Error(`Cloudinary error: ${cloudinaryResponse.error?.message || `Status ${response.status}`}`);
          }

          if (!cloudinaryResponse.secure_url) {
            throw new Error('No URL returned from Cloudinary');
          }

          pfpUrl = cloudinaryResponse.secure_url;
          toast.success('Image uploaded successfully!');
        } catch (err: any) {
          console.error("Cloudinary upload failed", err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          toast.error(`Upload failed: ${errorMsg}`);
          return; // Stop here if image upload fails
        }
      }

      // Create the community
      await axios.post(
        `${SERVER_URI}/communities/create-community`,
        {
          communityName: name,
          description,
          profilePicture: pfpUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Community created!');
      onClose();
      navigate(`/communities/c/${name}`);
    } catch (error: any) {
      console.error('Error creating community:', error);
      toast.error(error.response?.data?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const hasSpaces = /\s/.test(name);
  const isValid = isUnique && name.length > 0 && !hasSpaces && description.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-border-dark">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="font-display font-semibold text-white text-lg">Create Community</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <X size={20} className="text-text-muted-dark" />
          </button>
        </div>

        {/* Body - Form */}
        <form className="flex flex-col gap-5 p-6 overflow-y-auto flex-1">
          {/* PFP Uploader */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative w-32 h-32 rounded-3xl bg-surface-elevated-dark border-2 border-dashed border-border-dark flex items-center justify-center cursor-pointer overflow-hidden group shadow-lg active:scale-95 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePictureUrl ? (
                <img src={profilePictureUrl} alt="PFP" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-text-muted-dark group-hover:text-primary transition-colors">
                  <Camera size={28} />
                  <span className="text-[8px] font-black uppercase mt-1">Upload Icon</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Edit2 className="text-white" size={20} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleProfilePictureChange}
            />
          </div>

          {/* Community Name */}
          <div className="space-y-2">
            <label className="text-[14px] font-black text-white ">Community Name</label>
            <div className="relative">
              <Input
                maxLength={20}
                placeholder="e.g. quantum-physics"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={`h-12 bg-surface-elevated-dark border-2 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/40 transition-all ${!isUnique || hasSpaces ? 'border-danger focus:border-danger' : 'border-border-dark focus:border-primary'}`}
              />
              {checkingName && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin text-primary" size={16} />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <span className={`text-[9px] font-black ${name.length > 18 ? 'text-danger' : 'text-text-muted-dark'}`}>{name.length}/20</span>
            </div>
            {!isUnique && <p className="text-[9px] text-danger font-black uppercase">Name already taken</p>}
          </div>

          {/* Community Description */}
          <div className="space-y-2">
            <label className="text-[14px] font-black text-white ">Description</label>
            <textarea
              maxLength={100}
              placeholder="What kind of content will be shared here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-elevated-dark border-2 border-border-dark rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 h-28 resize-none transition-all placeholder:text-text-muted-dark/40"
            />
            <div className="flex justify-end">
              <span className={`text-[9px] font-black ${description.length > 90 ? 'text-danger' : 'text-text-muted-dark'}`}>{description.length}/100</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border-dark bg-surface-dark">
          <button
            onClick={onClose}
            className="text-[15px] font-black text-text-muted-dark hover:text-text-dark transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            className="px-8 py-2.5 rounded-full bg-primary text-white text-xs font-black text-[15px]
                       hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed
                       transition shadow-lg shadow-primary/25 cursor-pointer active:scale-95"
            disabled={!isValid || loading || checkingName}
            onClick={handleCreateCommunity}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Create'}
          </button>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-none">
          <div className="p-6 bg-surface-dark border-b border-border-dark flex items-center justify-between">
            <DialogTitle className="text-sm">Adjust Community Icon</DialogTitle>
            <button onClick={() => setIsCropDialogOpen(false)} className="text-text-muted-dark hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="bg-black/80 flex items-center justify-center p-6 max-h-96">
            {profilePictureUrl && (
              <Cropper
                ref={cropperRef}
                src={profilePictureUrl}
                style={{ maxHeight: '22rem', width: '100%' }}
                aspectRatio={1}
                guides={true}
                background={false}
                className="rounded-xl overflow-hidden shadow-2xl"
              />
            )}
          </div>
          <div className="p-6 bg-surface-dark flex gap-3">
            <Button variant="ghost" className="flex-1 h-12 text-[12px] font-black uppercase " onClick={() => setIsCropDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1 h-12 text-[12px] font-black uppercase  shadow-lg shadow-primary/20" onClick={handleProfilePictureCrop}>Finalize Icon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateCommunityModal;
