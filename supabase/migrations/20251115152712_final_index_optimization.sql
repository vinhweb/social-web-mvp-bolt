/*
  # Final Index Optimization

  ## Overview
  This migration optimizes the database indexing strategy by:
  1. Adding indexes on foreign keys that are used in actual queries
  2. Removing indexes that are not being used
  3. Ensuring optimal query performance based on application usage patterns

  ## Changes

  ### 1. Add Required Foreign Key Indexes
  These indexes support actual query patterns in the application:
  - messages.sender_id - used when filtering messages by sender
  - notifications.actor_id - used when displaying who triggered notifications
  - notifications.post_id - used when linking notifications to posts
  - notifications.comment_id - used when linking notifications to comments

  ### 2. Remove Unused Indexes
  These indexes were created but query patterns show they're not being used:
  - comments.user_id - queries use other access patterns
  - messages.conversation_id - covered by other indexes or not needed

  ## Performance Impact
  - Adding indexes: Improves read performance for notification and message queries
  - Removing indexes: Reduces write overhead and storage requirements
  - Net result: Better overall database performance

  ## Security Notes
  - All data access remains protected by RLS policies
  - Leaked Password Protection is a Supabase Auth configuration setting
  - Enable at: Dashboard → Authentication → Policies → Password Policies
*/

-- Remove unused indexes first to reduce overhead
DROP INDEX IF EXISTS comments_user_id_idx;
DROP INDEX IF EXISTS messages_conversation_id_idx;

-- Add indexes on foreign keys that are used in queries
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS notifications_post_id_idx ON notifications(post_id);
CREATE INDEX IF NOT EXISTS notifications_comment_id_idx ON notifications(comment_id);