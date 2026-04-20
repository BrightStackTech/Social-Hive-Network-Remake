import { useState, useEffect, useRef, useCallback } from 'react';
import OthersPostCard from '../components/posts/OthersPostCard';
import PostSkeletonLoader from '../components/posts/PostSkeletonLoader';
import { getUserFeed, getFollowing, getUpdates } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import CreateUpdatesModal from '../components/CreateUpdatesModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';

interface StoryUser {
  _id: string;
  username: string;
  profilePicture: string;
  hasViewed: boolean;
}

export default function ExplorePosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [_allFetchedPosts, setAllFetchedPosts] = useState<any[]>([]); // raw chronological pool
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 10;
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [followedUsersWithUpdates, setFollowedUsersWithUpdates] = useState<StoryUser[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Fetch followed users with updates
  const fetchStories = async () => {
    if (!user) return;
    setStoriesLoading(true);
    try {
        // 1. Get following list
        const followingRes = await getFollowing({ username: user.username });
        const followingList = followingRes.data.users;

        // 2. Filter for users with active updates
        const usersWithStories = await Promise.all(
            followingList.map(async (u: any) => {
                try {
                    const updateRes = await getUpdates(u._id);
                    const stories = updateRes.data.data;
                    if (stories.length > 0) {
                        // Check if all stories are viewed
                        const hasViewed = stories.every((s: any) => s.viewedBy.includes(user._id));
                        return { 
                            _id: u._id, 
                            username: u.username, 
                            profilePicture: u.profilePicture, 
                            hasViewed 
                        };
                    }
                } catch (e) {
                    return null;
                }
                return null;
            })
        );

        setFollowedUsersWithUpdates(usersWithStories.filter(u => u !== null) as StoryUser[]);
    } catch (err) {
        console.error("Failed to fetch stories rail", err);
    } finally {
        setStoriesLoading(false);
    }
  };

  // ── Round-Robin interleaving ─────────────────────────────
  // Groups posts by author and interleaves them so no more than
  // 2 consecutive posts from the same user appear together.
  // Falls back to chronological order if only one author exists.
  const applyRoundRobin = (rawPosts: any[]): any[] => {
    // Group by author id
    const groups: Record<string, any[]> = {};
    rawPosts.forEach((post) => {
      const authorId =
        post.createdBy?._id?.toString() ||
        post.createdBy?.toString() ||
        'unknown';
      if (!groups[authorId]) groups[authorId] = [];
      groups[authorId].push(post);
    });

    const authorIds = Object.keys(groups);
    // Only one author — just return chronologically
    if (authorIds.length <= 1) return rawPosts;

    const result: any[] = [];
    // Each author gets a cursor index
    const cursors: Record<string, number> = {};
    authorIds.forEach((id) => (cursors[id] = 0));

    let lastAuthor: string | null = null;
    let consecutiveCount = 0;

    // Round-robin: pick next available author respecting the max-2 rule
    const totalPosts = rawPosts.length;
    while (result.length < totalPosts) {
      let placed = false;
      // Try each author in order, skip same author if already placed 2 in a row
      for (let i = 0; i < authorIds.length; i++) {
        const authorId = authorIds[i];
        if (cursors[authorId] >= groups[authorId].length) continue; // exhausted

        if (authorId === lastAuthor && consecutiveCount >= 2) continue; // max 2 rule

        result.push(groups[authorId][cursors[authorId]]);
        cursors[authorId]++;
        consecutiveCount = authorId === lastAuthor ? consecutiveCount + 1 : 1;
        lastAuthor = authorId;
        placed = true;
        break;
      }

      // Fallback: all remaining authors have hit max-2 in a row — just pick next available
      if (!placed) {
        for (const authorId of authorIds) {
          if (cursors[authorId] < groups[authorId].length) {
            result.push(groups[authorId][cursors[authorId]]);
            cursors[authorId]++;
            consecutiveCount = authorId === lastAuthor ? consecutiveCount + 1 : 1;
            lastAuthor = authorId;
            break;
          }
        }
      }
    }

    return result;
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback(
    (node: any) => {
      if (loading || moreLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setSkip((prev) => prev + limit);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, moreLoading, hasMore]
  );

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setMoreLoading(true);

    try {
      const res = await getUserFeed({ limit, skip: isInitial ? 0 : skip });
      const newPosts = res.data.data;

      if (isInitial) {
        setAllFetchedPosts(newPosts);
        setPosts(applyRoundRobin(newPosts));
      } else {
        // Merge new page into existing pool, then re-interleave the whole thing
        setAllFetchedPosts((prev) => {
          const merged = [...prev, ...newPosts];
          setPosts(applyRoundRobin(merged));
          return merged;
        });
      }

      if (newPosts.length < limit) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch feed', err);
    } finally {
      if (isInitial) setLoading(false);
      else setMoreLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    fetchStories();
  }, []);

  useEffect(() => {
    if (skip > 0) {
      fetchData();
    }
  }, [skip]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Story Rail */}
      <div className="mb-10 w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-white [html.light_&]:text-text-light">Updates</h2>
            {storiesLoading && <Loader2 className="animate-spin text-white/20" size={12} />}
          </div>
          
          <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide select-none -mx-2 px-2 border-b border-white/10 [html.light_&]:border-black/10">
              <div 
                className="flex-shrink-0 flex flex-col items-center gap-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                  <div className="w-16 h-16 rounded-full p-[3px] bg-white/5 [html.light_&]:bg-black/5 border border-white/10 [html.light_&]:border-black/10 group cursor-pointer transition-all">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white/5 [html.light_&]:bg-black/5 relative flex items-center justify-center">
                          <img src={user?.profilePicture} className="w-full h-full object-cover opacity-60 grayscale [html.light_&]:opacity-40" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/80">
                               <span className="text-white text-3xl font-light leading-none">+</span>
                          </div>
                      </div>
                  </div>
                  <span className="text-xs md:text-sm font-bold text-white/40 [html.light_&]:text-text-muted-light tracking-tight">Your Update</span>
              </div>

              {followedUsersWithUpdates.map((storyUser) => (
                  <Link 
                    key={storyUser._id} 
                    to={`/updates/${storyUser._id}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer transition-all"
                  >
                      <div className={`w-16 h-16 rounded-full p-[3px] transition-all duration-500 ${storyUser.hasViewed ? 'bg-white/10 [html.light_&]:bg-black/10' : 'bg-primary'}`}>
                          <div className="w-full h-full rounded-full border-[3px] border-black [html.light_&]:border-white overflow-hidden bg-zinc-900 [html.light_&]:bg-surface-light shadow-xl">
                              <img src={storyUser.profilePicture} className="w-full h-full object-cover" alt={storyUser.username} />
                          </div>
                      </div>
                      <span className={`text-xs md:text-sm font-bold tracking-tight transition-colors ${storyUser.hasViewed ? 'text-white/20 [html.light_&]:text-text-muted-light/40' : 'text-white/80 [html.light_&]:text-text-light'}`}>
                          {storyUser.username.split(' ')[0]}
                      </span>
                  </Link>
              ))}

          </div>
      </div>

      {/* Centered Header */}
      <div className="flex flex-col items-center mb-10 text-center">
        <h1 className="text-xl font-bold text-white [html.light_&]:text-text-light mb-2">Explore Posts</h1>
      </div>
        
      {loading ? (
           <div className="w-full flex flex-col gap-6">
              <PostSkeletonLoader />
              <PostSkeletonLoader />
           </div>
      ) : posts.length > 0 ? (
        <div className="w-full flex flex-col gap-6">
          {posts.map((post, index) => (
            <div key={post._id} ref={index === posts.length - 1 ? lastPostRef : null}>
              <OthersPostCard post={post} />
            </div>
          ))}
          {moreLoading && <PostSkeletonLoader />}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-text-muted-dark [html.light_&]:text-text-muted-light text-sm">
              No posts to show, search or follow new content
          </p>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="py-12 text-center border-t border-white/5 mt-4">
            <p className="text-text-muted-dark text-[10px] uppercase font-bold tracking-widest ">
                You've seen everything
            </p>
        </div>
      )}
      {/* Create Update Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-xl bg-surface-dark border-border-dark p-6 rounded-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-white font-bold text-2xl tracking-tight">New Status Update</DialogTitle>
          </DialogHeader>
          <CreateUpdatesModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onCreated={() => fetchStories()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}