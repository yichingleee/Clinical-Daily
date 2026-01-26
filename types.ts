export interface AISummary {
  researchDesign: string;
  studyPopulation: string;
  interventions: string;
  endpoints: string;
  results: string;
}

// Tag system
export type TagCategory = 'type' | 'subspecialty' | 'custom';

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
}

export interface Article {
  id: string;
  pmid: string; // PubMed ID for persistence
  title: string;
  journal: string;
  authors: string[];
  pubDate: string;
  abstract: string;
  doiLink: string;
  isTrial: boolean;
  tags: Tag[];
  meshTerms: string[];
  cachedSummary?: AISummary;
}

// User & Library system
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface SavedArticle {
  id: string;
  odArticleId: string; // Original article PMID
  odArticle: Article;
  userId: string;
  savedAt: string;
  isRead: boolean;
  collectionIds: string[];
  notes?: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export enum JournalName {
  NEJM = "NEJM",
  JAMA = "JAMA",
  LANCET = "The Lancet",
  BMJ = "BMJ",
  NATURE_MED = "Nature Medicine",
  ANNALS = "Annals of Internal Medicine",
  JCO = "Journal of Clinical Oncology"
}

export enum PublicationType {
  CLINICAL_TRIAL = "Clinical Trial",
  RCT = "Randomized Controlled Trial",
  META_ANALYSIS = "Meta-Analysis",
  SYSTEMATIC_REVIEW = "Systematic Review",
  NARRATIVE_REVIEW = "Narrative Review"
}

export type SortOption = 'newest' | 'oldest';

// Library filter options
export type LibrarySortOption = 'savedNewest' | 'savedOldest' | 'pubNewest' | 'pubOldest' | 'title';
export type ReadStatusFilter = 'all' | 'read' | 'unread';
