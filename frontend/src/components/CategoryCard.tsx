import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Eye, Share2, Trash2, Edit3, Link as LinkIcon, Mail, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { updateCategory, deleteCategory } from '../api/index';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/DropdownMenu';

export interface Category {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  createdAt?: string;
  createdBy?: {
    _id: string;
    username: string;
    profilePicture: string;
  };
}

interface CategoryCardProps {
  category: Category;
  onRefresh?: () => void;
}

export default function CategoryCard({ category, onRefresh }: CategoryCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const shareUrl = `${window.location.origin}/category/${category._id}`;

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [editedDescription, setEditedDescription] = useState(category.description);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCreator = user?._id === category.createdBy?._id;

  const handleSaveEdit = async () => {
    if (!editedName.trim() || !editedDescription.trim()) {
      toast.error('Name and description are required');
      return;
    }
    setLoading(true);
    try {
      await updateCategory(category._id, {
        name: editedName.trim(),
        description: editedDescription.trim(),
      });
      toast.success('Category updated');
      setIsEditing(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCategory(category._id);
      toast.success('Category deleted');
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  return (
    <Card className="group relative">
      <div className="flex flex-col md:flex-row gap-6 p-5">
        {/* Image Section */}
        <div 
          className="relative w-full md:w-64 h-48 rounded-xl overflow-hidden cursor-pointer"
          onClick={() => navigate(`/category/${category._id}`)}
        >
          {category.imageUrl ? (
            <img 
              src={category.imageUrl} 
              alt={category.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <div className="w-full h-full bg-surface-elevated-dark flex items-center justify-center">
              <span className="text-text-muted-dark/20 font-bold text-4xl">
                {category.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="text-white" size={24} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {isEditing ? (
              <div className="space-y-3">
                <Input 
                  value={editedName} 
                  onChange={(e) => setEditedName(e.target.value)} 
                  placeholder="Category Name"
                />
                <Input 
                  value={editedDescription} 
                  onChange={(e) => setEditedDescription(e.target.value)} 
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={loading}>Save</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 
                  className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/category/${category._id}`)}
                >
                  {category.name}
                </h3>
                <p className="mt-2 text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-3">
                  {category.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-text-muted-dark/60">
                  <span>Created {new Date(category.createdAt!).toLocaleDateString()}</span>
                  {category.createdBy && (
                    <>
                      <span>•</span>
                      <span>by @{category.createdBy.username}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button size="sm" variant="accent" onClick={() => navigate(`/category/${category._id}`)}>
              <Eye size={16} className="mr-2" /> View Posts
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowShareDialog(true)}>
              <Share2 size={16} className="mr-2" /> Share
            </Button>
          </div>
        </div>
      </div>

      {/* Options Menu */}
      {isCreator && !isEditing && (
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="p-2 rounded-full hover:bg-white/10 [html.light_&]:hover:bg-black/5 transition-colors">
                <MoreVertical size={20} className="text-text-muted-dark" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <button 
                className="w-full flex items-center gap-2 p-2.5 text-sm hover:bg-white/5 [html.light_&]:hover:bg-black/5 rounded-lg transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={16} /> Edit
              </button>
              <button 
                className="w-full flex items-center gap-2 p-2.5 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} className="flex-1" />
              <Button onClick={copyLink}>Copy</Button>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <button onClick={copyLink} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-full bg-surface-elevated-dark flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <LinkIcon size={20} />
                </div>
                <span className="text-xs">Link</span>
              </button>
              <a href={`mailto:?subject=Check out this category&body=${shareUrl}`} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-full bg-surface-elevated-dark flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Mail size={20} />
                </div>
                <span className="text-xs">Email</span>
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-full bg-surface-elevated-dark flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <MessageSquare size={20} />
                </div>
                <span className="text-xs">WhatsApp</span>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-text-muted-dark">
            This will permanently remove the category. Posts using this name will remain but will no longer be linked here.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={loading}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
