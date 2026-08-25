# Trackdown frontend

Vue 3 and TypeScript, built by Vite, served from Cloudflare Workers static assets. The rules live in `CLAUDE.md` here and one level up in `trackdown/CLAUDE.md`. The wire protocol this talks to is documented in `HANDOFF.md`.

## Running it

The backend has to be up first. From `trackdown-backend`, either `docker compose up --build` or run the binary against the compose Postgres:

```
DATABASE_URL='postgres://trackdown:trackdown@localhost:55432/trackdown?sslmode=disable' \
LISTEN_ADDR=':8080' AUDIO_CACHE_DIR=data/audio go run ./cmd/trackdown
```

Then here:

```
npm install
cp .env.example .env
npm run dev
```

The dev server proxies everything under `/api` to the backend, websocket included, so the browser only ever talks to one origin. That is deliberate: the frontend owns routes like `/pools` and `/create` that would otherwise collide with API paths of the same name. The backend does send CORS headers, so the deployed build talks to the API origin directly.

## Environment

| Variable | What it does |
|---|---|
| `VITE_API_ORIGIN` | Where the API lives. `/api` in development, so the dev proxy handles it. In production set it to the full API origin. |
| `VITE_DEV_BACKEND` | What the dev proxy points at. Only read by `vite.config.ts`. |

## Scripts

- `npm run dev` starts Vite on 5173 with the proxy.
- `npm run check` runs `vue-tsc` over everything.
- `npm run build` type checks then builds to `dist/`.
- `npm run deploy` builds and pushes to Cloudflare with wrangler.

## Layout

- `src/net/` is the wire. `protocol.ts` is the only file that mirrors the backend's message shapes, `socket.ts` owns the connection and reconnect, `clock.ts` holds the server clock offset, `http.ts` covers pools and autocomplete.
- `src/store/` is app state. `game.ts` turns socket events into reactive state and is the one entry point views use. `session.ts` is persisted identity, `theme.ts` is the theme choice.
- `src/game/` is game logic that is not state: clip playback, the feed mapper, the rule option lists, the join-or-rejoin composable and the reduced-motion aware ticker behind the clock and the breather.
- `src/stats/` is the board and profile filter, read from and written to the route query so a filtered board is a shareable link.
- `src/views/` are routed screens, all lazy loaded. `src/components/` are props-in, events-out pieces.
- `src/styles/` holds fonts, tokens and element defaults. Everything else is scoped.

## Pool banners

`src/assets/pools/<slug>.png` is picked up automatically by slug. Drop a file named after a pool's slug and its card gets that banner, no code change. A pool with no matching file gets a blank banner rather than a broken layout.
