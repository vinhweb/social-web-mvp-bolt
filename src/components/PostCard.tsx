import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
import type { Database } from '../lib/database.types';
import CommentSection from './CommentSection';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [likeLoading, setLikeLoading] = useState(false);

  const isLiked = user ? post.likes.some(like => like.user_id === user.id) : false;
  const isOwner = user?.id === post.user_id;

  const handleLike = async () => {
    if (!user || likeLoading) return;

    setLikeLoading(true);

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);

      await supabase.from('notifications').delete()
        .eq('user_id', post.user_id)
        .eq('actor_id', user.id)
        .eq('post_id', post.id)
        .eq('type', 'like');
    } else {
      await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          post_id: post.id,
        });

      if (user.id !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          post_id: post.id,
        });
      }
    }

    setLikeLoading(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    await supabase.from('posts').delete().eq('id', post.id);
    onUpdate();
  };

  const handleEdit = async () => {
    if (!editedContent.trim()) return;

    await supabase
      .from('posts')
      .update({
        content: editedContent.trim(),
        is_edited: true,
      })
      .eq('id', post.id);

    setIsEditing(false);
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <a href={`/profile/${post.profiles.username}`} className="flex items-center gap-3 hover:opacity-80 transition">
          <div
            className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white"
            style={{
              backgroundImage: post.profiles.avatar_url ? `url(${post.profiles.avatar_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!post.profiles.avatar_url && post.profiles.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {post.profiles.full_name || post.profiles.username}
            </p>
            <p className="text-sm text-gray-600">
              @{post.profiles.username} · {formatDate(post.created_at)}
              {post.is_edited && ' · Edited'}
            </p>
          </div>
        </a>

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            rows={4}
            maxLength={5000}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedContent(post.content);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      )}

      {post.media_urls && post.media_urls.length > 0 && (
        <div className={`mb-4 grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.media_urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt=""
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: post.media_urls.length === 1 ? '500px' : '300px' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`flex items-center gap-2 ${
            isLiked ? 'text-red-600' : 'text-gray-600'
          } hover:text-red-600 transition group`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''} group-hover:scale-110 transition`} />
          <span className="text-sm font-medium">{post.likes.length}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition group"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="text-sm font-medium">{post.comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <CommentSection postId={post.id} postOwnerId={post.user_id} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}
