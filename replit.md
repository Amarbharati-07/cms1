# Project Overview

A full-stack TypeScript web application with an Express backend and React (Vite) frontend.

## Architecture

- **Frontend**: React 18 with TypeScript, Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js (TypeScript) serving both API and the Vite dev server in development
- **Database**: PostgreSQL via Neon (serverless), managed with Drizzle ORM
- **Auth**: Passport.js with local strategy + express-session
- **Routing**: Wouter (client-side), Express (server-side API)

## Project Structure

```
├── client/          # React frontend (Vite root)
│   └── src/
│       ├── components/  # UI components (shadcn/ui + custom)
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Utilities
│       └── pages/       # Page-level components
├── server/          # Express backend
│   ├── index.ts     # Entry point, listens on port 5000
│   ├── routes.ts    # API routes registration
│   ├── db.ts        # Database connection
│   ├── storage.ts   # Data access layer
│   ├── vite.ts      # Vite dev server integration
│   └── static.ts    # Static file serving (production)
├── shared/          # Shared code (schema, types)
│   ├── schema.ts    # Drizzle ORM schema
│   └── routes.ts    # Shared route definitions
├── uploads/         # File upload storage
└── seed.ts          # Database seeding script
```

## Running the App

- **Dev**: `npm run dev` — starts Express + Vite on port 5000
- **Build**: `npm run build` — builds frontend to `dist/public`, bundles server to `dist/index.cjs`
- **Production**: `npm run start` — runs the built production server
- **DB push**: `npm run db:push` — pushes Drizzle schema to database

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `SESSION_SECRET` — Secret for express-session
- `NODE_ENV` — `development` or `production`

## Deployment

- Target: Autoscale
- Build: `npm run build`
- Run: `npm run start`
