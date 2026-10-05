# Echo

Echo is a movie and TV show subscription system developed as a CPS714 Software Project Management group project. Users with an active subscription get **Echo+**, the subscribed experience.

Subscriptions and viewing are simulated. There is no real payment processing or video streaming.

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Supabase (authentication and Echo-specific data)
- TMDB API (movie and TV metadata)
- Vercel (deployment and hosting)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` by copying `.env.local.example`, then fill in the values:

   | Variable | Where to find it | Exposed to browser |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API | Yes |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys (publishable key) | Yes |
   | `TMDB_API_TOKEN` | TMDB > Settings > API (API Read Access Token) | No |

   Never commit `.env.local`. The app still builds without these values; features that need them will not work until they are set.

3. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` starts the development server
- `npm run lint` runs ESLint
- `npm run build` creates a production build

## Project structure

- `src/app/` routes (App Router)
- `src/components/` shared UI components
- `src/lib/supabase/` Supabase clients for the browser, server, and proxy
- `src/lib/tmdb/` server-side TMDB helpers
- `src/types/` shared TypeScript types
- `src/proxy.ts` refreshes Supabase auth sessions on each request
- `supabase/` database migrations and Row Level Security conventions

## Design system

Colour tokens are defined once in `src/app/globals.css` (Tailwind v4 `@theme`). Tailwind's default colour palette is disabled, so use Echo's tokens instead of hex values:

| Token | Use |
| --- | --- |
| `background` | Page background |
| `surface` | Navbar and primary surfaces |
| `elevated` | Cards and raised elements |
| `line` | Borders (`border-line`) |
| `foreground` / `muted` | Primary / secondary text |
| `accent` / `accent-hover` | Echo green: primary actions, active states |
| `premium` | Echo+ champagne: premium indicators only |
| `danger` | Error messages |

Keep the UI dark and restrained: green is an accent, not a section colour; use 4 to 8px radii (`rounded-md`); avoid gradients, glows and heavy shadows. Use `ButtonLink` (or `buttonClassName()` for `<button>`) for actions and `EchoPlus` for the Echo+ wordmark.

## Deployment

Echo will be deployed on Vercel using the standard Next.js setup. Environment variables are configured in the Vercel project settings, not committed to the repository.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
