import React, { useState } from 'react';
import { Article, AISummary } from '../types';
import { generateClinicalSummary } from '../services/geminiService';
import { ExternalLink, Calendar, Users, FlaskConical, FileText, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onSummaryGenerated: (id: string, summary: AISummary) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onSummaryGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    if (article.cachedSummary) return; // Should already be displayed

    setLoading(true);
    setError(null);
    try {
      const summary = await generateClinicalSummary(article.abstract);
      onSummaryGenerated(article.id, summary);
    } catch (err) {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render abstract nicely
  const renderAbstract = (text: string) => {
    const sections = text.split('\n\n');
    const isStructured = sections.length > 1;

    // If it's a simple one-paragraph abstract, keep the quote style
    if (!isStructured) {
       return `"${text}"`;
    }

    // If structured, split into blocks and bold labels
    return (
      <div className="space-y-3 not-italic">
        {sections.map((section, idx) => {
          // Check for uppercase labels (e.g. "BACKGROUND: ...")
          const match = section.match(/^([A-Z\s/-]+):/);
          if (match) {
            const label = match[1];
            const content = section.substring(match[0].length);
            return (
              <div key={idx}>
                <span className="font-bold text-xs text-gray-800 tracking-wider mr-1 uppercase">{label}:</span>
                <span className="text-gray-600">{content}</span>
              </div>
            );
          }
          return <p key={idx}>{section}</p>;
        })}
      </div>
    );
  };

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      {/* Header */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100 uppercase tracking-wide">
                  {article.journal}
                </span>
                {article.isTrial && (
                   <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                     <FlaskConical className="w-3 h-3" /> Clinical Trial
                   </span>
                )}
             </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 leading-tight mb-2">
              {article.title}
            </h2>
            <div className="flex flex-wrap items-center text-sm text-gray-500 gap-y-2 gap-x-4">
              <span className="flex items-center gap-1">
                 <Users className="w-4 h-4" /> {article.authors.join(", ")}
              </span>
              <span className="flex items-center gap-1">
                 <Calendar className="w-4 h-4" /> {article.pubDate}
              </span>
            </div>
          </div>
          <a
            href={article.doiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-medical-600 hover:text-medical-800 hover:underline shrink-0"
          >
            Read Source <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Abstract Preview */}
        <div className="text-gray-600 text-sm md:text-base leading-relaxed mb-4 border-l-4 border-gray-100 pl-4 italic">
          {renderAbstract(article.abstract)}
        </div>

        {/* AI Action Area */}
        {article.isTrial && !article.cachedSummary && (
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleSummarize}
              disabled={loading}
              className={`
                group flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                ${loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-medical-800 to-medical-600 text-white hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Trial...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 group-hover:text-yellow-200 transition-colors" /> Summarize Trial
                </>
              )}
            </button>
            {error && <span className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {error}</span>}
          </div>
        )}
      </div>

      {/* AI Summary Result */}
      {article.cachedSummary && (
        <div className="bg-slate-50 border-t border-slate-200 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-purple-600" /> AI-Generated Overview
             </h3>
             <span className="text-[10px] text-gray-400 border border-gray-200 px-2 py-1 rounded">
                Powered by Gemini 3
             </span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div>
                 <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                   <FileText className="w-3.5 h-3.5" /> Research Design
                 </h4>
                 <p className="text-sm text-gray-800">{article.cachedSummary.researchDesign}</p>
               </div>
               <div>
                 <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                   <Users className="w-3.5 h-3.5" /> Population
                 </h4>
                 <p className="text-sm text-gray-800">{article.cachedSummary.studyPopulation}</p>
               </div>
               <div>
                 <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                   <FlaskConical className="w-3.5 h-3.5" /> Interventions
                 </h4>
                 <p className="text-sm text-gray-800">{article.cachedSummary.interventions}</p>
               </div>
            </div>
            <div className="space-y-4">
               <div>
                 <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                   <CheckCircle2 className="w-3.5 h-3.5" /> Endpoints
                 </h4>
                 <p className="text-sm text-gray-800">{article.cachedSummary.endpoints}</p>
               </div>
               <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                 <h4 className="text-xs font-semibold text-medical-700 uppercase mb-1 flex items-center gap-1.5">
                   Key Results
                 </h4>
                 <p className="text-sm font-medium text-gray-900">{article.cachedSummary.results}</p>
               </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-gray-400 text-center">
             AI-generated overview. Please refer to the original publication for clinical decision-making.
          </div>
        </div>
      )}
    </article>
  );
};
