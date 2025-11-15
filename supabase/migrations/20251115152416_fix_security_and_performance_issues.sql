/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses critical security and performance issues identified by Supabase:
  1. Adds missing indexes on foreign keys for optimal query performance
  2. Optimizes RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  3. Fixes function search paths to be immutable
  4. Removes unused indexes to reduce overhead

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Creates indexes on all foreign keys that were missing covering indexes:
  - conversations.user1_id and user2_id
  - messages.sender_id
  - notifications.actor_id, post_id, comment_id

  ### 2. Optimize RLS Policies
  Replaces all `auth.uid()` calls with `(select auth.uid())` to prevent
  re-evaluation for each row, significantly improving performance at scale.

  ### 3. Fix Function Search Paths
  Updates database functions to have immutable search paths for security.

  ### 4. Remove Unused Indexes
  Drops indexes that have not been used to reduce maintenance overhead.

  ## Security Notes
  - All changes maintain existing security guarantees
  - Performance improvements do not weaken security posture
  - Function search paths are now protected against manipulation
*/

-- Add missing indexes on foreign keys for conversations
CREATE INDEX IF NOT EXISTS conversations_user1_id_idx ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS conversations_user2_id_idx ON conversations(user2_id);

-- Add missing index on messages.sender_id
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);

-- Add missing indexes on notifications foreign keys
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS notifications_post_id_idx ON notifications(post_id);
CREATE INDEX IF NOT EXISTS notifications_comment_id_idx ON notifications(comment_id);

-- Drop unused indexes
DROP INDEX IF EXISTS likes_user_id_idx;
DROP INDEX IF EXISTS comments_user_id_idx;
DROP INDEX IF EXISTS messages_conversation_id_idx;
DROP INDEX IF EXISTS messages_created_at_idx;
DROP INDEX IF EXISTS notifications_created_at_idx;

-- Drop existing RLS policies to recreate them with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users can create their own follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Recreate RLS policies with optimized auth.uid() calls

-- Profiles policies
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Posts policies
CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Likes policies
CREATE POLICY "Users can create their own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Comments policies
CREATE POLICY "Users can create their own comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Follows policies
CREATE POLICY "Users can create their own follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = follower_id);

CREATE POLICY "Users can delete their own follows"
  ON follows FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = follower_id);

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id)
  WITH CHECK ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = (select auth.uid()) OR conversations.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.user1_id = (select auth.uid()) OR conversations.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = (select auth.uid()) OR conversations.user2_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = (select auth.uid()) OR conversations.user2_id = (select auth.uid()))
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = actor_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix function search paths by dropping and recreating with CASCADE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for update_updated_at_column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix update_conversation_last_message function
DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE;
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger for update_conversation_last_message
CREATE TRIGGER update_conversation_timestamp AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();