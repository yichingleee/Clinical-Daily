import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, Article, JournalName, PublicationType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Gemini Summarization (unchanged) ---

export const generateClinicalSummary = async (abstract: string): Promise<AISummary> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
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
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            researchDesign: { type: Type.STRING },
            studyPopulation: { type: Type.STRING },
            interventions: { type: Type.STRING },
            endpoints: { type: Type.STRING },
            results: { type: Type.STRING },
          },
          required: ["researchDesign", "studyPopulation", "interventions", "endpoints", "results"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AISummary;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};

// --- PubMed API Integration ---

const JOURNAL_QUERY_MAP: Record<string, string> = {
  "NEJM": '"N Engl J Med"[Journal]',
  "JAMA": '"JAMA"[Journal]',
  "The Lancet": '"Lancet"[Journal]',
  "BMJ": '"BMJ"[Journal]',
  "Nature Medicine": '"Nat Med"[Journal]',
  "Annals of Internal Medicine": '"Ann Intern Med"[Journal]',
  "Journal of Clinical Oncology": '"J Clin Oncol"[Journal]'
};

const PUB_TYPE_QUERY_MAP: Record<string, string> = {
  [PublicationType.CLINICAL_TRIAL]: '"Clinical Trial"[Publication Type]',
  [PublicationType.RCT]: '"Randomized Controlled Trial"[Publication Type]',
  [PublicationType.META_ANALYSIS]: '"Meta-Analysis"[Publication Type]',
  [PublicationType.SYSTEMATIC_REVIEW]: '"Systematic Review"[Publication Type]'
};

export const fetchLatestArticles = async (days: number = 14, pubTypes: string[] = []): Promise<Article[]> => {
  try {
    // 1. Construct Search Query
    const journalTerms = Object.values(JOURNAL_QUERY_MAP).join(' OR ');
    
    // Date Query
    const dateQuery = `"last ${days} days"[dp]`;

    // Pub Type Query
    // If no types provided, default to all supported types to keep relevant results
    const typesToUse = pubTypes.length > 0 ? pubTypes : Object.values(PublicationType);
    const typeQueries = typesToUse.map(t => PUB_TYPE_QUERY_MAP[t] || "").filter(Boolean);
    const pubTypeQuery = `(${typeQueries.join(' OR ')})`;

    const term = `(${journalTerms}) AND ${dateQuery} AND ${pubTypeQuery}`;
    
    // ESearch: Find IDs (Increased retmax to 50 for broader filtering)
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=50&sort=date`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error("PubMed Search Failed");
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist;

    if (!ids || ids.length === 0) {
      return [];
    }

    // 2. EFetch: Get Article Details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) throw new Error("PubMed Fetch Failed");
    const xmlText = await fetchRes.text();

    // 3. Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const articleNodes = xmlDoc.getElementsByTagName("PubmedArticle");

    const articles: Article[] = [];

    for (let i = 0; i < articleNodes.length; i++) {
      const node = articleNodes[i];
      
      const articleEl = node.querySelector("Article");
      if (!articleEl) continue;

      const title = articleEl.querySelector("ArticleTitle")?.textContent || "Untitled";
      
      const abstractTexts = articleEl.querySelectorAll("AbstractText");
      let abstract = "";
      if (abstractTexts.length > 0) {
        abstract = Array.from(abstractTexts).map(el => {
          const label = el.getAttribute("Label");
          const text = el.textContent?.trim();
          if (!text) return null;
          return label ? `${label.toUpperCase()}: ${text}` : text;
        }).filter(Boolean).join("\n\n");
      } else {
        abstract = "No abstract available.";
      }

      const authorList = articleEl.querySelectorAll("Author");
      const authors = Array.from(authorList).map(a => {
        const last = a.querySelector("LastName")?.textContent || "";
        const initials = a.querySelector("Initials")?.textContent || "";
        return `${last} ${initials}`;
      }).slice(0, 3);
      if (authorList.length > 3) authors.push("et al.");

      const journalTitleRaw = articleEl.querySelector("Journal > Title")?.textContent || "";
      let journalName = journalTitleRaw;
      
      if (journalTitleRaw.includes("New England")) journalName = JournalName.NEJM;
      else if (journalTitleRaw === "JAMA") journalName = JournalName.JAMA;
      else if (journalTitleRaw.includes("Lancet")) journalName = JournalName.LANCET;
      else if (journalTitleRaw === "BMJ") journalName = JournalName.BMJ;
      else if (journalTitleRaw.includes("Nature")) journalName = JournalName.NATURE_MED;
      else if (journalTitleRaw.includes("Annals")) journalName = JournalName.ANNALS;
      else if (journalTitleRaw.includes("Oncology")) journalName = JournalName.JCO;

      const pubDateEl = articleEl.querySelector("Journal > JournalIssue > PubDate");
      const year = pubDateEl?.querySelector("Year")?.textContent || new Date().getFullYear().toString();
      const month = pubDateEl?.querySelector("Month")?.textContent || "01";
      const day = pubDateEl?.querySelector("Day")?.textContent || "01";
      // Ensure zero-padding for sorting consistency
      const fmtMonth = month.length === 1 && !isNaN(Number(month)) ? `0${month}` : month;
      const fmtDay = day.length === 1 && !isNaN(Number(day)) ? `0${day}` : day;
      
      // Handle textual months if necessary (basic fallback)
      const dateStr = `${year}-${fmtMonth}-${fmtDay}`;

      const doiEl = node.querySelector('ELocationID[EIdType="doi"]');
      const doi = doiEl?.textContent;
      const link = doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${node.querySelector("PMID")?.textContent}/`;

      // Determine isTrial (keep logic for UI badge)
      const pubTypes = node.querySelectorAll("PublicationType");
      let isTrial = false;
      pubTypes.forEach(pt => {
        const t = pt.textContent?.toLowerCase() || "";
        if (
          t.includes("clinical trial") || 
          t.includes("randomized controlled trial") ||
          t.includes("meta-analysis") ||
          t.includes("systematic review")
        ) {
          isTrial = true;
        }
      });

      articles.push({
        id: crypto.randomUUID(),
        title,
        journal: journalName,
        authors: authors.length ? authors : ["Unknown Authors"],
        pubDate: dateStr,
        abstract,
        doiLink: link,
        isTrial
      });
    }

    return articles;

  } catch (error) {
    console.error("PubMed API Error:", error);
    return [];
  }
};
