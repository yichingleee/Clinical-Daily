import { GoogleGenAI, Type } from '@google/genai';
import { AISummary, Article, JournalName, PublicationType } from '../types';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Gemini Summarization (unchanged) ---

export const generateClinicalSummary = async (abstract: string): Promise<AISummary> => {
  if (!apiKey) {
    throw new Error('API key is missing. Please set GEMINI_API_KEY (preferred) or API_KEY.');
  }

  const prompt = `
    You are an expert clinical research assistant.
    Analyze the following medical abstract and provide a structured summary suitable for a clinician.
    
    Abstract:
    "${abstract}"

    Extract the following key information:
    1. Research Design (e.g., Phase III, Randomized, Double-blind)
    2. Study Population (Size, key criteria)
    3. Interventions (Experimental vs. Control)
    4. Endpoints (Primary and key secondary)
    5. Results (Key stats, p-values, HR)

    Return strictly valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            researchDesign: { type: Type.STRING },
            studyPopulation: { type: Type.STRING },
            interventions: { type: Type.STRING },
            endpoints: { type: Type.STRING },
            results: { type: Type.STRING },
          },
          required: ['researchDesign', 'studyPopulation', 'interventions', 'endpoints', 'results']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AISummary;
    }
    throw new Error('Empty response from AI');
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// --- PubMed API Integration ---

const getRetryDelay = (attempt: number) => {
  const baseDelay = 250 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return baseDelay + jitter;
};

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Aborted', 'AbortError'));
    return;
  }

  const onAbort = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    reject(new DOMException('Aborted', 'AbortError'));
  };

  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, ms);

  signal?.addEventListener('abort', onAbort);
});

const fetchWithRetry = async (url: string, options: RequestInit = {}, retries: number = 2) => {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500 || attempt >= retries) {
        return response;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      if (attempt >= retries) {
        throw error;
      }
    }
    const delay = getRetryDelay(attempt);
    attempt += 1;
    await sleep(delay, options.signal ?? undefined);
  }
};

const JOURNAL_QUERY_MAP: Record<JournalName, string> = {
  [JournalName.NEJM]: '"N Engl J Med"[Journal]',
  [JournalName.JAMA]: '"JAMA"[Journal]',
  [JournalName.LANCET]: '"Lancet"[Journal]',
  [JournalName.BMJ]: '"BMJ"[Journal]',
  [JournalName.NATURE_MED]: '"Nat Med"[Journal]',
  [JournalName.ANNALS]: '"Ann Intern Med"[Journal]',
  [JournalName.JCO]: '"J Clin Oncol"[Journal]'
};

const PUB_TYPE_QUERY_MAP: Record<PublicationType, string> = {
  [PublicationType.CLINICAL_TRIAL]: '"Clinical Trial"[Publication Type]',
  [PublicationType.RCT]: '"Randomized Controlled Trial"[Publication Type]',
  [PublicationType.META_ANALYSIS]: '"Meta-Analysis"[Publication Type]',
  [PublicationType.SYSTEMATIC_REVIEW]: '"Systematic Review"[Publication Type]'
};

export const fetchLatestArticles = async (
  days: number = 14,
  pubTypes: PublicationType[] = [],
  signal?: AbortSignal
): Promise<Article[]> => {
  try {
    // 1. Construct Search Query
    const journalTerms = Object.values(JOURNAL_QUERY_MAP).join(' OR ');
    
    // Date Query
    const dateQuery = `"last ${days} days"[dp]`;

    // Pub Type Query
    // If no types provided, default to all supported types to keep relevant results
    const typesToUse = pubTypes.length > 0 ? pubTypes : (Object.values(PublicationType) as PublicationType[]);
    const typeQueries = typesToUse.map(t => PUB_TYPE_QUERY_MAP[t]).filter(Boolean);
    const pubTypeQuery = `(${typeQueries.join(' OR ')})`;

    const term = `(${journalTerms}) AND ${dateQuery} AND ${pubTypeQuery}`;
    
    // ESearch: Find IDs (Increased retmax to 50 for broader filtering)
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=50&sort=date`;
    
    const searchRes = await fetchWithRetry(searchUrl, { signal });
    if (!searchRes.ok) throw new Error('PubMed Search Failed');
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist ?? [];

    if (ids.length === 0) {
      return [];
    }

    // 2. EFetch: Get Article Details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await fetchWithRetry(fetchUrl, { signal });
    if (!fetchRes.ok) throw new Error('PubMed Fetch Failed');
    const xmlText = await fetchRes.text();

    // 3. Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const articleNodes = xmlDoc.getElementsByTagName('PubmedArticle');

    const articles: Article[] = [];

    for (let i = 0; i < articleNodes.length; i++) {
      const node = articleNodes[i];
      
      const articleEl = node.querySelector('Article');
      if (!articleEl) continue;

      const title = articleEl.querySelector('ArticleTitle')?.textContent || 'Untitled';
      
      const abstractTexts = articleEl.querySelectorAll('AbstractText');
      let abstract = '';
      if (abstractTexts.length > 0) {
        abstract = Array.from(abstractTexts).map(el => {
          const label = el.getAttribute('Label');
          const text = el.textContent?.trim();
          if (!text) return null;
          return label ? `${label.toUpperCase()}: ${text}` : text;
        }).filter(Boolean).join('\n\n');
      } else {
        abstract = 'No abstract available.';
      }

      const authorList = articleEl.querySelectorAll('Author');
      const authors = Array.from(authorList).map(a => {
        const last = a.querySelector('LastName')?.textContent || '';
        const initials = a.querySelector('Initials')?.textContent || '';
        return `${last} ${initials}`;
      }).slice(0, 3);
      if (authorList.length > 3) authors.push('et al.');

      const journalTitleRaw = articleEl.querySelector('Journal > Title')?.textContent || '';
      let journalName = journalTitleRaw;
      
      if (journalTitleRaw.includes('New England')) journalName = JournalName.NEJM;
      else if (journalTitleRaw === 'JAMA') journalName = JournalName.JAMA;
      else if (journalTitleRaw.includes('Lancet')) journalName = JournalName.LANCET;
      else if (journalTitleRaw === 'BMJ') journalName = JournalName.BMJ;
      else if (journalTitleRaw.includes('Nature')) journalName = JournalName.NATURE_MED;
      else if (journalTitleRaw.includes('Annals')) journalName = JournalName.ANNALS;
      else if (journalTitleRaw.includes('Oncology')) journalName = JournalName.JCO;

      const pubDateEl = articleEl.querySelector('Journal > JournalIssue > PubDate');
      const year = pubDateEl?.querySelector('Year')?.textContent || new Date().getFullYear().toString();
      const month = pubDateEl?.querySelector('Month')?.textContent || '01';
      const day = pubDateEl?.querySelector('Day')?.textContent || '01';
      // Ensure zero-padding for sorting consistency
      const fmtMonth = month.length === 1 && !isNaN(Number(month)) ? `0${month}` : month;
      const fmtDay = day.length === 1 && !isNaN(Number(day)) ? `0${day}` : day;
      
      // Handle textual months if necessary (basic fallback)
      const dateStr = `${year}-${fmtMonth}-${fmtDay}`;

      const doiEl = node.querySelector('ELocationID[EIdType="doi"]');
      const doi = doiEl?.textContent;
      const link = doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${node.querySelector('PMID')?.textContent}/`;

      // Determine isTrial (keep logic for UI badge)
      const pubTypes = node.querySelectorAll('PublicationType');
      const isTrial = Array.from(pubTypes).some(pt => {
        const t = pt.textContent?.toLowerCase() || '';
        return (
          t.includes('clinical trial') ||
          t.includes('randomized controlled trial') ||
          t.includes('meta-analysis') ||
          t.includes('systematic review')
        );
      });

      articles.push({
        id: crypto.randomUUID(),
        title,
        journal: journalName,
        authors: authors.length ? authors : ['Unknown Authors'],
        pubDate: dateStr,
        abstract,
        doiLink: link,
        isTrial
      });
    }

    return articles;

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    console.error('PubMed API Error:', error);
    throw error;
  }
};
