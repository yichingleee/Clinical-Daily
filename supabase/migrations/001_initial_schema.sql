-- ClinicalDaily Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Saved Articles Table
-- Stores articles saved by users with their full article data
CREATE TABLE IF NOT EXISTS saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,  -- PubMed ID (PMID)
  article_data JSONB NOT NULL,  -- Full article data including tags
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Ensure each user can only save an article once
  UNIQUE(user_id, article_id)
);

-- Collections Table
-- User-created folders/collections for organizing saved articles
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure collection names are unique per user
  UNIQUE(user_id, name)
);

-- Article-Collection Junction Table
-- Many-to-many relationship between saved articles and collections
CREATE TABLE IF NOT EXISTS article_collections (
  article_id UUID NOT NULL REFERENCES saved_articles(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

  PRIMARY KEY (article_id, collection_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_articles_user ON saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_saved_at ON saved_articles(saved_at);
CREATE INDEX IF NOT EXISTS idx_saved_articles_is_read ON saved_articles(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

-- GIN index for JSONB queries (searching within article_data)
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_data ON saved_articles USING GIN (article_data);

-- Row Level Security (RLS) Policies
-- These ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_collections ENABLE ROW LEVEL SECURITY;

-- Saved Articles Policies
CREATE POLICY "Users can view their own saved articles"
  ON saved_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved articles"
  ON saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved articles"
  ON saved_articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved articles"
  ON saved_articles FOR DELETE
  USING (auth.uid() = user_id);

-- Collections Policies
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- Article Collections Junction Policies
-- Users can manage article-collection relationships for their own articles
CREATE POLICY "Users can view their article-collection relationships"
  ON article_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_articles
      WHERE saved_articles.id = article_collections.article_id
      AND saved_articles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert article-collection relationships for their articles"
  ON article_collections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_articles
      WHERE saved_articles.id = article_collections.article_id
      AND saved_articles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their article-collection relationships"
  ON article_collections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM saved_articles
      WHERE saved_articles.id = article_collections.article_id
      AND saved_articles.user_id = auth.uid()
    )
  );
