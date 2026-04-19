import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { X, Upload, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCategory } from '../api/index';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateCategoryModal({ onClose, onCreated }: CreateCategoryModalProps) {
  const navigate = useNavigate();
  const cropperRef = useRef<any>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setShowCropDialog(true);
    }
  };

  const handleCrop = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      cropperRef.current.cropper.getCroppedCanvas().toBlob((blob: Blob | null) => {
        if (blob) {
          setCroppedBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          setShowCropDialog(false);
        }
      }, 'image/jpeg');
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        image: croppedBlob ? new File([croppedBlob], 'category.jpg', { type: 'image/jpeg' }) : null
      };

      const res = await createCategory(data);
      toast.success('Category created successfully!');
      
      const newCategory = res.data.data;
      onCreated?.();
      onClose();
      navigate(`/category/${newCategory._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg p-8 rounded-2xl
                    bg-surface-card-dark [html.light_&]:bg-surface-card-light
                    border border-border-dark [html.light_&]:border-border-light
                    shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
            Create Category
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={20} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Image Upload Area */}
          <div className="relative group">
            {previewUrl ? (
              <div className="relative h-48 rounded-xl overflow-hidden shadow-lg border-2 border-primary/20">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => document.getElementById('cat-image-input')?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold cursor-pointer"
                >
                  <Upload size={20} /> Change Image
                </button>
              </div>
            ) : (
              <div 
                onClick={() => document.getElementById('cat-image-input')?.click()}
                className="h-48 rounded-xl border-2 border-dashed border-border-dark [html.light_&]:border-gray-200 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-surface-elevated-dark flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="text-text-muted-dark" size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light">Upload Category Image</p>
                  <p className="text-xs text-text-muted-dark">Landscape recommended (16:9)</p>
                </div>
              </div>
            )}
            <input 
              id="cat-image-input" 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted-dark mb-1.5">Category Name</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} 
                placeholder="e.g. WebDevelopment"
                className="font-bold tracking-tight"
              />
              <p className="text-[10px] text-text-muted-dark mt-1">
                Spaces are not allowed. Mention in posts using @@{name || 'Name'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted-dark mb-1.5">Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="What kind of content belongs here?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none
                           bg-surface-elevated-dark [html.light_&]:bg-gray-50
                           border border-border-dark [html.light_&]:border-gray-200
                           text-text-dark [html.light_&]:text-text-light
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={loading || !name || !description}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} className="mr-2" /> Create Category</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Cropper Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-2xl py-6 px-6">
          <DialogHeader>
            <DialogTitle>Adjust Image</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Cropper
              src={previewUrl || ''}
              style={{ height: 400, width: '100%' }}
              aspectRatio={16 / 9}
              guides={true}
              background={false}
              ref={cropperRef}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowCropDialog(false)}>Cancel</Button>
            <Button onClick={handleCrop}>Apply Crop</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
