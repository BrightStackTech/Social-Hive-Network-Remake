import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Loader2, Info, Search, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getCategory, searchPosts, updateCategory } from '../api/index';
import PostCard from '../components/posts/PostCard';
import OthersPostCard from '../components/posts/OthersPostCard';
import { Button } from '../components/ui/Button';

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetchCategory();
    }
  }, [categoryId]);

  const fetchCategory = async () => {
    setLoading(true);
    try {
      const res = await getCategory(categoryId!);
      const catData = res.data.data;
      setCategory(catData);
      setDescriptionDraft(catData.description || '');
      document.title = `SocialHive — ${catData.name}`;
      fetchCategoryPosts(catData.name, catData.createdBy._id);
    } catch (error: any) {
      toast.error('Failed to load category');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryPosts = async (catName: string, creatorId: string) => {
    setPostsLoading(true);
    try {
      const res = await searchPosts(catName);
      const allPosts = res.data.posts || res.data.data?.posts || [];
      
      const filtered = allPosts.filter((post: any) => {
        const title = post.title?.toLowerCase() || '';
        const content = post.content?.toLowerCase() || '';
        const catLower = catName.toLowerCase();
        
        const titleMatches = title.includes("@@" + catLower);
        const contentMatches = content.includes("@@" + catLower);
        const creatorMatches = post.createdBy?._id === creatorId;
        
        return (titleMatches || contentMatches) && creatorMatches;
      });
      
      setPosts(filtered);
    } catch (error) {
      console.error('Error fetching category posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    const title = post.title?.toLowerCase() || '';
    const content = post.content?.toLowerCase() || '';
    return title.includes(query) || content.includes(query);
  });

  const canEditDescription = !!user?._id && !!category?.createdBy?._id && user._id === category.createdBy._id;

  const handleSaveDescription = async () => {
    if (!categoryId || !category) return;

    const trimmed = descriptionDraft.trim();
    if (!trimmed) {
      toast.error('Description cannot be empty');
      return;
    }

    setSavingDescription(true);
    try {
      const res = await updateCategory(categoryId, { description: trimmed });
      const updatedCategory = res.data?.data || res.data?.category;

      setCategory((prev: any) => ({
        ...prev,
        ...(updatedCategory || {}),
        description: updatedCategory?.description || trimmed,
      }));

      setDescriptionDraft(updatedCategory?.description || trimmed);
      setIsEditingDescription(false);
      toast.success('Description updated');
    } catch (error) {
      toast.error('Failed to update description');
    } finally {
      setSavingDescription(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={24} className="text-text-muted-dark group-hover:text-text-dark" />
        </button>

        {/* Hero Section */}
        {category && (
          <div className="space-y-6">
            {category.imageUrl && (
              <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={category.imageUrl} 
                  alt={category.name} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-white drop-shadow-lg">
                    {category.name}
                  </h1>
                </div>
              </div>
            )}

            {!category.imageUrl && (
              <h1 className="text-4xl md:text-5xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
                {category.name}
              </h1>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={category.createdBy.profilePicture} 
                  alt={category.createdBy.username} 
                  className="w-10 h-10 rounded-full border border-border-dark"
                />
                <div>
                  <p className="text-lg font-semibold text-text-dark [html.light_&]:text-text-light">
                    @{category.createdBy.username}
                  </p>
                  <p className="text-sm text-text-muted-dark">
                    Created on {new Date(category.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button className="!hidden md:!inline-flex" variant="outline" size="lg" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied!');
              }}>
                <Share2 size={16} className="mr-2" /> Share Category
              </Button>
            </div>

            <div className="py-2 border-l-2 border-primary/30 pl-4">
              <div className="flex items-start gap-2">
                {isEditingDescription ? (
                  <div className="w-full space-y-2">
                    <textarea
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                               border border-border-dark [html.light_&]:border-border-light px-3 py-2
                               text-text-dark [html.light_&]:text-text-light placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                               focus:outline-none focus:border-primary transition-colors"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                        <Check size={14} className="mr-1" />
                        {savingDescription ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDescriptionDraft(category.description || '');
                          setIsEditingDescription(false);
                        }}
                        disabled={savingDescription}
                      >
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-text-muted-dark [html.light_&]:text-text-muted-light text-lg flex-1">
                      {category.description}
                    </p>
                    {canEditDescription && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(true)}
                        className="p-2 rounded-lg hover:bg-white/10 [html.light_&]:hover:bg-black/5 transition-colors"
                        aria-label="Edit description"
                      >
                        <Pencil size={16} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <Button className="md:hidden w-full" variant="outline" size="lg" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copied!');
            }}>
              <Share2 size={16} className="mr-2" /> Share Category
            </Button>

            {/* Posts Feed */}
            <div className="pt-4 md:pt-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-border-dark pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg text-text-dark [html.light_&]:text-text-light">
                    <span className="mr-2">{filteredPosts.length}</span>
                    <span>posts in this category</span>
                  </h2>
                </div>

                {/* Search Box */}
                <div className="relative flex-1 md:max-w-xs">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                             focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {postsLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const postCreatorId = post.createdBy?._id;
                    const isOwn = user?._id === postCreatorId;
                    
                    return isOwn ? (
                      <PostCard 
                        key={post._id} 
                        post={post} 
                        onDeleted={() => fetchCategoryPosts(category.name, category.createdBy?._id)}
                      />
                    ) : (
                      <OthersPostCard 
                        key={post._id} 
                        post={post} 
                        followCallback={() => fetchCategoryPosts(category.name, category.createdBy?._id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 rounded-2xl bg-white/5 [html.light_&]:bg-black/5 border border-dashed border-border-dark [html.light_&]:border-border-light">
                  <Info className="mx-auto text-text-muted-dark/20" size={48} />
                  <p className="text-text-muted-dark">
                    No posts found matching this category yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
