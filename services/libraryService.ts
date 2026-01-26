import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Article, SavedArticle, Collection, LibrarySortOption, ReadStatusFilter } from '../types';

export interface LibraryFilters {
  searchQuery?: string;
  tagNames?: string[];
  journals?: string[];
  readStatus?: ReadStatusFilter;
  collectionId?: string;
  pubDateFrom?: string;
  pubDateTo?: string;
  savedDateFrom?: string;
  savedDateTo?: string;
}

export interface LibrarySort {
  field: LibrarySortOption;
}

export interface LibraryPagination {
  page: number;
  pageSize: number;
}

// Save an article to the user's library
export const saveArticle = async (userId: string, article: Article): Promise<SavedArticle | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase
    .from('saved_articles')
    .insert({
      user_id: userId,
      article_id: article.pmid,
      article_data: article,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate save attempt
    if (error.code === '23505') {
      throw new Error('Article is already saved');
    }
    throw new Error(error.message);
  }

  return mapDbToSavedArticle(data);
};

// Remove an article from the user's library
export const unsaveArticle = async (userId: string, articlePmid: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('saved_articles')
    .delete()
    .eq('user_id', userId)
    .eq('article_id', articlePmid);

  if (error) {
    throw new Error(error.message);
  }
};

// Get all saved article PMIDs for quick lookup
export const getSavedArticleIds = async (userId: string): Promise<Set<string>> => {
  if (!isSupabaseConfigured()) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('saved_articles')
    .select('article_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching saved article IDs:', error);
    return new Set();
  }

  return new Set(data.map(row => row.article_id));
};

// Get saved articles with filters, sorting, and pagination
export const getSavedArticles = async (
  userId: string,
  filters: LibraryFilters = {},
  sort: LibrarySort = { field: 'savedNewest' },
  pagination: LibraryPagination = { page: 1, pageSize: 20 }
): Promise<{ articles: SavedArticle[]; total: number }> => {
  if (!isSupabaseConfigured()) {
    return { articles: [], total: 0 };
  }

  let query = supabase
    .from('saved_articles')
    .select('*, article_collections(collection_id)', { count: 'exact' })
    .eq('user_id', userId);

  // Apply read status filter
  if (filters.readStatus === 'read') {
    query = query.eq('is_read', true);
  } else if (filters.readStatus === 'unread') {
    query = query.eq('is_read', false);
  }

  // Apply date filters
  if (filters.savedDateFrom) {
    query = query.gte('saved_at', filters.savedDateFrom);
  }
  if (filters.savedDateTo) {
    query = query.lte('saved_at', filters.savedDateTo);
  }

  // Apply sorting
  switch (sort.field) {
    case 'savedNewest':
      query = query.order('saved_at', { ascending: false });
      break;
    case 'savedOldest':
      query = query.order('saved_at', { ascending: true });
      break;
    case 'pubNewest':
      query = query.order('article_data->pubDate', { ascending: false });
      break;
    case 'pubOldest':
      query = query.order('article_data->pubDate', { ascending: true });
      break;
    case 'title':
      query = query.order('article_data->title', { ascending: true });
      break;
  }

  // Apply pagination
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let articles = (data || []).map(mapDbToSavedArticle);

  // Client-side filtering for complex filters
  if (filters.searchQuery) {
    const searchLower = filters.searchQuery.toLowerCase();
    articles = articles.filter(a =>
      a.odArticle.title.toLowerCase().includes(searchLower) ||
      a.odArticle.abstract.toLowerCase().includes(searchLower)
    );
  }

  if (filters.tagNames && filters.tagNames.length > 0) {
    articles = articles.filter(a =>
      a.odArticle.tags.some(t => filters.tagNames!.includes(t.name))
    );
  }

  if (filters.journals && filters.journals.length > 0) {
    articles = articles.filter(a =>
      filters.journals!.includes(a.odArticle.journal)
    );
  }

  if (filters.pubDateFrom) {
    articles = articles.filter(a => a.odArticle.pubDate >= filters.pubDateFrom!);
  }
  if (filters.pubDateTo) {
    articles = articles.filter(a => a.odArticle.pubDate <= filters.pubDateTo!);
  }

  if (filters.collectionId) {
    articles = articles.filter(a =>
      a.collectionIds.includes(filters.collectionId!)
    );
  }

  return { articles, total: count || 0 };
};

// Mark an article as read/unread
export const markAsRead = async (
  userId: string,
  articlePmid: string,
  isRead: boolean
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('saved_articles')
    .update({ is_read: isRead })
    .eq('user_id', userId)
    .eq('article_id', articlePmid);

  if (error) {
    throw new Error(error.message);
  }
};

// Update notes for a saved article
export const updateNotes = async (
  userId: string,
  articlePmid: string,
  notes: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('saved_articles')
    .update({ notes })
    .eq('user_id', userId)
    .eq('article_id', articlePmid);

  if (error) {
    throw new Error(error.message);
  }
};

// --- Collections ---

// Get all collections for a user
export const getCollections = async (userId: string): Promise<Collection[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapDbToCollection);
};

// Create a new collection
export const createCollection = async (
  userId: string,
  name: string
): Promise<Collection | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDbToCollection(data);
};

// Delete a collection
export const deleteCollection = async (
  userId: string,
  collectionId: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

// Rename a collection
export const renameCollection = async (
  userId: string,
  collectionId: string,
  newName: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('collections')
    .update({ name: newName })
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

// Add an article to a collection
export const addToCollection = async (
  savedArticleId: string,
  collectionId: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('article_collections')
    .insert({
      article_id: savedArticleId,
      collection_id: collectionId,
    });

  if (error) {
    // Ignore duplicate entries
    if (error.code !== '23505') {
      throw new Error(error.message);
    }
  }
};

// Remove an article from a collection
export const removeFromCollection = async (
  savedArticleId: string,
  collectionId: string
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase
    .from('article_collections')
    .delete()
    .eq('article_id', savedArticleId)
    .eq('collection_id', collectionId);

  if (error) {
    throw new Error(error.message);
  }
};

// Get all unique tags from saved articles
export const getUniqueTags = async (userId: string): Promise<string[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_articles')
    .select('article_data')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const tagSet = new Set<string>();
  for (const row of data || []) {
    const article = row.article_data as Article;
    if (article.tags) {
      for (const tag of article.tags) {
        tagSet.add(tag.name);
      }
    }
  }

  return Array.from(tagSet).sort();
};

// --- Helper functions ---

interface DbSavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  article_data: Article;
  saved_at: string;
  is_read: boolean;
  notes?: string;
  article_collections?: { collection_id: string }[];
}

const mapDbToSavedArticle = (row: DbSavedArticle): SavedArticle => ({
  id: row.id,
  odArticleId: row.article_id,
  odArticle: row.article_data,
  userId: row.user_id,
  savedAt: row.saved_at,
  isRead: row.is_read,
  notes: row.notes,
  collectionIds: (row.article_collections || []).map(ac => ac.collection_id),
});

interface DbCollection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

const mapDbToCollection = (row: DbCollection): Collection => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  createdAt: row.created_at,
});
