import { useState, useEffect } from 'react';
import { Search, Radio, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ChannelSearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { api } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResult(null);
      setSearched(false);
      return;
    }

    const timeout = setTimeout(() => {
      handleSearch(trimmed);
    }, 600);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async (id: string) => {
    // Only search if it looks like a MongoDB ObjectId (24 chars)
    if (id.length < 24) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await api.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${id}`);
      setResult(res.data.channel);
    } catch (error) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-display font-bold text-text-dark [html.light_&]:text-text-light mb-4">
        Search Channels
      </h3>

      {/* Search using ID */}
      <div className="relative group">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2
                     text-text-muted-dark [html.light_&]:text-text-muted-light
                     group-focus-within:text-primary transition-colors"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search using Channel ID"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs
                     bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                     border border-border-dark [html.light_&]:border-border-light
                     text-text-dark [html.light_&]:text-text-light
                     placeholder:text-text-muted-dark/40
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
                     transition-all duration-200"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
          </div>
        ) : searched ? (
          result ? (
            <div className="p-4 rounded-2xl glass-dark [html.light_&]:glass-light 
                            border border-border-dark [html.light_&]:border-border-light
                            animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Radio size={20} />
                  </div>
                   <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text-dark [html.light_&]:text-text-light truncate">
                      {result.name}
                    </h4>
                    <p className="text-[10px] text-text-muted-dark font-medium">
                      {result.members?.length || 0} members
                    </p>
                  </div>
               </div>
               <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-2 mb-4 leading-relaxed">
                 {result.description}
               </p>
                <button 
                  onClick={() => navigate(`/channels/${result._id}`)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold
                                   hover:bg-primary-light transition-all shadow-lg shadow-primary/20
                                   active:scale-[0.98] cursor-pointer">
                  View Channel
                </button>
            </div>
          ) : (
            <div className="text-center py-8 bg-surface-elevated-dark/20 [html.light_&]:bg-black/[0.02] rounded-2xl border border-dashed border-border-dark/50">
               <Info size={20} className="mx-auto text-text-muted-dark/30 mb-2" />
               <p className="text-[11px] text-text-muted-dark [html.light_&]:text-text-muted-light font-medium">
                 No channel found with this ID
               </p>
            </div>
          )
        ) : (
          <div className="px-2 py-4">
             <p className="text-[11px] text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed">
               Enter a unique Channel ID to quickly find and join a specific broadcast.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
