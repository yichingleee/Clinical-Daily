import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArticleCard } from '../components/ArticleCard';
import { TagBadge } from '../components/TagBadge';
import {
  getSavedArticles,
  unsaveArticle,
  getCollections,
  getUniqueTags,
  markAsRead,
  LibraryFilters,
} from '../services/libraryService';
import { SavedArticle, Collection, AISummary, LibrarySortOption, ReadStatusFilter } from '../types';
import { ALL_JOURNALS, LIBRARY_SORT_OPTIONS, READ_STATUS_OPTIONS } from '../constants';
import {
  Search,
  Filter,
  Library,
  ArrowUpDown,
  Loader2,
  FolderOpen,
  Calendar,
  BookOpen,
  Eye,
  EyeOff,
  X,
  ChevronLeft,
} from 'lucide-react';

interface LibraryPageProps {
  onBack: () => void;
}

export const LibraryPage = ({ onBack }: LibraryPageProps) => {
  const { user } = useAuth();

  // Data state
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedJournals, setSelectedJournals] = useState<string[]>(ALL_JOURNALS);
  const [readStatus, setReadStatus] = useState<ReadStatusFilter>('all');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<LibrarySortOption>('savedNewest');

  // UI state
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch library data
  const fetchLibraryData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const filters: LibraryFilters = {
        searchQuery: searchQuery || undefined,
        tagNames: selectedTags.length > 0 ? selectedTags : undefined,
        journals: selectedJournals.length < ALL_JOURNALS.length ? selectedJournals : undefined,
        readStatus,
        collectionId: selectedCollection || undefined,
      };

      const [articlesResult, collectionsResult, tagsResult] = await Promise.all([
        getSavedArticles(user.id, filters, { field: sortBy }),
        getCollections(user.id),
        getUniqueTags(user.id),
      ]);

      setSavedArticles(articlesResult.articles);
      setCollections(collectionsResult);
      setAvailableTags(tagsResult);
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, selectedTags, selectedJournals, readStatus, selectedCollection, sortBy]);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // Handlers
  const handleUnsave = async (articlePmid: string) => {
    if (!user) return;
    try {
      await unsaveArticle(user.id, articlePmid);
      setSavedArticles(prev => prev.filter(a => a.odArticleId !== articlePmid));
    } catch (error) {
      console.error('Error unsaving article:', error);
    }
  };

  const handleToggleRead = async (articlePmid: string, isRead: boolean) => {
    if (!user) return;
    try {
      await markAsRead(user.id, articlePmid, isRead);
      setSavedArticles(prev =>
        prev.map(a =>
          a.odArticleId === articlePmid ? { ...a, isRead } : a
        )
      );
    } catch (error) {
      console.error('Error updating read status:', error);
    }
  };

  const handleSummaryGenerated = (id: string, summary: AISummary) => {
    setSavedArticles(prev =>
      prev.map(a =>
        a.odArticle.id === id
          ? { ...a, odArticle: { ...a.odArticle, cachedSummary: summary } }
          : a
      )
    );
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const toggleJournal = (journal: string) => {
    setSelectedJournals(prev =>
      prev.includes(journal)
        ? prev.filter(j => j !== journal)
        : [...prev, journal]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedJournals(ALL_JOURNALS);
    setReadStatus('all');
    setSelectedCollection(null);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery ||
      selectedTags.length > 0 ||
      selectedJournals.length < ALL_JOURNALS.length ||
      readStatus !== 'all' ||
      selectedCollection !== null
    );
  }, [searchQuery, selectedTags, selectedJournals, readStatus, selectedCollection]);

  // Group tags by category for display
  const tagsByCategory = useMemo(() => {
    const typeTags: string[] = [];
    const subspecialtyTags: string[] = [];

    for (const tagName of availableTags) {
      // Simple heuristic: check if it looks like a study type
      const studyTypes = ['Clinical Trial', 'RCT', 'Meta-Analysis', 'Systematic Review', 'Review', 'Case Report', 'Cohort Study', 'Observational Study'];
      if (studyTypes.some(t => t.toLowerCase() === tagName.toLowerCase())) {
        typeTags.push(tagName);
      } else {
        subspecialtyTags.push(tagName);
      }
    }

    return { typeTags, subspecialtyTags };
  }, [availableTags]);

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-accent-400" /> Search
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search saved articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 rounded-xl bg-edge/80 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Read Status */}
      <div>
        <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-accent-400" /> Read Status
        </h3>
        <div className="space-y-2">
          {READ_STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
              <input
                type="radio"
                name="readStatus"
                checked={readStatus === option.value}
                onChange={() => setReadStatus(option.value)}
                className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded"
              />
              <span className="text-sm text-slate-100">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-accent-400" /> Collections
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
              <input
                type="radio"
                name="collection"
                checked={selectedCollection === null}
                onChange={() => setSelectedCollection(null)}
                className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded"
              />
              <span className="text-sm text-slate-100">All Collections</span>
            </label>
            {collections.map((collection) => (
              <label key={collection.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="collection"
                  checked={selectedCollection === collection.id}
                  onChange={() => setSelectedCollection(collection.id)}
                  className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded"
                />
                <span className="text-sm text-slate-100">{collection.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tags - Study Type */}
      {tagsByCategory.typeTags.length > 0 && (
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-accent-400" /> Study Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {tagsByCategory.typeTags.map((tagName) => (
              <button
                key={tagName}
                onClick={() => toggleTag(tagName)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  selectedTags.includes(tagName)
                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-purple-500/40'
                }`}
              >
                {tagName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags - Subspecialty */}
      {tagsByCategory.subspecialtyTags.length > 0 && (
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-accent-400" /> Subspecialty
          </h3>
          <div className="flex flex-wrap gap-2">
            {tagsByCategory.subspecialtyTags.map((tagName) => (
              <button
                key={tagName}
                onClick={() => toggleTag(tagName)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  selectedTags.includes(tagName)
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-emerald-500/40'
                }`}
              >
                {tagName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Journals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent-400" /> Journals
          </h3>
          <button
            onClick={() => setSelectedJournals(
              selectedJournals.length === ALL_JOURNALS.length ? [] : ALL_JOURNALS
            )}
            className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-accent-400 hover:border-accent-500/60 transition"
          >
            {selectedJournals.length === ALL_JOURNALS.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="space-y-2">
          {ALL_JOURNALS.map((journal) => (
            <label key={journal} className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={selectedJournals.includes(journal)}
                onChange={() => toggleJournal(journal)}
                className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded transition-all"
              />
              <span className="text-sm text-slate-100">{journal}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 hover:border-accent-500/40 hover:text-accent-300 transition-all"
        >
          <X className="w-4 h-4" />
          Clear All Filters
        </button>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Library className="w-16 h-16 text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to access your library</h2>
        <p className="text-slate-400 mb-6">Save articles and organize them with tags and collections.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-medical-700 text-surface border border-accent-500/40 rounded-xl font-semibold hover:brightness-110 transition-all shadow-glow"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Sidebar Filters - Desktop */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 rounded-2xl border border-white/10 bg-edge/70 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative bg-panel/95 border border-white/10 w-3/4 max-w-xs h-full shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Filters</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-lg bg-white/5 border border-white/10">
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={onBack}
              className="text-xs font-mono uppercase tracking-[0.26em] text-accent-400 hover:text-accent-300 flex items-center gap-1 mb-1"
            >
              <ChevronLeft className="w-3 h-3" /> Back to Feed
            </button>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white flex items-center gap-3">
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-accent-500/40">
                <Library className="w-5 h-5 text-accent-400" />
              </span>
              My Library
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 hover:border-accent-500/40 transition-all"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as LibrarySortOption)}
                className="appearance-none bg-edge/80 border border-white/10 text-slate-100 py-2 pl-4 pr-10 rounded-xl text-sm font-medium shadow-[0_10px_40px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
              >
                {LIBRARY_SORT_OPTIONS.map((option) => (
                  <option key={option.value} className="bg-surface" value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-accent-400">
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </div>

            <span className="text-xs font-mono uppercase tracking-[0.16em] text-slate-300 bg-white/5 px-3 py-2 rounded-full border border-white/10">
              {savedArticles.length} Saved
            </span>
          </div>
        </div>

        {/* Active Filters Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-[0.1em] text-slate-400">Active tags:</span>
            {selectedTags.map((tagName) => (
              <TagBadge
                key={tagName}
                tag={{ id: tagName, name: tagName, category: 'custom' }}
                removable
                onRemove={() => toggleTag(tagName)}
              />
            ))}
          </div>
        )}

        {/* Articles */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-edge/60 border border-white/10 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent-400" />
              <p className="text-sm uppercase tracking-[0.2em] font-mono">Loading your library...</p>
            </div>
          ) : savedArticles.length > 0 ? (
            savedArticles.map((savedArticle) => (
              <div key={savedArticle.id} className="relative">
                {/* Read/Unread indicator */}
                <button
                  onClick={() => handleToggleRead(savedArticle.odArticleId, !savedArticle.isRead)}
                  className={`absolute -left-3 top-6 z-10 p-1.5 rounded-full border transition-all ${
                    savedArticle.isRead
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-accent-500/40'
                  }`}
                  title={savedArticle.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {savedArticle.isRead ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                </button>

                <ArticleCard
                  article={savedArticle.odArticle}
                  onSummaryGenerated={handleSummaryGenerated}
                  onUnsave={handleUnsave}
                  isSaved={true}
                  showSaveButton={true}
                />

                {/* Saved date */}
                <div className="mt-2 text-xs font-mono text-slate-500 pl-4">
                  Saved {new Date(savedArticle.savedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/15">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-edge/80 border border-white/10 mb-4">
                <Library className="w-6 h-6 text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {hasActiveFilters ? 'No matching articles' : 'Your library is empty'}
              </h3>
              <p className="text-slate-400 max-w-sm mx-auto mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters to find more articles.'
                  : 'Start saving articles from the feed to build your research library.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 text-accent-400 hover:text-accent-500 font-semibold text-sm underline underline-offset-4"
                >
                  Clear all filters
                </button>
              ) : (
                <button
                  onClick={onBack}
                  className="mt-5 inline-flex items-center gap-2 text-accent-400 hover:text-accent-500 font-semibold text-sm underline underline-offset-4"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Browse articles
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
