# CLAUDE.md - ClinicalDaily Developer Guide for AI Assistants

For repository-wide guidelines, commands, and testing expectations, refer to `AGENTS.md`.

## Project Overview

**ClinicalDaily** is a web-based medical research aggregator that provides on-demand, AI-structured summaries for high-impact clinical trials. It fetches the latest peer-reviewed research from top medical journals (NEJM, JAMA, The Lancet, BMJ, Nature Medicine, Annals of Internal Medicine, and Journal of Clinical Oncology) via the PubMed API and uses Google's Gemini AI to generate structured clinical summaries.

### Core Features
- Real-time PubMed article fetching with date range and publication type filtering
- Client-side filtering by journal and keyword search
- AI-powered clinical trial summarization (on-demand)
- Futuristic medical UI with glassmorphism design
- Responsive layout (mobile-first approach)

### AI Studio Integration
View app in AI Studio: https://ai.studio/apps/drive/1IBM9TMpf_r7IbEk5KFGfLvjcVgGqiJ2e

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.3 | UI framework with hooks (useState, useMemo, useEffect) |
| **TypeScript** | ~5.8.2 | Type-safe development |
| **Vite** | ^6.2.0 | Build tool and dev server (runs on port 3000) |
| **Tailwind CSS** | via CDN | Utility-first CSS framework with custom medical theme |
| **Google Gemini AI** | @google/genai ^1.34.0 | AI summarization (gemini-3-flash-preview model) |
| **PubMed E-utilities API** | N/A | Article data source (REST API, XML responses) |
| **Lucide React** | ^0.562.0 | Icon library |

### Import Map Strategy
The project uses an import map in `index.html` to load dependencies via ESM from esm.sh CDN. No traditional npm bundling for production - dependencies are resolved at runtime.

---

## Codebase Structure

```
Clinical-Daily/
├── components/
│   └── ArticleCard.tsx          # Article display with AI summary capability
├── services/
│   └── geminiService.ts         # Gemini AI + PubMed API integration
├── App.tsx                      # Main application component (filtering, state management)
├── types.ts                     # TypeScript interfaces and enums
├── constants.ts                 # Static data (journals, pub types, date ranges)
├── index.tsx                    # React root entry point
├── index.html                   # HTML shell with Tailwind config and import map
├── vite.config.ts               # Vite configuration with GEMINI_API_KEY injection
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
└── metadata.json                # App metadata for AI Studio
```

### File Responsibilities

#### `App.tsx` (375 lines)
- **State Management**: Articles, filters (journals, pub types, date range), search, sort, UI (sidebar, refresh)
- **Effects**: Auto-fetch on mount and when date range or publication types change
- **Client-Side Logic**: Filtering (journal + search query) and sorting (newest/oldest)
- **Layout**: Sticky header, responsive sidebar (desktop sticky, mobile overlay), main feed

#### `components/ArticleCard.tsx` (191 lines)
- Displays article metadata (title, journal, authors, pub date, abstract)
- "Summarize Trial" button triggers AI summary generation
- Renders structured AI summary in 2-column grid (research design, population, interventions, endpoints, results)
- Handles abstract parsing (detects structured abstracts with labels like "BACKGROUND:", "METHODS:")

#### `services/geminiService.ts` (210 lines)
- **`generateClinicalSummary(abstract: string): Promise<AISummary>`**: Uses Gemini AI with structured JSON schema output
- **`fetchLatestArticles(days: number, pubTypes: string[]): Promise<Article[]>`**:
  - Builds PubMed query with journal filters, date range, publication types
  - Fetches up to 50 recent articles
  - Parses XML response using DOMParser
  - Maps journal names to standardized enum values
  - Returns Article[] with structured data

#### `types.ts` (39 lines)
- **`Article`**: id, title, journal, authors, pubDate, abstract, doiLink, isTrial, cachedSummary?
- **`AISummary`**: researchDesign, studyPopulation, interventions, endpoints, results
- **`JournalName`**: Enum for 7 supported journals
- **`PublicationType`**: Enum for Clinical Trial, RCT, Meta-Analysis, Systematic Review
- **`SortOption`**: 'newest' | 'oldest'

#### `constants.ts` (12 lines)
- **`ALL_JOURNALS`**: Array of all JournalName enum values
- **`ALL_PUBLICATION_TYPES`**: Array of all PublicationType enum values
- **`DATE_RANGES`**: Array of { label, value } for 7, 14, 30 days

---

## Architecture & Data Flow

### State Management Pattern
- **React Hooks**: All state uses `useState`
- **No external state library**: Keep it simple with prop drilling and lifting state up
- **Memoization**: `useMemo` for expensive filtering/sorting operations

### Data Flow
```
1. User Action (filter change) → App.tsx state update
2. If server-side filter (date/pubType) → useEffect → fetchLatestArticles()
3. PubMed API → XML parsing → setArticles()
4. Client-side filtering → useMemo → processedArticles
5. Render ArticleCard[] with processed data
6. User clicks "Summarize Trial" → generateClinicalSummary() → onSummaryGenerated callback → Update article.cachedSummary
```

### Component Hierarchy
```
App
├── Header (sticky)
│   ├── Logo
│   ├── Search Input (desktop + mobile)
│   └── Date Display
├── Sidebar (desktop: sticky, mobile: overlay)
│   ├── Date Range Filters (radio)
│   ├── Publication Type Filters (checkbox)
│   └── Journal Filters (checkbox)
└── Main Feed
    ├── Feed Header (title + controls)
    │   ├── Sort Dropdown
    │   ├── Article Count
    │   └── Refresh Button
    └── ArticleCard[] (mapped from processedArticles)
        ├── Article Header (journal badge, trial badge, title, authors, date)
        ├── Abstract Preview
        ├── "Summarize Trial" Button (if isTrial && !cachedSummary)
        └── AI Summary Panel (if cachedSummary exists)
```

---

## Styling Conventions

### Design System
- **Color Palette**: Custom medical/clinical theme with accent colors
  - `surface`: #05070f (darkest background)
  - `panel`: #0b1324 (card backgrounds)
  - `edge`: #111a2f (input backgrounds)
  - `accent-400`: #5df3ff (primary accent - cyan)
  - `medical-700`: #5df3ff (gradient companion)
- **Typography**:
  - Sans: "Sora" (display text, body)
  - Mono: "DM Mono" (labels, metadata, uppercase tracking)
- **Effects**:
  - Glassmorphism: `backdrop-blur-xl`, `bg-white/5`, borders with `border-white/10`
  - Glow shadows: `shadow-glow` custom class
  - Gradients: Radial gradients for accents, linear for buttons

### Tailwind Usage Patterns
- **Responsive**: Mobile-first with `md:` and `lg:` breakpoints
- **Spacing**: Consistent use of `gap-{n}`, `space-y-{n}`, `p-{n}`
- **Borders**: Always use `border border-white/10` for subtle outlines
- **Transitions**: `transition-all` for hover states
- **Uppercase Labels**: `text-xs font-mono uppercase tracking-[0.2em]` pattern for section headers

### Component Styling Rules
1. Cards use `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl`
2. Buttons use gradient backgrounds: `bg-gradient-to-r from-accent-500 to-medical-700`
3. Input fields use `bg-edge/80 border border-white/10` with focus rings
4. Icons are always paired with text using flexbox: `flex items-center gap-2`

---

## Development Workflows

### Adding a New Feature
1. **Define Types First**: Update `types.ts` with new interfaces
2. **Update Constants**: Add to `constants.ts` if introducing new filter options
3. **Service Layer**: Modify `geminiService.ts` for API changes
4. **Component Logic**: Update `App.tsx` state and handlers
5. **UI Components**: Create/modify components with consistent styling
6. **Test Locally**: `npm run dev` and verify all states

### Modifying Filters
**Server-Side Filters** (trigger API refetch):
- Date range
- Publication types
→ Update `useEffect` dependency array in App.tsx

**Client-Side Filters** (process existing data):
- Journal selection
- Search query
→ Update `processedArticles` useMemo logic

### Working with PubMed API
- **E-utilities Base**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- **ESearch**: Find PMIDs with query terms, returns JSON
- **EFetch**: Get article details with PMIDs, returns XML
- **Query Syntax**: Use field tags like `[Journal]`, `[Publication Type]`, `[dp]` for date published
- **XML Parsing**: Use DOMParser, querySelector for nodes like `ArticleTitle`, `AbstractText`, `Author`

### AI Summary Customization
To modify summary structure:
1. Update `AISummary` interface in `types.ts`
2. Update Gemini prompt in `generateClinicalSummary()`
3. Update response schema (must match interface exactly)
4. Update ArticleCard UI rendering in the summary panel

---

## Environment & Configuration

### Required Environment Variables
```bash
GEMINI_API_KEY=<your-google-gemini-api-key>
```
- Set in `.env.local` (not tracked in git per .gitignore `*.local` rule)
- Vite injects as `process.env.API_KEY` via vite.config.ts

### Running Locally
```bash
# Install dependencies
npm install

# Lint
npm run lint

# Set API key in .env.local
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Start dev server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (automatic runtime)
- Paths: `@/*` maps to project root
- Strict: Basic strictness (no noEmit, allows JS)

---

## Key Conventions for AI Assistants

### Code Style Rules
1. **Functional Components Only**: Use `const ComponentName: React.FC` pattern
2. **Hooks Order**:
   - Data state
   - Filter state
   - View state
   - UI state
   - Effects
   - Handlers
   - Render logic
3. **Event Handlers**: Prefix with `handle` (e.g., `handleFetchLive`, `handleSummaryGenerated`)
4. **Toggle Functions**: Prefix with `toggle` (e.g., `toggleJournal`, `toggleAllJournals`)
5. **Prop Interfaces**: Name as `{ComponentName}Props`
6. **File Organization**: One component per file, exports at bottom

### TypeScript Best Practices
- Always type function parameters and return types
- Use enums for fixed sets of values (JournalName, PublicationType)
- Prefer interfaces over types for object shapes
- Use optional chaining for potentially undefined values
- Type useState with explicit generics: `useState<Article[]>([])`

### State Management Guidelines
- **Lift state to App.tsx** if shared across components
- **Use callbacks** for child-to-parent communication
- **Avoid prop drilling beyond 2 levels** - if needed, consider composition
- **Server state vs. UI state**: Keep fetch-dependent state in App, local UI state in components

### API Integration Patterns
- **Error Handling**: Always wrap fetch calls in try/catch
- **Loading States**: Use boolean flags with button disabled states
- **Error Display**: Show user-friendly messages, log technical errors to console
- **API Keys**: Never hardcode, always use environment variables

### UI/UX Patterns to Follow
1. **Disabled States**: Show loading spinner + "...ing" text (e.g., "Fetching...", "Analyzing Trial...")
2. **Empty States**: Provide actionable guidance + reset button
3. **Hover Effects**: Use `hover:` classes for all interactive elements
4. **Focus States**: Always include `focus:ring-2 focus:ring-accent-500` for inputs
5. **Mobile-First**: Write mobile styles first, add `md:` and `lg:` for larger screens

### Common Pitfalls to Avoid
1. **Don't fetch on every filter change**: Only date/pubType should trigger API calls
2. **Don't mutate state directly**: Always use setter functions
3. **Don't forget loading/error states**: Every async operation needs both
4. **Don't skip accessibility**: Include proper labels, semantic HTML, keyboard navigation
5. **Don't hardcode values**: Use constants and enums
6. **Don't break the glassmorphism aesthetic**: Maintain consistent backdrop-blur and transparency

### Testing Considerations
- Test with empty API responses (no articles found)
- Test with missing abstracts or DOIs
- Test mobile sidebar overlay behavior
- Test filter combinations (all journals vs. none)
- Test search with special characters
- Verify date sorting works correctly

### When Modifying This Codebase
1. **Read existing patterns first**: Don't introduce new patterns without reason
2. **Match the visual style**: Use the existing color palette and spacing system
3. **Update types before logic**: TypeScript will guide you to all necessary changes
4. **Test all filter combinations**: Server-side + client-side interactions
5. **Preserve responsiveness**: Test at mobile, tablet, desktop breakpoints
6. **Document complex logic**: Add comments for non-obvious business logic

### Git Workflow
- Branch naming: Use descriptive names (e.g., `feature/add-export-functionality`, `fix/date-parsing-bug`)
- Commit messages: Use conventional commits (feat:, fix:, docs:, refactor:)
- Never commit `.env.local` or API keys
- Keep commits focused and atomic

---

## API References

### PubMed E-utilities
- Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- Rate Limit: 3 requests/second without API key, 10/second with key
- Supported Journals Query Mapping (see `JOURNAL_QUERY_MAP` in geminiService.ts)

### Google Gemini AI
- Model: gemini-3-flash-preview
- Response Type: JSON with structured schema
- Configuration: responseMimeType: "application/json", responseSchema with Type.OBJECT
- Prompt Engineering: System role as "expert clinical research assistant"

---

## Future Enhancement Ideas
- Add pagination for large result sets
- Implement article bookmarking/favorites (localStorage or backend)
- Add export functionality (PDF, CSV)
- Introduce more granular filters (author search, MeSH terms)
- Add article detail modal with full text preview
- Implement dark/light theme toggle (currently dark-only)
- Add user authentication and personalized feeds
- Integrate citation export (BibTeX, RIS)

---

## Questions or Issues?
- GitHub: https://github.com/anthropics/claude-code/issues
- For AI Studio-specific questions, refer to metadata.json for app details

---

**Last Updated**: 2026-01-25
**Codebase Version**: Based on commit `6754753` (feat: refresh futuristic clinical UI)
