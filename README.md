# AstroScot

AstroScot is an iPad-first Progressive Web App for children ages 7-10. It is designed to answer two friendly questions:

- What is the weather like today?
- What can I see in the sky tonight?

The V1 foundation contains a React + Vite + TypeScript frontend, a basic Cloudflare Worker, shared TypeScript types, documentation, and placeholder cards for the future Weather, Moon, and Planet Watching features.

## What is included now

- `apps/web` — React/Vite PWA visual prototype.
- `workers/api` — Basic Cloudflare Worker health endpoint.
- `shared` — Shared TypeScript types for future frontend/backend contracts.
- `docs` — Project notes and V1 foundation documentation.

## What is intentionally not included yet

- Open-Meteo integration.
- Astronomy calculations.
- Moon event calculations.
- Planet visibility calculations.
- GPS or browser geolocation.
- Database, authentication, analytics, or user accounts.

## Install dependencies

```bash
npm install
```

## Run the frontend locally

```bash
npm run dev:web
```

Then open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

## Run the Cloudflare Worker locally

```bash
npm run dev:api
```

The Worker currently exposes a simple JSON response at `/` for local development.

## Build the frontend

```bash
npm run build:web
```

## Type-check all workspaces

```bash
npm run typecheck
```
