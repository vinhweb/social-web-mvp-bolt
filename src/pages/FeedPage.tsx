import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import { Users } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFeed();
      subscribeToNewPosts();
    }
  }, [user]);

  const loadFeed = async () => {
    if (!user) return;

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const userIds = [user.id, ...followingIds];

    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        likes(user_id),
        comments(id)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    setPosts(postsData || []);
    setLoading(false);
  };

  const subscribeToNewPosts = () => {
    const subscription = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <CreatePost onPostCreated={loadFeed} />

      <div className="space-y-4 mt-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your feed is empty</h3>
            <p className="text-gray-600 mb-4">Follow other users to see their posts here</p>
            <a
              href="/explore"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Explore Users
            </a>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} onUpdate={loadFeed} />)
        )}
      </div>
    </div>
  );
}
