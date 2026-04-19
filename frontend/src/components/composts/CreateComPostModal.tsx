import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Cropper from 'react-cropper';
import { type ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Loader2, ImagePlus, X, AlertTriangle, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent } from '../ui/Dialog';

interface CreateComPostModalProps {
  onClose: () => void;
}

const CreateComPostModal: React.FC<CreateComPostModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Image handling states
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [croppedImages, setCroppedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [flaggedIndices, setFlaggedIndices] = useState<boolean[]>([]);
  const cropperRefs = useRef<React.RefObject<ReactCropperElement | null>[]>([]);

  const { user, token } = useAuth();
  const navigate = useNavigate();
  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

  // Helper: File to Base64 for Vision API
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Safe Search Detection
  const detectSafeSearch = async (base64Data: string): Promise<boolean> => {
    const apiKey = import.meta.env.VITE_CLOUD_VISION_API_KEY;
    if (!apiKey) return false; 
    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          }],
        }),
      });
      const json = await response.json();
      const safeSearch = json?.responses?.[0]?.safeSearchAnnotation;
      if (!safeSearch) return false;
      const flaggedLevels = ['LIKELY', 'VERY_LIKELY'];
      return ['adult', 'medical', 'violence', 'racy'].some(cat => flaggedLevels.includes(safeSearch[cat]));
    } catch (err) {
      console.error('Vision API error:', err);
      return false;
    }
  };

  useEffect(() => {
    const fetchJoinedCommunities = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/communities/joined-communities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCommunities(response.data.data);
      } catch (error) {
        console.error('Error fetching joined communities:', error);
      }
    };
    fetchJoinedCommunities();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (croppedImages.length + selected.length > 10) {
      toast.error('Max 10 media files allowed');
      return;
    }
    setSelectedImages(selected);
    cropperRefs.current = selected.map(() => React.createRef<ReactCropperElement>());
    setIsCropDialogOpen(true);
  };

  const handleCropImages = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedImages.map(async (file, index) => {
          if (file.type !== 'image/gif' && cropperRefs.current[index]?.current?.cropper) {
            return new Promise<{ croppedFile: File; flagged: boolean }>((resolve) => {
              cropperRefs.current[index].current!.cropper.getCroppedCanvas().toBlob(async (blob) => {
                if (blob) {
                  const croppedFile = new File([blob], `image_${index}.png`, { type: 'image/png' });
                  const base64 = await fileToBase64(croppedFile);
                  const flagged = await detectSafeSearch(base64);
                  resolve({ croppedFile, flagged });
                } else resolve({ croppedFile: file, flagged: false });
              }, 'image/png');
            });
          }
          const b64 = await fileToBase64(file);
          const flg = await detectSafeSearch(b64);
          return { croppedFile: file, flagged: flg };
        })
      );

      setCroppedImages(prev => [...prev, ...results.map(r => r.croppedFile)]);
      setPreviews(prev => [...prev, ...results.map(r => URL.createObjectURL(r.croppedFile))]);
      setFlaggedIndices(prev => [...prev, ...results.map(r => r.flagged)]);
    } catch (err) {
      console.error('Crop error:', err);
      toast.error("Failed to process images");
    } finally {
      setLoading(false);
      setIsCropDialogOpen(false);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setCroppedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFlaggedIndices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity) return toast.error('Please select a community');
    if (!title.trim() || !content.trim()) return toast.error('Title and content are required');
    if (flaggedIndices.some(Boolean)) return toast.error("Please remove flagged content");

    setLoading(true);
    const mediaUrls: string[] = [];
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'domckasfk';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'socialhive_posts';

    try {
      for (const file of croppedImages) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
          method: 'POST',
          body: fd
        });
        const data = await res.json();
        mediaUrls.push(data.secure_url);
      }

      const res = await axios.post(`${SERVER_URI}/composts/create-compost`, {
        title: title.trim(),
        description: content.trim(),
        community: selectedCommunity,
        author: user?._id,
        media: mediaUrls,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Post created!');
      onClose();
      navigate(`/compost/${res.data._id}`);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface-dark [html.light_&]:bg-surface-light rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-border-dark [html.light_&]:border-border-light">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark [html.light_&]:border-border-light">
          <h2 className="font-display font-semibold text-text-dark [html.light_&]:text-text-light text-lg">
            Create Community Post
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-gray-100 transition cursor-pointer">
            <X size={18} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto flex-1 scrollbar-hide">
        {/* Community Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-dark uppercase  flex items-center gap-1.5 px-1">
            Pick a Community <Layout size={10} className="text-primary" />
          </label>
          <select 
            value={selectedCommunity} 
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                       border border-border-dark [html.light_&]:border-border-light
                       text-text-dark [html.light_&]:text-text-light
                       focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer shadow-sm"
          >
            <option value="" disabled>Select a community to post in...</option>
            {communities.map((c) => (
              <option key={c._id} value={c._id}>c/{c.communityName}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-dark uppercase  px-1">Post Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="A catchy title for your compost..."
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                       border border-border-dark [html.light_&]:border-border-light
                       text-text-dark [html.light_&]:text-text-light
                       placeholder:text-text-muted-dark/50
                       focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
          />
          <div className="flex justify-end pr-1">
            <span className={`text-[9px] font-black ${title.length > 90 ? 'text-danger' : 'text-text-muted-dark'}`}>
              {title.length}/100
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-text-dark uppercase  px-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="What's happening in this community?"
            className="w-full rounded-xl px-4 py-2.5 text-sm resize-none
                       bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                       border border-border-dark [html.light_&]:border-border-light
                       text-text-dark [html.light_&]:text-text-light
                       placeholder:text-text-muted-dark/50
                       focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
          />
          <div className="flex justify-end pr-1">
            <span className={`text-[9px] font-black ${content.length > 950 ? 'text-danger' : 'text-text-muted-dark'}`}>
              {content.length}/1000
            </span>
          </div>
        </div>

        {/* Media previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3 p-1">
            {previews.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-border-dark group shadow-lg">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center cursor-pointer hover:bg-danger transition-colors shadow-lg"
                >
                  <X size={12} className="text-white" />
                </button>
                {flaggedIndices[i] && (
                  <div className="absolute inset-0 bg-danger/20 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <AlertTriangle size={18} className="text-danger mb-0.5" />
                    <span className="text-[8px] font-black uppercase text-danger">Flagged</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 px-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary-light cursor-pointer transition active:scale-95"
          >
            <ImagePlus size={18} />
            Add Media
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim() || !selectedCommunity || flaggedIndices.some(Boolean)}
            className="px-8 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase 
                       hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed
                       transition shadow-lg shadow-primary/25 cursor-pointer active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Post'}
          </button>
        </div>
      </form>

      {/* Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-3xl border-none">
          <div className="p-6 bg-surface-dark border-b border-border-dark flex items-center justify-between">
            <h2 className="text-sm font-black uppercase  text-text-dark">Crop & Safety Check</h2>
            <button onClick={() => setIsCropDialogOpen(false)} className="text-text-muted-dark hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto max-h-[60vh] bg-black/40 scrollbar-hide">
            {selectedImages.map((img, i) => (
              <div key={i} className="border border-border-dark rounded-2xl overflow-hidden bg-surface-dark shadow-2xl">
                <div className="p-3 bg-surface-elevated-dark border-b border-border-dark text-[10px] font-black uppercase text-text-muted-dark">
                  Image #{i + 1}
                </div>
                <div className="p-4">
                  {img.type !== 'image/gif' ? (
                    <Cropper
                      ref={cropperRefs.current[i]}
                      src={URL.createObjectURL(img)}
                      style={{ height: 280, width: '100%' }}
                      aspectRatio={NaN}
                      guides={true}
                      background={false}
                      className="rounded-xl overflow-hidden"
                    />
                  ) : (
                    <div className="h-[280px] flex flex-col items-center justify-center bg-black/20 rounded-xl gap-2 text-text-muted-dark">
                      <ImagePlus size={48} className="opacity-30" />
                      <p className="text-[10px] font-black uppercase ">GIF Preview (Static)</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-surface-dark flex justify-end gap-3 border-t border-border-dark">
            <button 
              className="px-6 py-3 rounded-xl text-[10px] font-black uppercase  text-text-muted-dark hover:bg-white/5" 
              onClick={() => setIsCropDialogOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="px-10 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase  shadow-lg shadow-primary/20 hover:bg-primary-light transition-all active:scale-95" 
              onClick={handleCropImages} 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Finalize Images'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
};

export default CreateComPostModal;
