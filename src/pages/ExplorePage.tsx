import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search as SearchIcon, Users, TrendingUp } from 'lucide-react';
import type { Database } from '../lib/database.types';
import PostCard from '../components/PostCard';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  followers_count?: number;
  is_following?: boolean;
};
type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      loadSuggestedUsers();
      loadTrendingPosts();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSuggestedUsers = async () => {
    if (!user) return;

    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.following_id) || [];

    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .not('id', 'in', `(${followingIds.join(',') || 'null'})`)
      .limit(5);

    if (users) {
      const usersWithCounts = await Promise.all(
        users.map(async (u) => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', u.id);

          return { ...u, followers_count: count || 0, is_following: false };
        })
      );

      setSuggestedUsers(usersWithCounts.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0)));
    }

    setLoading(false);
  };

  const loadTrendingPosts = async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        likes(user_id),
        comments(id)
      `)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const sorted = data.sort((a, b) => {
        const scoreA = (a.likes?.length || 0) * 2 + (a.comments?.length || 0);
        const scoreB = (b.likes?.length || 0) * 2 + (b.comments?.length || 0);
        return scoreB - scoreA;
      });

      setTrendingPosts(sorted);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .neq('id', user?.id || '')
      .limit(10);

    if (users) {
      const usersWithFollowStatus = await Promise.all(
        users.map(async (u) => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', u.id);

          let isFollowing = false;
          if (user) {
            const { data } = await supabase
              .from('follows')
              .select('*')
              .eq('follower_id', user.id)
              .eq('following_id', u.id)
              .maybeSingle();

            isFollowing = !!data;
          }

          return { ...u, followers_count: count || 0, is_following: isFollowing };
        })
      );

      setSearchResults(usersWithFollowStatus);
    }

    setSearching(false);
  };

  const handleFollow = async (profileId: string, isFollowing: boolean) => {
    if (!user) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId);

      await supabase.from('notifications').delete()
        .eq('user_id', profileId)
        .eq('actor_id', user.id)
        .eq('type', 'follow');
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: profileId,
        });

      await supabase.from('notifications').insert({
        user_id: profileId,
        actor_id: user.id,
        type: 'follow',
      });
    }

    if (searchQuery.trim()) {
      handleSearch();
    } else {
      loadSuggestedUsers();
    }
  };

  const UserCard = ({ user: profile }: { user: Profile }) => (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition">
      <a href={`/profile/${profile.username}`}>
        <div
          className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white"
          style={{
            backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
        </div>
      </a>
      <div className="flex-1 min-w-0">
        <a href={`/profile/${profile.username}`} className="hover:underline">
          <p className="font-semibold text-gray-900 truncate">
            {profile.full_name || profile.username}
          </p>
          <p className="text-sm text-gray-600 truncate">@{profile.username}</p>
        </a>
        {profile.followers_count !== undefined && (
          <p className="text-xs text-gray-500">{profile.followers_count} followers</p>
        )}
      </div>
      <button
        onClick={() => handleFollow(profile.id, profile.is_following || false)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          profile.is_following
            ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {profile.is_following ? 'Following' : 'Follow'}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            Search Results
          </h2>
          <div className="space-y-3">
            {searchResults.map((profile) => (
              <UserCard key={profile.id} user={profile} />
            ))}
          </div>
        </div>
      ) : searchQuery.trim() ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center mb-8">
          <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No users found</p>
        </div>
      ) : null}

      {!searchQuery.trim() && suggestedUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Suggested Users
          </h2>
          <div className="space-y-3">
            {suggestedUsers.map((profile) => (
              <UserCard key={profile.id} user={profile} />
            ))}
          </div>
        </div>
      )}

      {!searchQuery.trim() && trendingPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Posts
          </h2>
          <div className="space-y-4">
            {trendingPosts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={loadTrendingPosts} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
