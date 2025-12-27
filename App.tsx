import React, { useState, useMemo, useEffect } from 'react';
import { ALL_JOURNALS, ALL_PUBLICATION_TYPES, DATE_RANGES } from './constants';
import { Article, AISummary, JournalName, PublicationType, SortOption } from './types';
import { ArticleCard } from './components/ArticleCard';
import { fetchLatestArticles } from './services/geminiService';
import { Search, Filter, BookOpen, Stethoscope, Menu, X, RefreshCw, Loader2, ArrowUpDown, Clock, FlaskConical } from 'lucide-react';

const App: React.FC = () => {
  // Data State
  const [articles, setArticles] = useState<Article[]>([]);
  
  // Filter State
  const [selectedJournals, setSelectedJournals] = useState<string[]>(ALL_JOURNALS);
  const [selectedPubTypes, setSelectedPubTypes] = useState<string[]>(ALL_PUBLICATION_TYPES);
  const [dateRange, setDateRange] = useState<number>(14); // Default 14 days
  
  // View State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initial Data Load & Refetch on Server-side filter changes
  useEffect(() => {
    handleFetchLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedPubTypes]); 

  // Handlers
  const handleSummaryGenerated = (id: string, summary: AISummary) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, cachedSummary: summary } : a));
  };

  const handleFetchLive = async () => {
    setIsRefreshing(true);
    try {
      const liveArticles = await fetchLatestArticles(dateRange, selectedPubTypes);
      setArticles(liveArticles); // Even if empty, update state to clear old results
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleJournal = (journal: string) => {
    setSelectedJournals(prev => 
      prev.includes(journal) 
        ? prev.filter(j => j !== journal)
        : [...prev, journal]
    );
  };
  
  const togglePubType = (type: string) => {
    // Note: Changing this triggers useEffect -> fetchLatestArticles
    setSelectedPubTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleAllJournals = () => {
    setSelectedJournals(prev => prev.length === ALL_JOURNALS.length ? [] : ALL_JOURNALS);
  };

  // Filter & Sort Logic (Client Side)
  const processedArticles = useMemo(() => {
    // 1. Filter
    let result = articles.filter(article => {
      const matchesJournal = selectedJournals.includes(article.journal);
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.abstract.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesJournal && matchesSearch;
    });

    // 2. Sort
    result.sort((a, b) => {
      // Basic string comparison works for YYYY-MM-DD
      if (sortBy === 'newest') return b.pubDate.localeCompare(a.pubDate);
      return a.pubDate.localeCompare(b.pubDate);
    });

    return result;
  }, [articles, selectedJournals, searchQuery, sortBy]);

  const SidebarContent = () => (
    <div className="space-y-8">
      {/* Date Range Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-400" /> Time Window
            </h3>
        </div>
        <div className="space-y-2">
          {DATE_RANGES.map((option) => (
            <label key={option.value} className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                checked={dateRange === option.value}
                onChange={() => setDateRange(option.value)}
                className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded"
              />
              <span className="text-sm text-slate-100">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pub Type Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-accent-400" /> Study Type
            </h3>
        </div>
        <div className="space-y-2">
          {ALL_PUBLICATION_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-3 rounded-xl border border-white/10 bg-edge/70 px-3 py-2 hover:border-accent-500/60 hover:bg-white/5 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPubTypes.includes(type)}
                onChange={() => togglePubType(type)}
                className="h-4 w-4 text-accent-500 focus:ring-accent-500 bg-surface border-white/30 rounded transition-all"
              />
              <span className="text-sm text-slate-100">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Journal Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
           <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
             <Filter className="w-4 h-4 text-accent-400" /> Journals
           </h3>
           <button 
            onClick={toggleAllJournals}
            className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-accent-400 hover:border-accent-500/60 transition"
           >
             {selectedJournals.length === ALL_JOURNALS.length ? 'Clear' : 'All'}
           </button>
        </div>
        <div className="space-y-2">
          {Object.values(JournalName).map((journal) => (
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

      <div className="relative overflow-hidden rounded-2xl border border-accent-500/20 bg-gradient-to-br from-accent-500/10 via-white/5 to-medical-700/20 p-4 shadow-glow">
        <div className="absolute -right-8 -top-8 h-28 w-28 bg-[radial-gradient(circle,rgba(93,243,255,0.26),transparent_55%)]" />
        <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-accent-300 mb-2">About</h4>
        <p className="text-sm text-slate-100 leading-relaxed">
          ClinicalDaily curates peer-reviewed findings with a surgical focus. 
          Use <span className="font-semibold text-white">Summarize Trial</span> to generate precision synopses on-demand.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:72px_72px] opacity-20" />
        <div className="absolute -top-24 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(93,243,255,0.25),transparent_55%)] blur-3xl" />
        <div className="absolute -bottom-24 left-6 w-72 h-72 bg-[radial-gradient(circle,rgba(124,88,255,0.18),transparent_50%)] blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-panel/80 backdrop-blur-xl shadow-[0_10px_60px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-500/70 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="relative flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-500 to-medical-700 shadow-glow flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.85),transparent_45%)] opacity-40" />
                <Stethoscope className="w-5 h-5 text-surface" />
              </div>
              <div>
                <span className="block text-xs font-mono uppercase tracking-[0.3em] text-accent-400">Clinical</span>
                <span className="text-2xl font-semibold tracking-tight text-white">Daily</span>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-accent-400" />
              </div>
              <input
                type="text"
                placeholder="Search titles, abstracts, or keywords..."
                className="block w-full pl-11 pr-4 py-2.5 rounded-full bg-edge/80 border border-white/10 leading-5 text-slate-100 placeholder-slate-500 shadow-[0_12px_40px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 sm:text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 text-slate-200 border border-white/10 rounded-xl bg-white/5"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6" />}
            </button>

            {/* Profile / Date Placeholder */}
            <div className="hidden md:flex items-center text-xs font-mono text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2 uppercase tracking-[0.14em]">
               {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar (only visible on mobile) */}
        <div className="md:hidden px-4 pb-3 border-t border-white/10 pt-3 bg-panel/90 backdrop-blur-xl">
             <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-accent-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-edge/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
        </div>
      </header>

      <div className="flex flex-1 w-full">
        <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="relative w-full rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
            <div className="flex flex-col lg:flex-row gap-10 p-6 sm:p-8">
        
        {/* Sidebar Filters - Desktop (Sticky) */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-edge/70 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile Sidebar (Overlay) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative bg-panel/95 border border-white/10 w-3/4 max-w-xs h-full shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6 overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-semibold text-white">Filters</h2>
                 <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-lg bg-white/5 border border-white/10">
                   <X className="w-5 h-5 text-slate-300"/>
                 </button>
               </div>
               <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Feed */}
        <main className="flex-1 min-w-0 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-[0.26em] text-accent-400">Live Feed</p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-white flex items-center gap-3">
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-accent-500/40">
                  <BookOpen className="w-5 h-5 text-accent-400" /> 
                </span>
                Latest Research
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-edge/80 border border-white/10 text-slate-100 py-2 pl-4 pr-10 rounded-xl text-sm font-medium shadow-[0_10px_40px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-pointer"
                >
                  <option className="bg-surface" value="newest">Newest First</option>
                  <option className="bg-surface" value="oldest">Oldest First</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-accent-400">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </div>

              <span className="text-xs font-mono uppercase tracking-[0.16em] text-slate-300 bg-white/5 px-3 py-2 rounded-full border border-white/10">
                {processedArticles.length} Articles
              </span>
              
              <button 
                onClick={handleFetchLive}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-medical-700 text-surface border border-accent-500/40 rounded-xl text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 shadow-glow whitespace-nowrap"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {isRefreshing && articles.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-edge/60 border border-white/10 rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent-400" />
                  <p className="text-sm uppercase tracking-[0.2em] font-mono">Loading latest articles...</p>
               </div>
            ) : processedArticles.length > 0 ? (
              processedArticles.map(article => (
                <ArticleCard 
                  key={article.id} 
                  article={article} 
                  onSummaryGenerated={handleSummaryGenerated}
                />
              ))
            ) : (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/15">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-edge/80 border border-white/10 mb-4">
                   <Search className="w-6 h-6 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">No articles found</h3>
                <p className="text-slate-400 max-w-sm mx-auto mt-1">
                  Adjust your search terms, time window, or toggle journals to broaden the feed.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery(''); 
                    setSelectedJournals(ALL_JOURNALS);
                    setDateRange(30);
                    setSelectedPubTypes(ALL_PUBLICATION_TYPES);
                  }}
                  className="mt-5 inline-flex items-center gap-2 text-accent-400 hover:text-accent-500 font-semibold text-sm underline underline-offset-4"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </main>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
