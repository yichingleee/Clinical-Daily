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
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Time Period
            </h3>
        </div>
        <div className="space-y-2">
          {DATE_RANGES.map((option) => (
            <label key={option.value} className="flex items-center group cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                checked={dateRange === option.value}
                onChange={() => setDateRange(option.value)}
                className="h-4 w-4 text-medical-600 focus:ring-medical-600 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Pub Type Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-gray-500" /> Study Type
            </h3>
        </div>
        <div className="space-y-2">
          {ALL_PUBLICATION_TYPES.map((type) => (
            <label key={type} className="flex items-center group cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPubTypes.includes(type)}
                onChange={() => togglePubType(type)}
                className="h-4 w-4 text-medical-600 focus:ring-medical-600 border-gray-300 rounded transition-all"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Journal Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
           <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
             <Filter className="w-4 h-4 text-gray-500" /> Journals
           </h3>
           <button 
            onClick={toggleAllJournals}
            className="text-xs text-medical-600 hover:text-medical-800 font-medium"
           >
             {selectedJournals.length === ALL_JOURNALS.length ? 'Clear' : 'All'}
           </button>
        </div>
        <div className="space-y-2">
          {Object.values(JournalName).map((journal) => (
            <label key={journal} className="flex items-center group cursor-pointer">
              <input
                type="checkbox"
                checked={selectedJournals.includes(journal)}
                onChange={() => toggleJournal(journal)}
                className="h-4 w-4 text-medical-600 focus:ring-medical-600 border-gray-300 rounded transition-all"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {journal}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
        <h4 className="text-blue-900 font-semibold mb-2 text-sm">About ClinicalDaily</h4>
        <p className="text-xs text-blue-800 leading-relaxed">
          Aggregating the latest high-impact peer-reviewed studies. 
          Use the <span className="font-bold">Summarize Trial</span> feature to get instant AI-powered breakdowns of complex clinical trials.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-medical-800 p-1.5 rounded-lg text-white">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="text-xl font-serif font-bold text-gray-900 tracking-tight">
                Clinical<span className="text-medical-600">Daily</span>
              </span>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search titles, abstracts, or keywords..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-medical-600 focus:border-transparent sm:text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6" />}
            </button>

            {/* Profile / Date Placeholder */}
            <div className="hidden md:flex items-center text-sm text-gray-500">
               {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar (only visible on mobile) */}
        <div className="md:hidden px-4 pb-3 border-t border-gray-100 pt-3">
             <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* Sidebar Filters - Desktop (Sticky) */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <SidebarContent />
          </div>
        </aside>

        {/* Mobile Sidebar (Overlay) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative bg-white w-3/4 max-w-xs h-full shadow-xl p-6 overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold font-serif text-gray-900">Filters</h2>
                 <button onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6 text-gray-500"/></button>
               </div>
               <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Feed */}
        <main className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-medical-600" /> 
              Latest Research
            </h1>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-medical-600 focus:border-transparent cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </div>

              <div className="hidden sm:block text-gray-300">|</div>

              <span className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm whitespace-nowrap">
                {processedArticles.length} Articles
              </span>
              
              <button 
                onClick={handleFetchLive}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-1.5 bg-white text-medical-700 border border-medical-200 rounded-lg text-sm font-medium hover:bg-medical-50 hover:border-medical-300 transition-all disabled:opacity-70 shadow-sm whitespace-nowrap"
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
               <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-medical-600" />
                  <p>Loading latest articles...</p>
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
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                   <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No articles found</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-1">
                  Try adjusting your search terms, date range, or filters from the sidebar.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery(''); 
                    setSelectedJournals(ALL_JOURNALS);
                    setDateRange(30);
                    setSelectedPubTypes(ALL_PUBLICATION_TYPES);
                  }}
                  className="mt-4 text-medical-600 hover:text-medical-800 font-medium text-sm"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
};

export default App;
