# Concertly

A progressive web app for logging the live shows you've been to, and seeing what your concert history actually looks like once it's all in one place.

**Live app:** [concertly.lovable.app](https://concertly.lovable.app/)

## What it does

**Fast logging.** Add a show with artist, venue, city, date and rating. Setlists and opening acts are pulled in automatically from setlist.fm where a match exists, so most entries take a few seconds.

**Stats and insights.** Top artists, most-visited venues, distance travelled, spend, attendance heatmaps and rating distributions across your whole history.

**Concert map.** Every show plotted geographically, so tour runs and travel patterns are visible at a glance.

**Year in review.** A shareable card summarising your year of gigs, with several visual themes to pick from.

**Friends.** Follow other users, compare counts on a leaderboard, and browse each other's show histories.

**Your data stays yours.** Full export to JSON and CSV, any time, no strings.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, Nitro) |
| Build | Vite 7, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix primitives |
| Data fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Supabase (Postgres, Auth, RLS) |
| External APIs | setlist.fm, Spotify, Google Maps |
| Package manager | Bun |

## Getting started

```bash
git clone https://github.com/timfilhol96/concertly.git
cd concertly
bun install
bun run dev
```

The dev server runs on `http://localhost:8080`.

### Environment variables

Create a `.env` in the project root:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=<maps browser key>
```

Server-side secrets (setlist.fm API key, Spotify client ID and secret) are stored in Supabase, not in this file. Nothing sensitive should ever land in `.env`, since Vite inlines every `VITE_`-prefixed value into the client bundle.

### Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Project structure

```
src/
├── routes/
│   ├── _authenticated/     Signed-in routes (dashboard, shows, add, insights,
│   │                       map, wrapped, friends, profile)
│   ├── api/                Server routes, e.g. the Spotify OAuth callback
│   ├── auth.tsx            Sign in and sign up
│   └── index.tsx           Landing page
├── components/
│   └── ui/                 shadcn/ui components
├── lib/
│   ├── concerts.ts         Concert CRUD and aggregation
│   ├── setlistfm.*.ts      setlist.fm lookup
│   ├── spotify.*.ts        Spotify OAuth and playlist creation
│   ├── wrapped-*.ts        Year in review generation, themes, sharing
│   ├── friends.ts          Friendships and leaderboard
│   ├── badges.ts           Achievement logic
│   └── csv.ts              Data export
├── integrations/supabase/  Client and generated types
└── hooks/

supabase/
├── migrations/             Schema history
└── config.toml
```

Files ending in `.functions.ts` are TanStack Start server functions. They run on the server so that API keys never reach the browser.

## Data model

Five tables in Postgres, all protected by row level security:

- **`concerts`** — one row per show: artist, tour, openers, date, venue, city, country, rating, genre, notes, ticket price, songs seen
- **`profiles`** — display name, avatar, public profile settings
- **`friendships`** — follow relationships between users
- **`spotify_tokens`** — OAuth tokens, server-access only
- **`wrapped_shares`** — published year in review cards

## Integrations

**setlist.fm** supplies setlists and opening acts. Lookups run server-side against the artist, venue and date on a logged show.

**Spotify** turns a setlist into a playlist. Note that Spotify's extended quota mode is no longer open to individual developers: since 9 March 2026 it requires a registered organisation with 250,000+ monthly active users. Apps approved before that date keep their access. In practice this means a fresh Spotify app is capped at five users, so anyone self-hosting will want to register their own Spotify app and add their account to it.

**Google Maps** renders the concert map. The browser key is referrer-restricted.

## Deployment

The app is currently deployed through [Lovable](https://lovable.dev).

TanStack Start builds to a Nitro server, not a static bundle, so it needs a Node runtime. Railway, Netlify, Vercel and Fly all work. Static-only hosts such as GitHub Pages do not. Point the deployment at your own Supabase project and set the environment variables above.

## Roadmap

- Upcoming and wishlist shows
- Achievements and badges
- Spend analytics
- "On this day" dashboard card
- Duplicate detection when adding a show
- Tour notifications for followed artists, filtered by city

## Contributing

It's a personal project, but issues and pull requests are welcome. For anything substantial, open an issue first so we can talk it through.

## License

MIT
