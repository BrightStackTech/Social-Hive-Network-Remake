import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ComPostCard, { type ComPost } from '../components/composts/ComPostCard';
import ComPostSkeletonLoader from '../components/composts/ComPostSkeletonLoader';
import { Loader2, Globe, Compass } from 'lucide-react';
import ComSearchBar from '../components/communities/ComSearchBar';
import { Link } from 'react-router-dom';
import { CommunityListDialog } from '../components/communities/CommunityListDialog';
import { JoinLeaveButton } from '../components/communities/JoinLeaveButton';


const CommunitySearchResultCard = ({ community }: { community: any }) => (
    <Link 
        to={`/communities/c/${community.communityName}`}
        className="bg-surface-elevated-dark/50 [html.light_&]:bg-white p-5 rounded-[2rem] border border-border-dark [html.light_&]:border-border-light flex items-center justify-between group hover:border-primary/50 hover:bg-surface-elevated-dark [html.light_&]:hover:bg-gray-50 transition-all no-underline backdrop-blur-sm"
    >
        <div className="flex items-center gap-5 min-w-0">
            <div className="w-16 h-16 rounded-3xl bg-surface-dark [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-border-light flex items-center justify-center overflow-hidden shrink-0 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                {community.profilePicture ? (
                    <img src={community.profilePicture} alt={community.communityName} className="w-full h-full object-cover" />
                ) : (
                    <Globe className="text-text-muted-dark group-hover:text-primary transition-colors duration-500" size={32} />
                )}
            </div>
             <div className="min-w-0">
                <h3 className="font-display font-black text-text-dark [html.light_&]:text-text-light text-xl tracking-tight group-hover:text-primary transition-colors">c/{community.communityName}</h3>
                <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light font-medium line-clamp-1 mt-0.5 opacity-80">{community.description || 'A growing community'}</p>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-primary/80 font-black uppercase  bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {community.joinedCount} Members
                    </span>
                </div>
            </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-surface-dark [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-border-light flex items-center justify-center text-text-muted-dark [html.light_&]:text-text-muted-light group-hover:text-primary group-hover:border-primary/50 transition-all shrink-0">
            <Compass size={20} className="group-hover:rotate-45 transition-transform duration-500" />
        </div>
    </Link>
);



const CommunitiesPage = () => {
    document.title = "SocialHive | Communities";
    const { token, user } = useAuth();
    const [joinedPosts, setJoinedPosts] = useState<ComPost[]>([]);
    const [unjoinedPosts, setUnjoinedPosts] = useState<ComPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, _setFilter] = useState<'feed' | 'trending'>('feed');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ComPost[]>([]);
    const [communityResults, setCommunityResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'Communities' | 'Posts'>('Communities');
    const [communityMetadata, setCommunityMetadata] = useState<Record<string, any>>({});
    
    // Mobile Dialog state
    const [isListDialogOpen, setIsListDialogOpen] = useState(false);
    const [listDialogTab, setListDialogTab] = useState<'Browse' | 'Joined'>('Browse');




    const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const endpoint = filter === 'feed' ? '/composts/user-feed' : '/composts';
            const [feedRes, unjoinedRes] = await Promise.all([
                axios.get(`${SERVER_URI}${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${SERVER_URI}/communities/unjoined-communities`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            
            if (filter === 'feed') {
                setJoinedPosts(feedRes.data.joinedPosts || []);
                setUnjoinedPosts(feedRes.data.unjoinedPosts || []);
            } else {
                setJoinedPosts(feedRes.data || []);
                setUnjoinedPosts([]);
            }

            // Map community metadata for quick lookup
            const meta: Record<string, any> = {};
            (unjoinedRes.data.data || []).forEach((c: any) => {
                meta[c._id] = c;
            });
            setCommunityMetadata(meta);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchFeed();
    }, [token, filter]);

    useEffect(() => {
        const handleRefresh = () => fetchFeed();
        window.addEventListener('communityChange', handleRefresh);
        return () => window.removeEventListener('communityChange', handleRefresh);
    }, [token, filter]);

    // Debounced search logic matching SearchPage.tsx
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setCommunityResults([]);
            return;
        }

        const timeout = window.setTimeout(async () => {
            setIsSearching(true);
            try {
                const [postRes, commRes] = await Promise.all([
                    axios.get(`${SERVER_URI}/composts/search?query=${searchQuery}`),
                    axios.get(`${SERVER_URI}/communities/search?query=${searchQuery}`)
                ]);
                setSearchResults(postRes.data.posts || []);
                setCommunityResults(commRes.data.communities || []);
            } catch (err) {
                console.error('Search error:', err);
                setSearchResults([]);
                setCommunityResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchQuery]);

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Search is handled by debounce, but form submit is added for completeness
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const processUnjoinedSections = (unjoined: ComPost[]) => {
        const groups: Record<string, ComPost[]> = {};
        unjoined.forEach(post => {
            const id = post.community?._id || 'unknown';
            if (!groups[id]) groups[id] = [];
            groups[id].push(post);
        });

        const chunks: Record<string, ComPost[][]> = {};
        const ids = Object.keys(groups);
        ids.forEach(id => {
            const posts = groups[id];
            chunks[id] = [];
            for (let i = 0; i < posts.length; i += 3) {
                chunks[id].push(posts.slice(i, i + 3));
            }
        });

        const interleaved: Array<{id: string, name: string, posts: ComPost[]}> = [];
        let maxChunks = Math.max(0, ...ids.map(id => chunks[id].length));

        for (let i = 0; i < maxChunks; i++) {
            ids.forEach(id => {
                if (chunks[id][i]) {
                    interleaved.push({
                        id,
                        name: chunks[id][i][0].community?.communityName || 'Unknown',
                        posts: chunks[id][i]
                    });
                }
            });
        }
        return interleaved;
    };

    const sectionColors = [
        'bg-orange-500/5 [html.light_&]:bg-orange-50/70',
        'bg-blue-500/5 [html.light_&]:bg-blue-50/70',
        'bg-emerald-500/5 [html.light_&]:bg-emerald-50/70',
        'bg-purple-500/5 [html.light_&]:bg-purple-50/70',
    ];



    return (
        <div className="flex flex-col h-screen">
            {/* Sticky Sub-Header */}
            <div className="sticky top-0 z-30 bg-surface-dark/80 backdrop-blur-xl border-b border-border-dark [html.light_&]:bg-surface-light/80 [html.light_&]:border-border-light px-6 py-4">
                <ComSearchBar 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSubmit={handleSearchSubmit}
                />
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="max-w-4xl mx-auto">
                     {searchQuery && (
                        <div className="flex border border-border-dark [html.light_&]:border-border-light mb-8 overflow-x-auto scrollbar-hide rounded-xl bg-surface-elevated-dark/50 [html.light_&]:bg-gray-100/50">
                            <button
                                onClick={() => setActiveTab('Communities')}
                                className={`flex-1 py-3 text-sm font-semibold transition-all ${
                                    activeTab === 'Communities' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'
                                }`}
                            >
                                Communities
                            </button>
                            <button
                                onClick={() => setActiveTab('Posts')}
                                className={`flex-1 py-3 text-sm font-semibold transition-all ${
                                    activeTab === 'Posts' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'
                                }`}
                            >
                                Community Posts
                            </button>
                        </div>
                    )}


                    {isSearching ? (
                        <div className="space-y-6">
                            <ComPostSkeletonLoader />
                            <ComPostSkeletonLoader />
                            <ComPostSkeletonLoader />
                        </div>
                    ) : searchQuery ? (
                        <div className="space-y-6 slide-up">
                            {activeTab === 'Communities' ? (
                                <div className="space-y-4">
                                    {communityResults.length > 0 ? communityResults.map(c => (
                                        <CommunitySearchResultCard key={c._id} community={c} />
                                    )) : (
                                         <div className="text-center py-20 bg-surface-elevated-dark/20 [html.light_&]:bg-gray-50/50 rounded-3xl border border-dashed border-border-dark [html.light_&]:border-border-light">
                                            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light italic font-medium">No communities found matching "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {searchResults.length > 0 ? searchResults.map(post => (
                                        <ComPostCard key={post._id} post={post} />
                                    )) : (
                                         <div className="text-center py-20 bg-surface-elevated-dark/20 [html.light_&]:bg-gray-50/50 rounded-3xl border border-dashed border-border-dark [html.light_&]:border-border-light">
                                            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light italic font-medium">No posts found matching "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : loading ? (
                        <div className="space-y-6">
                            <ComPostSkeletonLoader />
                            <ComPostSkeletonLoader />
                            <ComPostSkeletonLoader />
                            <ComPostSkeletonLoader />
                        </div>
                    ) : (joinedPosts.length > 0 || unjoinedPosts.length > 0) ? (
                        <div className="space-y-8">
                            {/* Joined Feed - Clean List */}
                            {joinedPosts.length > 0 && (
                                <div className="space-y-6">
                                    {joinedPosts.map((post) => (
                                        <ComPostCard key={post._id} post={post} />
                                    ))}
                                </div>
                            )}

                            {/* Unjoined Sections - Interleaved Blocks of 3 */}
                            {unjoinedPosts.length > 0 && processUnjoinedSections(unjoinedPosts).map((section, idx) => (
                                <div 
                                    key={`${section.id}-${idx}`}
                                    className={`rounded-lg p-4 md:p-8 w-full border border-border-dark/30 [html.light_&]:border-border-light shadow-sm transition-all ${sectionColors[idx % sectionColors.length]}`}
                                >
                                    <div className="space-y-6">
                                        {section.posts.map((post) => (
                                            <ComPostCard key={post._id} post={post} />
                                        ))}
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mt-4 md:mt-6 px-2">
                                        <div className="space-y-1 text-center sm:text-left">
                                            <h3 className="text-sm sm:text-base font-bold text-text-dark [html.light_&]:text-text-light flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                                <span>To get similar posts like these join community</span>
                                                <Link to={`/communities/c/${section.name}`} className="text-primary hover:underline font-black">c/{section.name}</Link>
                                            </h3>
                                        </div>
                                        <JoinLeaveButton 
                                            communityName={section.name}
                                            isJoined={false}
                                            isRemoved={user?._id ? communityMetadata[section.id]?.removedMem?.includes(user._id) : false}
                                            isPending={user?._id ? communityMetadata[section.id]?.pendingReq?.includes(user._id) : false}
                                            variant="cta"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="py-12 text-center">
                                <p className="text-[10px] text-text-muted-dark font-black uppercase tracking-[0.2em] opacity-30">End of the feed</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-24 space-y-6">
                            <div className="bg-surface-elevated-dark [html.light_&]:bg-white w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto border border-border-dark [html.light_&]:border-border-light">
                                <Globe size={40} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-text-muted-dark max-w-xs mx-auto">No more Community Posts Found</p>
                            </div>
                        </div>
                    )}


                </div>
            </div>
            
            {/* Mobile Bottom Navigation */}
            <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
                 <div className="bg-surface-dark/90 [html.light_&]:bg-white/90 backdrop-blur-2xl border border-border-dark/50 [html.light_&]:border-border-light rounded-2xl flex items-center p-1 shadow-2xl overflow-hidden ring-1 ring-white/5 [html.light_&]:ring-black/5">
                    <button 
                        onClick={() => {
                            setListDialogTab('Browse');
                            setIsListDialogOpen(true);
                        }}
                        className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-primary transition-colors"
                    >
                        Browse Communities
                    </button>
                    <div className="w-[1px] h-4 bg-border-dark/50 [html.light_&]:bg-border-light" />
                    <button 
                        onClick={() => {
                            setListDialogTab('Joined');
                            setIsListDialogOpen(true);
                        }}
                        className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-primary transition-colors"
                    >
                        Joined Communities
                    </button>
                </div>
            </div>

            {/* Hidden Dialog for Mobile Community Lists */}
            <CommunityListDialog 
                open={isListDialogOpen}
                onOpenChange={setIsListDialogOpen}
                initialTab={listDialogTab}
            />

        </div>
    );
};


export default CommunitiesPage;

