import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'] & {
  actor: Profile;
  post?: { content: string };
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      markAllAsRead();
      subscribeToNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(*),
        post:posts(content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      window.dispatchEvent(new Event('refreshCounters'));
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-600 fill-current" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-600" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-600" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.full_name || notification.actor.username;

    switch (notification.type) {
      case 'like':
        return (
          <>
            <span className="font-semibold">{actorName}</span> liked your post
            {notification.post && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                "{notification.post.content}"
              </p>
            )}
          </>
        );
      case 'comment':
        return (
          <>
            <span className="font-semibold">{actorName}</span> commented on your post
            {notification.post && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                "{notification.post.content}"
              </p>
            )}
          </>
        );
      case 'follow':
        return <><span className="font-semibold">{actorName}</span> started following you</>;
      case 'message':
        return <><span className="font-semibold">{actorName}</span> sent you a message</>;
      default:
        return <><span className="font-semibold">{actorName}</span> interacted with you</>;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
        return `/profile/${notification.actor.username}`;
      case 'message':
        return '/messages';
      default:
        return `/profile/${notification.actor.username}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 flex gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <a
              key={notification.id}
              href={getNotificationLink(notification)}
              className={`block bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition ${
                !notification.is_read ? 'border-l-4 border-blue-600' : ''
              }`}
            >
              <div className="flex gap-3">
                <div
                  className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{
                    backgroundImage: notification.actor.avatar_url
                      ? `url(${notification.actor.avatar_url})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!notification.actor.avatar_url && notification.actor.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-gray-900">{getNotificationText(notification)}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(notification.created_at)}</p>
                    </div>
                    <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
