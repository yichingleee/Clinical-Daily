import { Article, JournalName, PublicationType } from './types';

export const ALL_JOURNALS = Object.values(JournalName);

export const ALL_PUBLICATION_TYPES = Object.values(PublicationType);

export const DATE_RANGES = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 14 Days', value: 14 },
  { label: 'Last 30 Days', value: 30 },
];
