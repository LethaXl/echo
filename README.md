<p align="center">
  <img src="public/echo-logo.png" alt="Echo" width="220">
</p>

---

**Echo** is a movie and TV discovery and simulated subscription platform developed for **CPS714 Software Project Management** at Toronto Metropolitan University.

The project is built by a team of three using Agile Scrum, with Jira for sprint planning and task tracking and GitHub for version control.

Visitors can browse and search movies and TV shows, explore title details and use Start an Echo to follow one title into the next. Echo+ is the premium subscription tier: it unlocks the simulated viewer and Cave, where members keep their watchlist, viewing status and ratings. Administrators manage content, plans and user accounts from the Admin Panel.

**Live website:** https://echo-watch.vercel.app/

> **Note:** Echo is a course project. Subscriptions and video playback are simulated. No real payments are processed and no actual video streaming occurs.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Next.js 16 (App Router) | Web application framework |
| React 19 | User interface |
| TypeScript | Application development |
| Tailwind CSS v4 | Styling |
| Supabase | Authentication, Postgres database and Row Level Security |
| TMDB API | Movie and TV show information |
| Vercel | Deployment and hosting |
| Jira | Sprint planning and project management |
| GitHub | Version control and collaboration |

## Features

### Accounts

- Registration, login and logout, with sessions that persist across visits
- Password reset by email and password changes
- Account page to update your name, view and manage your subscription, review subscription history and delete your account

### Discovery

- Browse movies and TV shows with type, genre and release year filters and sorting
- Search for movies and shows by title
- Title pages with cast, seasons, episodes and average TMDB ratings
- **Start an Echo:** a recommendation chain that follows one title into a related one, step by step

### Echo+ Subscriptions (simulated)

- Compare the Free, Echo+ Monthly and Echo+ Annual plans
- Subscribe with password confirmation, upgrade from monthly to annual, switch from annual to monthly at renewal, cancel or downgrade at the end of the period, and resume a scheduled change
- Simulated automatic renewals and a subscription history

### Cave (Echo+)

- **Watchlist:** save movies and shows, then search, filter and sort them
- **Viewing Status:** mark titles as Watching or Completed and review your viewing activity
- **Echo Wave Ratings:** rate titles from 1 to 5 and see the titles you've rated

### Simulated Viewer (Echo+)

- Simulated playback of movies and TV episodes, with play, pause, restart, seek, full screen and next episode controls
- Keyboard shortcuts and a playback progress bar

### Admin Panel

Available only to accounts assigned the admin role in Supabase.

- **Content Management:** search the catalogue, add titles from a TMDB link, edit title and episode details and artwork, and hide or restore titles, seasons and episodes
- **Subscription Plans:** manage plan availability, benefits and prices
- **User Management:** search and filter accounts, view account and subscription details, and deactivate or reactivate regular user accounts
- **Subscription Overview:** totals for Free, Echo+ Monthly and Echo+ Annual accounts

### Responsive Design

- Layouts for desktop and mobile, including mobile navigation, a mobile filter panel and touch-friendly viewer controls

## Design

Echo uses a dark, cinematic interface with green accents. Echo+ features use a separate champagne colour so premium content stands out.

The design tokens are defined in `src/app/globals.css` using Tailwind CSS v4. Shared components and colour tokens keep the interface consistent across desktop and mobile layouts.

## Project Management

Echo is developed as part of CPS714 using the Scrum framework.

The team works in sprints, with user stories organized and tracked through Jira and code managed through GitHub. Each sprint includes planning, development, testing and a review of completed work. Echo was completed over four sprints.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and add the required values.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `TMDB_API_TOKEN` | TMDB API read access token (server-side only) |

The Supabase values can be found in your Supabase project settings. The TMDB token is available through your TMDB account's API settings. Never prefix the TMDB token or any Supabase secret key with `NEXT_PUBLIC_`.

Do not commit `.env.local` to GitHub.

### 3. Set up the database

Apply the SQL migrations in `supabase/migrations/` in order through the Supabase SQL Editor. See [`supabase/README.md`](supabase/README.md) for the order, what each migration does and how to assign the admin role.

### 4. Run the application

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```text
src/
├── app/              # Pages and routes, including /admin
├── components/       # Shared UI components
├── lib/
│   ├── admin/        # Admin queries and actions
│   ├── supabase/     # Supabase clients
│   ├── tmdb/         # TMDB API helpers
│   └── ...           # Accounts, subscriptions, watchlist, ratings, viewer
├── types/            # Shared TypeScript types
└── proxy.ts          # Supabase session handling

supabase/             # Database migrations, RLS policies and setup notes
public/               # Logos and static assets
```

## Deployment

Echo is hosted on Vercel.

**Website:** https://echo-watch.vercel.app/

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
