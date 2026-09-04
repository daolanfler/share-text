const MAX_TEXT_BYTES = 100_000;
const TEXT_TTL_SECONDS = 24 * 60 * 60;

function unauthorized() {
    return new Response("Unauthorized", { status: 401 });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "GET" && url.pathname === "/health") {
            return Response.json({ ok: true });
        }

        if (request.headers.get("Authorization") !== `Bearer ${env.API_TOKEN}`) {
            return unauthorized();
        }

        const match = url.pathname.match(/^\/v1\/text\/([a-z0-9]{6})$/);
        if (!match) {
            return new Response("Not Found", { status: 404 });
        }

        const key = match[1];

        if (request.method === "PUT") {
            const contentLength = Number(request.headers.get("Content-Length") || "0");
            if (contentLength > MAX_TEXT_BYTES) {
                return new Response("Text is too large", { status: 413 });
            }

            const text = await request.text();
            if (!text.trim() || new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) {
                return new Response("Invalid text", { status: 400 });
            }

            await env.TEXTS.put(key, text, { expirationTtl: TEXT_TTL_SECONDS });
            return new Response(null, { status: 204 });
        }

        if (request.method === "GET") {
            const text = await env.TEXTS.get(key);
            return text === null
                ? new Response("Not Found", { status: 404 })
                : new Response(text, {
                      headers: { "Content-Type": "text/plain; charset=utf-8" },
                  });
        }

        return new Response("Method Not Allowed", {
            status: 405,
            headers: { Allow: "GET, PUT" },
        });
    },
};
