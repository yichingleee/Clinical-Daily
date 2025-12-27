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
                <span className="font-bold text-[11px] text-accent-300 tracking-[0.14em] mr-2 uppercase">{label}:</span>
                <span className="text-slate-200">{content}</span>
              </div>
            );
          }
          return <p key={idx}>{section}</p>;
        })}
      </div>
    );
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] mb-6 transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-500/80 to-transparent" />
      {/* Header */}
      <div className="p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-accent-500/10 text-accent-300 border border-accent-500/30 uppercase tracking-[0.16em]">
                  {article.journal}
                </span>
                {article.isTrial && (
                   <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/15 flex items-center gap-1 tracking-[0.16em]">
                     <FlaskConical className="w-3 h-3 text-accent-400" /> Clinical Trial
                   </span>
                )}
             </div>
            <h2 className="text-xl md:text-2xl font-semibold text-white leading-tight mb-2">
              {article.title}
            </h2>
            <div className="flex flex-wrap items-center text-xs md:text-sm text-slate-400 gap-y-2 gap-x-4 font-mono uppercase tracking-[0.08em]">
              <span className="flex items-center gap-1.5">
                 <Users className="w-4 h-4 text-accent-400" /> {article.authors.join(", ")}
              </span>
              <span className="flex items-center gap-1.5">
                 <Calendar className="w-4 h-4 text-accent-400" /> {article.pubDate}
              </span>
            </div>
          </div>
          <a
            href={article.doiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-accent-400 hover:text-accent-500 underline underline-offset-4 shrink-0"
          >
            Read Source <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Abstract Preview */}
        <div className="text-slate-200 text-sm md:text-base leading-relaxed mb-5 border-l border-accent-500/30 pl-4 bg-white/5 rounded-lg italic">
          {renderAbstract(article.abstract)}
        </div>

        {/* AI Action Area */}
        {article.isTrial && !article.cachedSummary && (
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleSummarize}
              disabled={loading}
              className={`
                group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${loading 
                  ? 'bg-edge/70 text-slate-400 cursor-not-allowed border border-white/10' 
                  : 'bg-gradient-to-r from-accent-500 to-medical-700 text-surface border border-accent-500/40 shadow-glow hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]'}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Trial...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-accent-300 group-hover:text-white transition-colors" /> Summarize Trial
                </>
              )}
            </button>
            {error && <span className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {error}</span>}
          </div>
        )}
      </div>

      {/* AI Summary Result */}
      {article.cachedSummary && (
        <div className="bg-edge/60 border-t border-white/10 p-6 sm:p-7 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-mono font-semibold text-accent-300 uppercase tracking-[0.2em] flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-accent-400" /> AI-Generated Overview
             </h3>
             <span className="text-[11px] text-slate-400 border border-white/10 px-2 py-1 rounded-full bg-white/5 font-mono uppercase tracking-[0.18em]">
                Gemini 3
             </span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <div>
                 <h4 className="text-[11px] font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                   <FileText className="w-3.5 h-3.5 text-accent-400" /> Research Design
                 </h4>
                 <p className="text-sm text-slate-100">{article.cachedSummary.researchDesign}</p>
               </div>
               <div>
                 <h4 className="text-[11px] font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                   <Users className="w-3.5 h-3.5 text-accent-400" /> Population
                 </h4>
                 <p className="text-sm text-slate-100">{article.cachedSummary.studyPopulation}</p>
               </div>
               <div>
                 <h4 className="text-[11px] font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                   <FlaskConical className="w-3.5 h-3.5 text-accent-400" /> Interventions
                 </h4>
                 <p className="text-sm text-slate-100">{article.cachedSummary.interventions}</p>
               </div>
            </div>
            <div className="space-y-4">
               <div>
                 <h4 className="text-[11px] font-semibold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                   <CheckCircle2 className="w-3.5 h-3.5 text-accent-400" /> Endpoints
                 </h4>
                 <p className="text-sm text-slate-100">{article.cachedSummary.endpoints}</p>
               </div>
               <div className="bg-white/5 p-3 rounded-lg border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                 <h4 className="text-[11px] font-semibold text-accent-300 uppercase mb-1 flex items-center gap-1.5">
                   Key Results
                 </h4>
                 <p className="text-sm font-semibold text-white">{article.cachedSummary.results}</p>
               </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 text-center font-mono uppercase tracking-[0.14em]">
             AI-generated overview. Verify with the source publication.
          </div>
        </div>
      )}
    </article>
  );
};
