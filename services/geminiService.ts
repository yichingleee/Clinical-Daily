import { GoogleGenAI, Type } from '@google/genai';
import { AISummary, Article, JournalName, PublicationType, Tag } from '../types';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const BATCH_SIZE = 5; // Number of articles to process per AI request for tags
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

// --- Tag Generation ---

interface TagGenerationInput {
  title: string;
  abstract: string;
  meshTerms: string[];
  publicationTypes: string[];
}

interface TagGenerationResult {
  typeTags: string[];
  subspecialtyTags: string[];
}

// Maps PubMed publication types to our tag names
const PUB_TYPE_TAG_MAP: Record<string, string> = {
  'clinical trial': 'Clinical Trial',
  'randomized controlled trial': 'RCT',
  'meta-analysis': 'Meta-Analysis',
  'systematic review': 'Systematic Review',
  'review': 'Review',
  'case reports': 'Case Report',
  'observational study': 'Observational Study',
  'cohort study': 'Cohort Study',
  'editorial': 'Editorial',
  'comment': 'Commentary',
  'letter': 'Letter',
};

// Common MeSH terms to subspecialty mapping
const MESH_TO_SUBSPECIALTY: Record<string, string> = {
  'cardiology': 'Cardiology',
  'heart': 'Cardiology',
  'cardiac': 'Cardiology',
  'cardiovascular': 'Cardiology',
  'myocardial': 'Cardiology',
  'neurology': 'Neurology',
  'brain': 'Neurology',
  'neurological': 'Neurology',
  'stroke': 'Neurology',
  'oncology': 'Oncology',
  'cancer': 'Oncology',
  'neoplasm': 'Oncology',
  'tumor': 'Oncology',
  'carcinoma': 'Oncology',
  'pulmonology': 'Pulmonology',
  'lung': 'Pulmonology',
  'respiratory': 'Pulmonology',
  'pulmonary': 'Pulmonology',
  'gastroenterology': 'Gastroenterology',
  'gastrointestinal': 'Gastroenterology',
  'liver': 'Hepatology',
  'hepatic': 'Hepatology',
  'kidney': 'Nephrology',
  'renal': 'Nephrology',
  'nephrology': 'Nephrology',
  'endocrinology': 'Endocrinology',
  'diabetes': 'Endocrinology',
  'thyroid': 'Endocrinology',
  'hormone': 'Endocrinology',
  'infectious': 'Infectious Disease',
  'infection': 'Infectious Disease',
  'viral': 'Infectious Disease',
  'bacterial': 'Infectious Disease',
  'rheumatology': 'Rheumatology',
  'arthritis': 'Rheumatology',
  'autoimmune': 'Rheumatology',
  'hematology': 'Hematology',
  'blood': 'Hematology',
  'leukemia': 'Hematology',
  'lymphoma': 'Hematology',
  'dermatology': 'Dermatology',
  'skin': 'Dermatology',
  'psychiatry': 'Psychiatry',
  'mental': 'Psychiatry',
  'depression': 'Psychiatry',
  'anxiety': 'Psychiatry',
  'pediatric': 'Pediatrics',
  'child': 'Pediatrics',
  'geriatric': 'Geriatrics',
  'elderly': 'Geriatrics',
  'ophthalmology': 'Ophthalmology',
  'eye': 'Ophthalmology',
  'orthopedic': 'Orthopedics',
  'bone': 'Orthopedics',
  'surgery': 'Surgery',
  'surgical': 'Surgery',
  'emergency': 'Emergency Medicine',
  'critical care': 'Critical Care',
  'intensive care': 'Critical Care',
  'icu': 'Critical Care',
};

// Extract type tags from publication types
const extractTypeTags = (pubTypes: string[]): Tag[] => {
  const tags: Tag[] = [];
  const seen = new Set<string>();

  for (const pubType of pubTypes) {
    const lower = pubType.toLowerCase();
    for (const [key, tagName] of Object.entries(PUB_TYPE_TAG_MAP)) {
      if (lower.includes(key) && !seen.has(tagName)) {
        seen.add(tagName);
        tags.push({
          id: `type-${tagName.toLowerCase().replace(/\s+/g, '-')}`,
          name: tagName,
          category: 'type',
        });
      }
    }
  }

  return tags;
};

// Extract subspecialty tags from MeSH terms
const extractSubspecialtyFromMesh = (meshTerms: string[]): Tag[] => {
  const subspecialties = new Set<string>();

  for (const term of meshTerms) {
    const lower = term.toLowerCase();
    for (const [keyword, subspecialty] of Object.entries(MESH_TO_SUBSPECIALTY)) {
      if (lower.includes(keyword)) {
        subspecialties.add(subspecialty);
      }
    }
  }

  return Array.from(subspecialties).map(name => ({
    id: `subspecialty-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    category: 'subspecialty' as const,
  }));
};

// Generate additional tags using AI for articles that need more context
export const generateArticleTags = async (
  articles: TagGenerationInput[]
): Promise<TagGenerationResult[]> => {
  if (!apiKey || articles.length === 0) {
    return articles.map(() => ({ typeTags: [], subspecialtyTags: [] }));
  }

  const prompt = `
    You are a medical research classifier. Analyze the following medical articles and identify:
    1. The primary study type/methodology (e.g., RCT, Cohort Study, Case-Control, Cross-sectional, etc.)
    2. The medical subspecialties relevant to each article (e.g., Cardiology, Oncology, Neurology, etc.)

    Articles to analyze:
    ${articles.map((a, i) => `
    Article ${i + 1}:
    Title: ${a.title}
    Abstract: ${a.abstract.substring(0, 500)}...
    MeSH Terms: ${a.meshTerms.slice(0, 10).join(', ')}
    `).join('\n')}

    For each article, return the most relevant subspecialties (1-3 max) based on the content.
    Only include subspecialties that are clearly relevant to the main focus of the research.
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
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subspecialtyTags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['subspecialtyTags'],
              },
            },
          },
          required: ['articles'],
        },
      },
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return result.articles.map((a: { subspecialtyTags: string[] }) => ({
        typeTags: [],
        subspecialtyTags: a.subspecialtyTags || [],
      }));
    }
  } catch (error) {
    console.error('Error generating tags:', error);
  }

  return articles.map(() => ({ typeTags: [], subspecialtyTags: [] }));
};

// Combine metadata-based and AI-generated tags
const combineAndDeduplicateTags = (
  metadataTags: Tag[],
  aiSubspecialties: string[]
): Tag[] => {
  const allTags = [...metadataTags];
  const existingNames = new Set(metadataTags.map(t => t.name.toLowerCase()));

  for (const subspecialty of aiSubspecialties) {
    const normalized = subspecialty.trim();
    if (normalized && !existingNames.has(normalized.toLowerCase())) {
      existingNames.add(normalized.toLowerCase());
      allTags.push({
        id: `subspecialty-${normalized.toLowerCase().replace(/\s+/g, '-')}`,
        name: normalized,
        category: 'subspecialty',
      });
    }
  }

  return allTags;
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
  [PublicationType.SYSTEMATIC_REVIEW]: '"Systematic Review"[Publication Type]',
  [PublicationType.NARRATIVE_REVIEW]: '"Review"[Publication Type]'
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

    // First pass: Parse all articles with basic data
    interface ParsedArticleData {
      pmid: string;
      title: string;
      journal: string;
      authors: string[];
      pubDate: string;
      abstract: string;
      doiLink: string;
      isTrial: boolean;
      meshTerms: string[];
      publicationTypes: string[];
    }

    const parsedArticles: ParsedArticleData[] = [];

    for (let i = 0; i < articleNodes.length; i++) {
      const node = articleNodes[i];

      const articleEl = node.querySelector('Article');
      if (!articleEl) continue;

      const pmid = node.querySelector('PMID')?.textContent || '';
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
      const link = doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      // Parse MeSH terms
      const meshHeadings = node.querySelectorAll('MeshHeading DescriptorName');
      const meshTerms = Array.from(meshHeadings).map(el => el.textContent || '').filter(Boolean);

      // Parse publication types
      const pubTypeEls = node.querySelectorAll('PublicationType');
      const publicationTypes = Array.from(pubTypeEls).map(el => el.textContent || '').filter(Boolean);

      // Determine isTrial (keep logic for UI badge)
      const isTrial = publicationTypes.some(t => {
        const lower = t.toLowerCase();
        return (
          lower.includes('clinical trial') ||
          lower.includes('randomized controlled trial') ||
          lower.includes('meta-analysis') ||
          lower.includes('systematic review')
        );
      });

      parsedArticles.push({
        pmid,
        title,
        journal: journalName,
        authors: authors.length ? authors : ['Unknown Authors'],
        pubDate: dateStr,
        abstract,
        doiLink: link,
        isTrial,
        meshTerms,
        publicationTypes,
      });
    }

    // Second pass: Generate tags from metadata
    const articlesWithMetadataTags = parsedArticles.map(article => {
      const typeTags = extractTypeTags(article.publicationTypes);
      const meshSubspecialties = extractSubspecialtyFromMesh(article.meshTerms);
      return {
        ...article,
        metadataTags: [...typeTags, ...meshSubspecialties],
      };
    });

    // Third pass: Generate AI tags in batches for articles that could use more context
    let aiTagResults: TagGenerationResult[] = [];
    try {
      // Process in batches to avoid overloading the AI
      for (let i = 0; i < articlesWithMetadataTags.length; i += BATCH_SIZE) {
        const batch = articlesWithMetadataTags.slice(i, i + BATCH_SIZE);
        const batchInputs: TagGenerationInput[] = batch.map(a => ({
          title: a.title,
          abstract: a.abstract,
          meshTerms: a.meshTerms,
          publicationTypes: a.publicationTypes,
        }));

        const batchResults = await generateArticleTags(batchInputs);
        aiTagResults = aiTagResults.concat(batchResults);
      }
    } catch (error) {
      console.error('Error generating AI tags:', error);
      // Fall back to empty AI tags
      aiTagResults = parsedArticles.map(() => ({ typeTags: [], subspecialtyTags: [] }));
    }

    // Final pass: Combine all tags and create Article objects
    const articles: Article[] = articlesWithMetadataTags.map((article, index) => {
      const aiTags = aiTagResults[index] || { typeTags: [], subspecialtyTags: [] };
      const combinedTags = combineAndDeduplicateTags(
        article.metadataTags,
        aiTags.subspecialtyTags
      );

      return {
        id: crypto.randomUUID(),
        pmid: article.pmid,
        title: article.title,
        journal: article.journal,
        authors: article.authors,
        pubDate: article.pubDate,
        abstract: article.abstract,
        doiLink: article.doiLink,
        isTrial: article.isTrial,
        tags: combinedTags,
        meshTerms: article.meshTerms,
      };
    });

    return articles;

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    console.error('PubMed API Error:', error);
    throw error;
  }
};
