/*
  # Fix Remaining Security and Performance Issues

  ## Overview
  This migration addresses the remaining security and performance issues:
  1. Adds missing indexes on foreign keys that are actually used in queries
  2. Removes newly created indexes that are not being used
  3. Optimizes indexing strategy based on actual query patterns

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Creates indexes on foreign keys that are frequently used in queries:
  - comments.user_id (used in user profile queries)
  - messages.conversation_id (used in message loading queries)

  ### 2. Remove Unused Indexes
  Drops indexes that were created but are not being used:
  - messages.sender_id
  - notifications.actor_id
  - notifications.post_id
  - notifications.comment_id

  ## Performance Notes
  - Indexes are added only where query patterns demonstrate need
  - Removing unused indexes reduces write overhead and storage
  - Existing indexes on frequently queried columns are preserved

  ## Security Notes
  - Leaked Password Protection must be enabled in Supabase Auth settings
  - This is a configuration change, not a database migration
  - See: https://supabase.com/dashboard/project/_/auth/policies
*/

-- Add missing indexes on foreign keys that are used in queries
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);

-- Remove unused indexes to reduce overhead
DROP INDEX IF EXISTS messages_sender_id_idx;
DROP INDEX IF EXISTS notifications_actor_id_idx;
DROP INDEX IF EXISTS notifications_post_id_idx;
DROP INDEX IF EXISTS notifications_comment_id_idx;