# Echo

**Echo** is a movie and TV show discovery and subscription web application developed for **CPS714 Software Project Management** at Toronto Metropolitan University.

The project is built by a team of three using Agile Scrum, with Jira for sprint planning and task tracking and GitHub for version control.

Users can browse movies and TV shows, explore content details and compare subscription plans. Echo+ is the premium subscription tier, with additional features planned throughout development.

**Live website:** https://echo-watch.vercel.app/

> **Note:** Echo is a course project. Subscriptions and viewing are simulated. No real payments are processed and no video streaming is provided.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Next.js (App Router) | Web application framework |
| React | User interface |
| TypeScript | Application development |
| Tailwind CSS | Styling |
| Supabase | Authentication and database |
| TMDB API | Movie and TV show information |
| Vercel | Deployment and hosting |
| Jira | Sprint planning and project management |
| GitHub | Version control and collaboration |

## Features

The following features were completed during Sprint 1:

- User registration, login and logout
- Password reset and account management
- Browse movies and TV shows
- View content details, cast, seasons and episodes
- Search for movies and shows by title
- View average TMDB ratings
- View Echo+ subscription requirements
- Compare free, monthly and annual subscription plans

Additional functionality, including subscription management and watchlists, is planned for later sprints.

## Project Management

Echo is developed as part of CPS714 using the Scrum framework.

The team works in sprints, with user stories organized and tracked through Jira. Each sprint includes planning, development, testing and a review of completed work.


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
| `TMDB_API_TOKEN` | TMDB API read access token |

The Supabase values can be found in your Supabase project settings. The TMDB token is available through your TMDB account's API settings.

Do not commit `.env.local` to GitHub.

### 3. Run the application

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |

## Project Structure

```text
src/
├── app/              # Pages and routes
├── components/       # Shared UI components
├── lib/
│   ├── supabase/     # Supabase clients
│   └── tmdb/         # TMDB API helpers
├── types/            # Shared TypeScript types
└── proxy.ts          # Supabase session handling

supabase/             # Database migrations and RLS
```

## Design

Echo uses a dark interface with green accents and a separate champagne colour for Echo+ features.

The design tokens are defined in `src/app/globals.css` using Tailwind CSS v4. Shared components and colour tokens are used throughout the application to keep the interface consistent.

## Deployment

Echo is hosted on Vercel.

**Website:** https://echo-watch.vercel.app/


## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
