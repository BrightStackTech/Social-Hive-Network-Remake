import { useState, useEffect } from 'react';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchUsers, searchPosts } from '../api/index';
import OthersPostCard from '../components/posts/OthersPostCard';
import { type Post } from '../components/posts/PostCard';

interface UserSearchResult {
  _id: string;
  username: string;
  profilePicture: string;
  college: string;
  engineeringDomain: string;
}

type SearchResult = UserSearchResult | Post;

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Users' | 'Posts'>('Users');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        if (activeTab === 'Users') {
          const res = await searchUsers(query.trim());
          setResults(res.data.users);
        } else {
          const res = await searchPosts(query.trim());
          setResults(res.data.posts);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, activeTab]);

  const isPost = (result: SearchResult): result is Post => {
    return (result as Post).content !== undefined;
  };

  return (
    <div className="px-4 py-6">
      {/* Search Bar */}
      <div className="relative max-w-3xl mx-auto">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2
                     text-text-muted-dark [html.light_&]:text-text-muted-light"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === 'Users' ? 'Search for a user' : 'Search for posts'}
          className="w-full pl-11 pr-12 py-4 rounded-full text-sm
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all duration-200 shadow-xl"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full
                     bg-primary text-white hover:bg-primary-light transition-all cursor-pointer shadow-lg"
          aria-label="Search"
        >
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 max-w-3xl mx-auto flex p-1 rounded-2xl
                       bg-surface-elevated-dark/30 [html.light_&]:bg-gray-100/50 
                       border border-border-dark [html.light_&]:border-gray-200 shadow-inner">
        <button
          onClick={() => setActiveTab('Users')}
          className={`flex-1 py-3 text-sm font-bold text-center transition-all duration-300 rounded-xl cursor-pointer
                     ${activeTab === 'Users'
                       ? 'bg-primary text-white shadow-lg transform scale-[1.02]'
                       : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary hover:bg-primary/5'
                     }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('Posts')}
          className={`flex-1 py-3 text-sm font-bold text-center transition-all duration-300 rounded-xl cursor-pointer
                     ${activeTab === 'Posts'
                       ? 'bg-primary text-white shadow-lg transform scale-[1.02]'
                       : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary hover:bg-primary/5'
                     }`}
        >
          Posts
        </button>
      </div>

      {/* Results */}
      <div className="mt-8 max-w-3xl mx-auto">
        {loading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto shadow-sm" />
            <p className="mt-4 text-xs text-text-muted-dark animate-pulse">Searching...</p>
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="text-center py-20 bg-surface-elevated-dark/20 [html.light_&]:bg-gray-50/50 rounded-3xl border border-dashed border-border-dark">
            <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">
              No {activeTab.toLowerCase()} found for "<span className="text-text-dark [html.light_&]:text-text-light font-bold">{query}</span>"
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className={`${activeTab === 'Users' ? 'space-y-2' : 'space-y-6'}`}>
            {results.map((result) => {
              if (activeTab === 'Users' && !isPost(result)) {
                return (
                  <Link
                    key={result._id}
                    to={`/profile/${result.username}`}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl
                               bg-surface-elevated-dark/40 [html.light_&]:bg-white
                               border border-border-dark [html.light_&]:border-gray-100
                               hover:border-primary/50 hover:bg-primary/5
                               transition-all duration-300 no-underline group shadow-sm hover:shadow-md"
                  >
                    <img
                      src={result.profilePicture || `https://ui-avatars.com/api/?name=${result.username}&background=4361ee&color=fff&size=56`}
                      alt={result.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border-dark group-hover:border-primary transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-text-dark [html.light_&]:text-text-light truncate">
                        {result.username}
                      </p>
                      {result.college && (
                        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate mt-1">
                          {result.college}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-text-muted-dark group-hover:text-primary group-hover:translate-x-1 transition-all"
                    />
                  </Link>
                );
              } else if (activeTab === 'Posts' && isPost(result)) {
                return (
                  <OthersPostCard key={result._id} post={result} />
                );
              }
              return null;
            })}
          </div>
        )}

        {!loading && !query.trim() && (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <SearchIcon
                size={40}
                className="text-primary opacity-50"
              />
            </div>
            <p className="text-text-muted-dark [html.light_&]:text-text-muted-light font-medium">
              Search for {activeTab.toLowerCase()} by {activeTab === 'Users' ? 'username' : 'title or content'}
            </p>
            <p className="mt-2 text-xs text-text-muted-dark/60">Discover the people and conversations across Social Hive</p>
          </div>
        )}
      </div>
    </div>
  );
}
