# Share Text

A lightweight text-sharing tool: enter text and get a link that expires after 24 hours. No account required. The interface uses native controls, the system light/dark preference, and a self-hosted Geist font.

## Local development

Requires Node.js 22.22 or later and pnpm 11.

```bash
pnpm install
pnpm dev
```

The development server runs at `http://localhost:5173`. Other useful commands:

```bash
pnpm build
pnpm start
pnpm typecheck
pnpm lint
```

The backend limits each text to **100,000 UTF-8 bytes**. Text beyond that limit is not saved.

## Storage backend

The app stores text in Cloudflare Workers KV through an authenticated Cloudflare Worker API. Create `.env` with:

```text
CLOUDFLARE_STORAGE_URL=https://share-text-storage-api.daolanfler.workers.dev
CLOUDFLARE_STORAGE_TOKEN=<the same API_TOKEN secret configured on the Worker>
```

`CLOUDFLARE_STORAGE_TOKEN` must match the Worker’s `API_TOKEN` secret and must never be committed to the repository. Worker source and KV binding configuration live in `cloudflare/`. Deploy Worker changes with:

```bash
pnpm worker:deploy
```

Shared links automatically expire after 24 hours.
