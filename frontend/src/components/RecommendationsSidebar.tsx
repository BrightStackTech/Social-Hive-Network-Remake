import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAccountsToFollow } from '../api/index';
import FollowButton from './FollowButton';

export default function RecommendationsSidebar() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await getAccountsToFollow();
      setRecommendations(res.data.data);
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-dark/50 [html.light_&]:bg-surface-light/50">
      {/* Title - Matches Chats.tsx Heading */}
      <div className="p-4 border-b border-border-dark [html.light_&]:border-border-light">
        <h1 className="text-xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          Accounts to follow
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex flex-col gap-1 p-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5"></div>
                    <div className="flex flex-col gap-2">
                        <div className="h-3 w-20 bg-white/5 rounded"></div>
                        <div className="h-2 w-28 bg-white/5 rounded"></div>
                    </div>
                </div>
                <div className="w-16 h-8 bg-white/5 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div 
              key={rec._id} 
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group hover:bg-surface-elevated-dark/50 [html.light_&]:hover:bg-surface-elevated-light/50 border border-transparent"
            >
              <Link to={`/profile/${rec.username}`} className="relative shrink-0 no-underline">
                <img 
                  src={rec.profilePicture || `https://ui-avatars.com/api/?name=${rec.username}&background=4361ee&color=fff&size=48`} 
                  alt={rec.username} 
                  className="w-12 h-12 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light group-hover:border-primary/50 transition-colors"
                />
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${rec.username}`} className="no-underline block group-hover:translate-x-0.5 transition-transform">
                  <h3 className="text-[15px] font-bold text-text-dark [html.light_&]:text-text-light truncate mb-0.5 group-hover:text-primary transition-colors">
                    {rec.username}
                  </h3>
                  <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate max-w-[120px]">
                    {rec.college || 'Hive Member'}
                  </p>
                </Link>
              </div>

              <FollowButton 
                userIdToFollow={rec._id} 
                className="!px-4 !py-1.5 !text-[11px] !bg-primary !text-white !rounded-full font-bold hover:!bg-primary-light transition-all shadow-lg shadow-primary/20 shrink-0" 
                callback={fetchRecommendations} 
              />
            </div>
          ))
        ) : (
          <div className="text-center p-8 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
             No suggestions currently...
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border-dark [html.light_&]:border-border-light">
         <Link to="/search" className="text-xs text-primary font-bold underline uppercase ">
            Find a specific user?
         </Link>
      </div>
    </div>
  );
}
