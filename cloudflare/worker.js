import { DurableObject } from "cloudflare:workers";

const MAX_TEXT_BYTES = 100_000;
const TEXT_TTL_SECONDS = 24 * 60 * 60;

function response(body, status = 200, headers = {}) {
    return new Response(body, {
        status,
        headers: { "Cache-Control": "no-store", ...headers },
    });
}

function notFound() {
    return response("Not Found", 404);
}

async function readText(request) {
    const contentLength = Number(request.headers.get("Content-Length") || "0");
    if (contentLength > MAX_TEXT_BYTES) {
        return response("Text is too large", 413);
    }

    const text = await request.text();
    if (!text.trim() || new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) {
        return response("Invalid text", 400);
    }
    return text;
}

export class OneTimeText extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        ctx.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS lifetime (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS payload (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                text TEXT NOT NULL
            );
        `);
    }

    async create(text) {
        return this.ctx.storage.transaction(async () => {
            const existing = this.ctx.storage.sql.exec("SELECT id FROM lifetime").next();
            if (!existing.done) {
                return false;
            }

            const expiresAt = Date.now() + TEXT_TTL_SECONDS * 1000;
            this.ctx.storage.sql.exec("INSERT INTO lifetime VALUES (1, ?)", expiresAt);
            this.ctx.storage.sql.exec("INSERT INTO payload VALUES (1, ?)", text);
            await this.ctx.storage.setAlarm(expiresAt);
            return true;
        });
    }

    metadata() {
        return this.ctx.storage.transactionSync(() => {
            const lifetime = this.ctx.storage.sql.exec("SELECT expires_at FROM lifetime").next().value;
            if (!lifetime || lifetime.expires_at <= Date.now()) {
                this.ctx.storage.sql.exec("DELETE FROM payload");
                return false;
            }
            return !this.ctx.storage.sql.exec("SELECT id FROM payload").next().done;
        });
    }

    async consume() {
        const text = this.ctx.storage.transactionSync(() => {
            const row = this.ctx.storage.sql.exec(`
                SELECT payload.text, lifetime.expires_at
                FROM payload JOIN lifetime USING (id)
            `).next().value;
            // Delete the payload, but retain the lifetime marker against repeated PUTs.
            this.ctx.storage.sql.exec("DELETE FROM payload");
            return row && row.expires_at > Date.now() ? row.text : null;
        });
        // Do not release plaintext until the deletion is durably committed.
        await this.ctx.storage.sync();
        return text;
    }

    async alarm() {
        await this.ctx.storage.transaction(async () => {
            const lifetime = this.ctx.storage.sql.exec("SELECT expires_at FROM lifetime").next().value;
            if (lifetime && lifetime.expires_at > Date.now()) {
                await this.ctx.storage.setAlarm(lifetime.expires_at);
                return;
            }
            this.ctx.storage.sql.exec("DELETE FROM payload; DELETE FROM lifetime;");
        });
    }
}

async function handleRequest(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
        return response(JSON.stringify({ ok: true }), 200, { "Content-Type": "application/json" });
    }

    if (!env.API_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.API_TOKEN}`) {
        return response("Unauthorized", 401);
    }

    const match = url.pathname.match(/^\/v1\/text\/([a-z0-9]{6}|once-[0-9a-f]{32})(\/consume)?$/);
    if (!match) {
        return notFound();
    }

    const key = match[1];
    const oneTime = key.startsWith("once-");
    const consuming = Boolean(match[2]);
    if (consuming && !oneTime) {
        return notFound();
    }

    if (consuming) {
        if (request.method !== "POST") {
            return response("Method Not Allowed", 405, { Allow: "POST" });
        }
        const object = env.ONE_TIME_TEXTS.get(env.ONE_TIME_TEXTS.idFromName(key));
        const text = await object.consume();
        return text === null
            ? notFound()
            : response(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
    }

    if (request.method === "PUT") {
        const text = await readText(request);
        if (text instanceof Response) {
            return text;
        }

        if (oneTime) {
            const object = env.ONE_TIME_TEXTS.get(env.ONE_TIME_TEXTS.idFromName(key));
            if (!(await object.create(text))) {
                return response("Text already exists", 409);
            }
        } else {
            await env.TEXTS.put(key, text, { expirationTtl: TEXT_TTL_SECONDS });
        }
        return response(null, 204);
    }

    if (request.method === "GET") {
        if (oneTime) {
            const object = env.ONE_TIME_TEXTS.get(env.ONE_TIME_TEXTS.idFromName(key));
            return (await object.metadata())
                ? response(JSON.stringify({ kind: "one-time" }), 200, { "Content-Type": "application/json" })
                : notFound();
        }

        const text = await env.TEXTS.get(key);
        return text === null
            ? notFound()
            : response(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
    }

    return response("Method Not Allowed", 405, { Allow: "GET, PUT" });
}

export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch {
            return response("Internal Server Error", 500);
        }
    },
};
