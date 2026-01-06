# Implementation Plan

## Scope
Address the review items:
- Duplicate PubMed requests and occasional fetch failures.
- Missing favicon 404.
- Node version mismatch with dependencies.

## Step-by-step Technical Plan

### 1) Stabilize PubMed fetching and surface errors
1. Add an `AbortController` in `App.tsx` for each `fetchLatestArticles` call.
2. Track the current request with a `useRef` so a new filter change cancels the previous request.
3. Update `handleFetchLive` to:
   - Cancel any in-flight request before starting a new one.
   - Pass `signal` into `fetchLatestArticles`.
   - Set a user-visible error state if the request fails (except for abort errors).
4. In the main feed UI in `App.tsx`, add a compact error banner above the results (e.g., under the header row) with a retry button that calls `handleFetchLive`.
5. Ensure cleanup on unmount: abort any in-flight request in a `useEffect` cleanup.

Files:
- `App.tsx`
- `services/geminiService.ts`

### 2) Add retry/backoff to reduce PubMed rate-limit failures
1. In `services/geminiService.ts`, wrap PubMed fetches with a small retry helper:
   - 1 to 2 retries.
   - Exponential backoff (e.g., 250ms, 750ms) with jitter.
   - Only retry on network errors or 5xx responses; do not retry on 4xx.
2. Ensure the helper respects `AbortController` signals (do not retry if aborted).
3. Keep the retry logic minimal and contained to PubMed calls only.

Files:
- `services/geminiService.ts`

### 3) Remove favicon 404
1. Add a small favicon in `public/favicon.ico`.
2. Ensure `index.html` includes `<link rel="icon" href="/favicon.ico" />` (if not already present).

Files:
- `public/favicon.ico`
- `index.html`

### 4) Align Node version expectations
1. Decide on Node 20+ as the supported runtime (matches dependency engine requirements).
2. Update `README.md` to state Node 20+.
3. Add an `engines` field to `package.json` to enforce Node 20+.

Files:
- `README.md`
- `package.json`

## Validation Plan
1. Run `npm install` on Node 20+.
2. Run `npm run dev` and verify:
   - Initial fetch populates articles.
   - Changing time window and study types cancels previous request and updates results.
   - Error banner shows when PubMed fetch fails (simulate by blocking network or using invalid URL temporarily).
   - Retry button works.
   - Favicon loads with no 404.
3. Trigger `Summarize Trial` and confirm AI summary renders.

## Notes
- The PubMed API is rate-limited; retries should be minimal to avoid extra load.
- If `React.StrictMode` is kept, double-invocation in dev will still occur, but the abort logic will prevent duplicate in-flight requests.
