import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Image, X } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMediaInput, setShowMediaInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      media_urls: mediaUrls,
    });

    if (!error) {
      setContent('');
      setMediaUrls([]);
      setMediaInput('');
      setShowMediaInput(false);
      onPostCreated();
    }

    setLoading(false);
  };

  const addMediaUrl = () => {
    if (mediaInput.trim() && mediaUrls.length < 4) {
      setMediaUrls([...mediaUrls, mediaInput.trim()]);
      setMediaInput('');
    }
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  if (!user) return null;

  const username = profile?.username || user.email?.split('@')[0] || 'user';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div
            className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{
              backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              maxLength={5000}
              className="w-full px-0 py-2 text-lg border-0 focus:ring-0 outline-none resize-none"
            />

            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-40 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(index)}
                      className="absolute top-2 right-2 p-1 bg-gray-900 bg-opacity-75 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showMediaInput && (
              <div className="mt-3 flex gap-2">
                <input
                  type="url"
                  value={mediaInput}
                  onChange={(e) => setMediaInput(e.target.value)}
                  placeholder="Paste image URL"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMediaUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addMediaUrl}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Add
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                disabled={mediaUrls.length >= 4}
              >
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">Add Photo</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {content.length}/5000
                </span>
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
