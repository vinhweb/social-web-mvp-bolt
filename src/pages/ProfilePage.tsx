import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Link as LinkIcon, Edit3, Users } from 'lucide-react';
import type { Database } from '../lib/database.types';
import PostCard from '../components/PostCard';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

interface ProfilePageProps {
  username?: string;
}

export default function ProfilePage({ username }: ProfilePageProps) {
  const { user, profile: currentUserProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = !username || username === currentUserProfile?.username;
  const targetUsername = username || currentUserProfile?.username;

  useEffect(() => {
    if (targetUsername) {
      loadProfile();
    }
  }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', targetUsername)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          likes(user_id),
          comments(id)
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);

      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id);

      setFollowersCount(followersCount || 0);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      setFollowingCount(followingCount || 0);

      if (user && !isOwnProfile) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    }

    setLoading(false);
  };

  const loadPosts = async () => {
    if (!profile) return;

    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        likes(user_id),
        comments(id)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    setPosts(postsData || []);
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);

      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);

      await supabase.from('notifications').delete()
        .eq('user_id', profile.id)
        .eq('actor_id', user.id)
        .eq('type', 'follow');
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: profile.id,
        });

      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);

      await supabase.from('notifications').insert({
        user_id: profile.id,
        actor_id: user.id,
        type: 'follow',
      });
    }

    setFollowLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div
          className="h-48 bg-gradient-to-r from-blue-400 to-teal-400"
          style={{
            backgroundImage: profile.cover_photo_url ? `url(${profile.cover_photo_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div
              className="w-32 h-32 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center text-4xl font-bold text-white"
              style={{
                backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!profile.avatar_url && profile.username.charAt(0).toUpperCase()}
            </div>

            {isOwnProfile ? (
              <a
                href="/profile/edit"
                className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </a>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`mt-4 px-6 py-2 rounded-lg text-sm font-medium transition ${
                  isFollowing
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || profile.username}</h1>
            <p className="text-gray-600">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="text-gray-800 mb-4">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </div>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {formatDate(profile.created_at)}
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold text-gray-900">{followingCount}</span>
              <span className="text-gray-600 ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">{followersCount}</span>
              <span className="text-gray-600 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">{posts.length}</span>
              <span className="text-gray-600 ml-1">Posts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} onUpdate={loadPosts} />)
        )}
      </div>
    </div>
  );
}
