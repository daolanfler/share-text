# Share Text

A lightweight text-sharing tool: enter text and get a link that expires after 24 hours. No account required. The interface uses native controls, the system light/dark preference, and a self-hosted Geist font.

## One-time shares

Select **阅后即焚（仅可查看一次）** when creating a share. It is off by default.
Opening the link only shows a confirmation prompt; the response contains no text.
After the reader selects **我已知晓，查看文本**, the server atomically consumes the
text and displays it in a read-only textarea. Only one concurrent reader can succeed.
Refreshes, later visits, and repeat confirmations cannot retrieve it again.
Unopened shares still expire after 24 hours.

Confirmation is irreversible: a lost response can consume a link without delivering
the text. Readers can save or copy what they have seen. This is application-level
deletion, not end-to-end encryption or a guarantee of erasure from provider backups.

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
pnpm test:worker
```

The backend limits each text to **100,000 UTF-8 bytes**. Text beyond that limit is not saved.

`pnpm test:worker` uses Wrangler's local workerd runtime, not production storage.
It covers concurrent consumption, non-consuming previews, expiry, object eviction,
and compatibility with ordinary shares.

## Storage backend

Ordinary shares use Cloudflare Workers KV. One-time shares use a per-link,
SQLite-backed Durable Object in the same authenticated Worker API. No separate
database service or additional application secrets are required. Create `.env` with:

```text
CLOUDFLARE_STORAGE_URL=https://share-text-storage-api.daolanfler.workers.dev
CLOUDFLARE_STORAGE_TOKEN=<the same API_TOKEN secret configured on the Worker>
```

`CLOUDFLARE_STORAGE_TOKEN` must match the Worker’s `API_TOKEN` secret and must never be committed to the repository. Worker source and KV binding configuration live in `cloudflare/`. Deploy Worker changes with:

```bash
pnpm worker:deploy
```

Deploy the Worker **before** deploying the web app. The first deployment provisions
the `ONE_TIME_TEXTS` Durable Object binding declared in `cloudflare/wrangler.jsonc`.
Existing KV shares remain readable. Shared links expire after 24 hours unless
consumed earlier.

To try the new Worker locally without changing production, run:

```bash
pnpm exec wrangler dev --config cloudflare/wrangler.jsonc --local --port 8788 --var API_TOKEN:local-dev-token
```

In another terminal, point the app at that local Worker:

```bash
CLOUDFLARE_STORAGE_URL=http://127.0.0.1:8788 CLOUDFLARE_STORAGE_TOKEN=local-dev-token pnpm dev
```
