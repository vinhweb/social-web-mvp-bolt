import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Home, Search, Bell, MessageCircle, User, LogOut, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadUnreadCounts();
      subscribeToNotifications();
      subscribeToMessages();

      const handleFocus = () => {
        loadUnreadCounts();
      };

      const handleCounterRefresh = () => {
        loadUnreadCounts();
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('refreshCounters', handleCounterRefresh);

      const interval = setInterval(() => {
        loadUnreadCounts();
      }, 10000);

      return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('refreshCounters', handleCounterRefresh);
        clearInterval(interval);
      };
    }
  }, [user]);

  const loadUnreadCounts = async () => {
    if (!user) return;

    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadNotifications(notifCount || 0);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (conversations) {
      const conversationIds = conversations.map(c => c.id);
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnreadMessages(msgCount || 0);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const subscription = supabase
      .channel('notification_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          loadUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToMessages = () => {
    if (!user) return;

    const subscription = supabase
      .channel('message_count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (!user) {
    return <>{children}</>;
  }

  const currentPath = window.location.pathname;
  const username = profile?.username || user.email?.split('@')[0] || 'user';
  const displayName = profile?.full_name || username;

  const handleNavClick = (href: string) => {
    if (href === '/notifications') {
      setUnreadNotifications(0);
    } else if (href === '/messages') {
      setUnreadMessages(0);
    }
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Home', active: currentPath === '/' },
    { href: '/explore', icon: Search, label: 'Explore', active: currentPath === '/explore' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications, active: currentPath === '/notifications' },
    { href: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages, active: currentPath === '/messages' },
    { href: `/profile/${username}`, icon: User, label: 'Profile', active: currentPath === `/profile/${username}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b-2 border-gray-300 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <a href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition">
                Social
              </a>

              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`relative px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      item.active
                        ? 'text-blue-600 bg-blue-50 shadow-sm'
                        : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition border border-transparent hover:border-gray-200"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-sm"
                    style={{
                      backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {username.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <a
                      href={`/profile/${username}`}
                      className="block px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      <p className="font-semibold">{displayName}</p>
                      <p className="text-sm text-gray-500">@{username}</p>
                    </a>
                    <hr className="my-2" />
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-800"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="px-4 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                    item.active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </a>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main>
        {children}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`relative flex flex-col items-center gap-1 p-2 ${
                item.active ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <item.icon className="w-6 h-6" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge > 9 ? '9' : item.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
