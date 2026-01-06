# Repository Guidelines

## Project Structure & Module Organization

The app is a Vite + React + TypeScript project with most source files at the repo root. Key files include `App.tsx` for the main UI, `index.tsx` for bootstrapping, and `index.html` for the Vite entry template. Shared constants and types live in `constants.ts` and `types.ts`. UI building blocks live in `components/` (e.g., `components/ArticleCard.tsx`), and API helpers live in `services/` (e.g., `services/geminiService.ts`). Build output is generated into `dist/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server.
- `npm run build` produces a production build in `dist/`.
- `npm run preview` serves the production build locally for QA.

Local configuration uses `.env.local`. Set `GEMINI_API_KEY` before running the app.

## Coding Style & Naming Conventions

Use the existing TypeScript + React style: 2-space indentation, single quotes, and semicolons. Components are defined in PascalCase and exported from `components/` (e.g., `ArticleCard`). Hooks and variables use camelCase. Keep files colocated with their purpose: component UI in `components/`, API utilities in `services/`, and cross-cutting enums or types in `constants.ts` and `types.ts`.

## Testing Guidelines

No automated tests are configured yet. Validate changes by running `npm run dev` or `npm run preview` and manually exercising the UI flows (filters, search, refresh, and summaries). If you introduce tests later, add a script to `package.json` and colocate tests near their modules.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commits like `feat: refresh futuristic clinical UI`. Follow the pattern `<type>: <short summary>` (e.g., `fix: handle empty results`). For pull requests, include a concise description, steps to validate, and screenshots for UI changes. Link related issues when applicable.

## Security & Configuration Tips

Keep secrets in `.env.local` and avoid committing API keys. When sharing builds, use `npm run build` and avoid committing `dist/` unless the workflow explicitly requires it.
