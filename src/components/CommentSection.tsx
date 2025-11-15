import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Profile;
};

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
  onUpdate: () => void;
}

export default function CommentSection({ postId, postOwnerId, onUpdate }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(*)
      `)
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    setComments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      post_id: postId,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      await loadComments();
      onUpdate();

      if (user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          actor_id: user.id,
          type: 'comment',
          post_id: postId,
        });
      }
    }

    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    await supabase.from('comments').delete().eq('id', commentId);
    await loadComments();
    onUpdate();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <a href={`/profile/${comment.profiles.username}`}>
              <div
                className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{
                  backgroundImage: comment.profiles.avatar_url ? `url(${comment.profiles.avatar_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!comment.profiles.avatar_url && comment.profiles.username.charAt(0).toUpperCase()}
              </div>
            </a>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 relative">
              {user?.id === comment.user_id && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setShowMenuId(showMenuId === comment.id ? null : comment.id)}
                    className="p-1 hover:bg-gray-200 rounded transition"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>

                  {showMenuId === comment.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleDelete(comment.id);
                          setShowMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600 text-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              <a href={`/profile/${comment.profiles.username}`} className="hover:underline">
                <p className="font-semibold text-sm text-gray-900">
                  {comment.profiles.full_name || comment.profiles.username}
                </p>
              </a>
              <p className="text-sm text-gray-800 mt-1 break-words">{comment.content}</p>
              <p className="text-xs text-gray-500 mt-2">{formatDate(comment.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{
              backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {(profile?.username || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
