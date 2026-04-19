import { useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePostModal({ onClose, onCreated }: Props) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 10) {
      toast.error('Max 10 media files allowed');
      return;
    }
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      files.forEach((f) => formData.append('media', f));

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/v1/posts/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create post');

      toast.success('Post created!');
      onCreated();
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface-dark [html.light_&]:bg-surface-light
                      border border-border-dark [html.light_&]:border-border-light
                      shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dark [html.light_&]:border-border-light">
          <h2 className="font-display font-semibold text-text-dark [html.light_&]:text-text-light text-lg">
            Create Post
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <X size={18} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Post title..."
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                         bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className={`text-right text-xs mt-1 ${title.length > 90 ? 'text-red-400' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}>
              {title.length}/100
            </p>
          </div>

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="What's on your mind? You can paste links here too..."
              className="w-full rounded-xl px-4 py-2.5 text-sm resize-none
                         bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className={`text-right text-xs mt-1 ${content.length > 1900 ? 'text-red-400' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}>
              {content.length}/2000
            </p>
          </div>

          {/* Media previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-dark [html.light_&]:border-border-light">
                  {files[i]?.type.startsWith('video/') ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center cursor-pointer"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-light cursor-pointer transition"
            >
              <ImagePlus size={18} />
              Add Media
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="px-6 py-2 rounded-full bg-primary text-white text-sm font-semibold
                         hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed
                         transition shadow-lg shadow-primary/25 cursor-pointer"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
