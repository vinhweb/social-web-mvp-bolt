export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          bio: string
          avatar_url: string
          cover_photo_url: string
          location: string
          website: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string
          bio?: string
          avatar_url?: string
          cover_photo_url?: string
          location?: string
          website?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          bio?: string
          avatar_url?: string
          cover_photo_url?: string
          location?: string
          website?: string
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          media_urls: string[]
          created_at: string
          updated_at: string
          is_edited: boolean
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: string[]
          created_at?: string
          updated_at?: string
          is_edited?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: string[]
          created_at?: string
          updated_at?: string
          is_edited?: boolean
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          parent_id: string | null
          content: string
          created_at: string
          updated_at: string
          is_edited: boolean
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          parent_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          parent_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          last_message_at?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment' | 'mention' | 'message'
          post_id: string | null
          comment_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment' | 'mention' | 'message'
          post_id?: string | null
          comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string
          type?: 'follow' | 'like' | 'comment' | 'mention' | 'message'
          post_id?: string | null
          comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}
