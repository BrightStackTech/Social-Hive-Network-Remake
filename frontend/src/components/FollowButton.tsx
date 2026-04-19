import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { followUser, unfollowUser } from '../api/index';
import { toast } from 'react-hot-toast';

interface FollowButtonProps {
  userIdToFollow: string;
  className?: string;
  callback?: () => void;
}

export default function FollowButton({ userIdToFollow, className, callback }: FollowButtonProps) {
  const { user, updateUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.following) {
      setIsFollowing(user.following.includes(userIdToFollow));
    }
  }, [user, userIdToFollow]);

  const handleToggleFollow = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userIdToFollow);
        const updatedFollowing = user.following.filter((id: string) => id !== userIdToFollow);
        updateUser({ ...user, following: updatedFollowing });
        toast.success('Unfollowed');
      } else {
        await followUser(userIdToFollow);
        const updatedFollowing = [...user.following, userIdToFollow];
        updateUser({ ...user, following: updatedFollowing });
        toast.success('Following');
      }
      if (callback) callback();
    } catch (error) {
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  if (user?._id === userIdToFollow) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleToggleFollow();
      }}
      disabled={loading}
      className={`rounded-full px-6 py-2 font-bold transition-all duration-300 cursor-pointer text-[16px] shrink-0
                  ${isFollowing 
                    ? '[html.light_&]:bg-[#f0f2f5] [html.light_&]:text-[#050505] bg-[#3a3b3c] text-white hover:opacity-80' 
                    : 'bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/20'} 
                  ${className}`}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
