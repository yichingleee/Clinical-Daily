export interface AISummary {
  researchDesign: string;
  studyPopulation: string;
  interventions: string;
  endpoints: string;
  results: string;
}

export interface Article {
  id: string;
  title: string;
  journal: string;
  authors: string[];
  pubDate: string;
  abstract: string;
  doiLink: string;
  isTrial: boolean;
  cachedSummary?: AISummary; // In a real app, this comes from DB
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
  SYSTEMATIC_REVIEW = "Systematic Review"
}

export type SortOption = 'newest' | 'oldest';
