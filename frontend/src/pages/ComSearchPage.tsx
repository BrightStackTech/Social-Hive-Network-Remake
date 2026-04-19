import { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Users, Loader2, ArrowLeft, User, Compass } from "lucide-react";
import ComSearchBar from "../components/communities/ComSearchBar";
import { searchCommunity, searchComPosts } from "../api/index";
import { Button } from "../components/ui/Button";

const ComSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [communityResults, setCommunityResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchPerformed(true);
    try {
      const [comRes, postRes] = await Promise.all([
        searchCommunity({ query: searchQuery }),
        searchComPosts({ query: searchQuery })
      ]);
      setCommunityResults(comRes.data.communities || []);
      setPostResults(postRes.data.posts || []);
    } catch (error) {
       console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-border-dark [html.light_&]:border-border-light bg-surface-dark/50 backdrop-blur-md">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/communities">
             <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft size={20} />
             </Button>
          </Link>
          <div>
            <h1 className="text-xl font-display font-black text-text-dark">COMMUNITY SEARCH</h1>
            <p className="text-[10px] text-text-muted-dark font-bold  leading-none">Find the best content in the network</p>
          </div>
        </div>

        <ComSearchBar
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmit={handleSearchSubmit}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
          
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-sm text-text-muted-dark font-bold">Searching the network...</p>
            </div>
          ) : !searchPerformed ? (
            <div className="text-center py-20 bg-surface-elevated-dark/30 rounded-3xl border border-dashed border-border-dark">
               <Compass className="text-text-muted-dark opacity-20 mx-auto" size={48} />
               <h3 className="mt-4 text-sm font-black text-text-muted-dark  uppercase">Start exploring</h3>
               <p className="text-xs text-text-muted-dark mt-1">Search for communities or topics you're interested in.</p>
            </div>
          ) : (
            <>
              {/* Communities Results */}
              <section className="space-y-4">
                <h2 className="text-[10px] font-black tracking-[0.2em] text-text-muted-dark uppercase px-2">COMMUNITIES ({communityResults.length})</h2>
                {communityResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {communityResults.map((c: any) => (
                      <Link 
                        key={c._id} 
                        to={`/communities/c/${c.communityName}`}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-surface-dark border border-border-dark hover:border-primary/50 transition-all no-underline group"
                      >
                         <div className="w-12 h-12 rounded-xl bg-surface-elevated-dark border border-border-dark flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            {c.profilePicture ? (
                              <img src={c.profilePicture} className="w-full h-full object-cover" />
                            ) : (
                              <Globe className="text-text-muted-dark" size={24} />
                            )}
                         </div>
                         <div className="min-w-0">
                           <h4 className="text-sm font-bold text-text-dark group-hover:text-primary transition-colors">c/{c.communityName}</h4>
                           <p className="text-[10px] text-text-muted-dark flex items-center gap-1 font-bold"><Users size={12} /> {c.joinedCount} members joined</p>
                         </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted-dark px-2 italic">No communities matched your search.</p>
                )}
              </section>

              {/* Posts Results */}
              <section className="space-y-4">
                 <h2 className="text-[10px] font-black tracking-[0.2em] text-text-muted-dark uppercase px-2">POSTS ({postResults.length})</h2>
                 {postResults.length > 0 ? (
                    <div className="space-y-3">
                      {postResults.map((p: any) => (
                        <Link 
                          key={p._id} 
                          to={`/compost/${p._id}`}
                          className="block p-4 rounded-2xl bg-surface-dark border border-border-dark hover:bg-surface-elevated-dark transition-all no-underline group"
                        >
                          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-text-muted-dark">
                             <Globe size={12} className="text-primary" />
                             <span>c/{p.community?.communityName}</span>
                             <span>•</span>
                             <User size={12} />
                             <span>@{p.author?.username}</span>
                          </div>
                          <h4 className="text-base font-bold text-text-dark group-hover:text-primary transition-colors mb-1 truncate">{p.title}</h4>
                          <p className="text-xs text-text-muted-dark line-clamp-2">{p.description}</p>
                        </Link>
                      ))}
                    </div>
                 ) : (
                  <p className="text-xs text-text-muted-dark px-2 italic">No posts found for this query.</p>
                 )}
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ComSearchPage;
