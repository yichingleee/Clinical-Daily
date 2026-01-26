import { JournalName, PublicationType, LibrarySortOption, ReadStatusFilter } from './types';

export const ALL_JOURNALS = Object.values(JournalName);

export const ALL_PUBLICATION_TYPES = Object.values(PublicationType);

export const DATE_RANGES = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 14 Days', value: 14 },
  { label: 'Last 30 Days', value: 30 },
];

// Library sorting options
export const LIBRARY_SORT_OPTIONS: { label: string; value: LibrarySortOption }[] = [
  { label: 'Date Saved (Newest)', value: 'savedNewest' },
  { label: 'Date Saved (Oldest)', value: 'savedOldest' },
  { label: 'Publication Date (Newest)', value: 'pubNewest' },
  { label: 'Publication Date (Oldest)', value: 'pubOldest' },
  { label: 'Title (A-Z)', value: 'title' },
];

// Read status filter options
export const READ_STATUS_OPTIONS: { label: string; value: ReadStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Read', value: 'read' },
  { label: 'Unread', value: 'unread' },
];
