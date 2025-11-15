import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft, Plus, X } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  other_user?: Profile;
  unread_count?: number;
};
type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles: Profile;
};

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (data) {
      const conversationsWithUsers = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

          const { data: otherUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .maybeSingle();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: otherUser,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithUsers);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id);

    if (!error) {
      loadConversations();
      window.dispatchEvent(new Event('refreshCounters'));
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const subscription = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          loadMessages(conversationId);
          markMessagesAsRead(conversationId);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      loadMessages(selectedConversation.id);
      loadConversations();

      const recipientId = selectedConversation.user1_id === user.id
        ? selectedConversation.user2_id
        : selectedConversation.user1_id;

      await supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: user.id,
        type: 'message',
      });
    }

    setLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id || '')
      .ilike('username', `%${query}%`)
      .limit(10);

    setSearchResults(data || []);
  };

  const startConversation = async (otherUser: Profile) => {
    if (!user) return;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUser.id}),and(user1_id.eq.${otherUser.id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existingConv) {
      const conversationWithUser = {
        ...existingConv,
        other_user: otherUser,
        unread_count: 0,
      };
      setSelectedConversation(conversationWithUser);
      setShowNewConversation(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: otherUser.id,
        })
        .select()
        .single();

      if (newConv) {
        const conversationWithUser = {
          ...newConv,
          other_user: otherUser,
          unread_count: 0,
        };
        setSelectedConversation(conversationWithUser);
        setShowNewConversation(false);
        setSearchQuery('');
        setSearchResults([]);
        loadConversations();
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex gap-4 p-4">
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 bg-white rounded-lg shadow-sm flex flex-col`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          <button
            onClick={() => setShowNewConversation(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="New conversation"
          >
            <Plus className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{
                      backgroundImage: conv.other_user?.avatar_url ? `url(${conv.other_user.avatar_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!conv.other_user?.avatar_url && conv.other_user?.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 truncate">
                        {conv.other_user?.full_name || conv.other_user?.username}
                      </p>
                      {conv.unread_count! > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{conv.other_user?.username}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 bg-white rounded-lg shadow-sm flex-col`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white"
                style={{
                  backgroundImage: selectedConversation.other_user?.avatar_url
                    ? `url(${selectedConversation.other_user.avatar_url})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!selectedConversation.other_user?.avatar_url &&
                  selectedConversation.other_user?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedConversation.other_user?.full_name || selectedConversation.other_user?.username}
                </p>
                <p className="text-sm text-gray-600">@{selectedConversation.other_user?.username}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isMine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${isMine ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={2000}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">New Message</h3>
              <button
                onClick={() => {
                  setShowNewConversation(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search users..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
              <div className="mt-4 max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startConversation(user)}
                      className="w-full p-3 hover:bg-gray-50 rounded-lg transition text-left flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{
                          backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                      </div>
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                ) : (
                  <p className="text-center text-gray-500 py-8">Search for users to start a conversation</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
