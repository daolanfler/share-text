import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createTestHarness } from "wrangler";

const token = "local-regression-token";
const server = createTestHarness({
    workers: [{
        configPath: new URL("./wrangler.jsonc", import.meta.url),
        secrets: { API_TOKEN: token },
    }],
});
let worker;

before(async () => {
    await server.listen();
    worker = server.getWorker();
});
after(async () => {
    await server.close();
});

function oneTimeId() {
    return `once-${randomUUID().replaceAll("-", "")}`;
}

async function request(path, method = "GET", body, headers = {}) {
    const result = await worker.fetch(path, {
        method,
        body,
        headers: { Authorization: `Bearer ${token}`, ...headers },
    });
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    return result;
}

async function create(id, text) {
    assert.equal((await request(`/v1/text/${id}`, "PUT", text)).status, 204);
}

test("metadata, HEAD and prefetch never reveal or consume; concurrent reveals succeed once", async () => {
    const id = oneTimeId();
    const path = `/v1/text/${id}`;
    const secret = "private text\nwith unicode: \u2603";
    await create(id, secret);

    assert.equal((await request(path, "HEAD")).status, 405);
    assert.equal((await request(`${path}/consume`)).status, 405);
    assert.equal((await request(`${path}/consume`, "POST", undefined, { Authorization: "Bearer wrong" })).status, 401);
    await Promise.all([{}, { Purpose: "prefetch", "Sec-Purpose": "prefetch" }].map(async (headers) => {
        const metadata = await request(path, "GET", undefined, headers);
        assert.equal(metadata.status, 200);
        assert.deepEqual(await metadata.json(), { kind: "one-time" });
    }));

    const results = await Promise.all(Array.from({ length: 16 }, () => request(`${path}/consume`, "POST")));
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.filter((result) => result.status === 404).length, 15);
    await Promise.all(results.map(async (result) => {
        if (result.status === 200) {
            assert.match(result.headers.get("Content-Type"), /^text\/plain/);
            assert.equal(await result.text(), secret);
        } else {
            assert.equal(await result.text(), "Not Found");
        }
    }));
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(`${path}/consume`, "POST")).status, 404);
});

test("concurrent creation cannot overwrite and consumed IDs stay unavailable after eviction", async () => {
    const id = oneTimeId();
    const path = `/v1/text/${id}`;
    const contents = ["first contender", "second contender"];
    const creates = await Promise.all(contents.map((text) => request(path, "PUT", text)));
    assert.deepEqual(creates.map((result) => result.status).toSorted(), [204, 409]);
    const winner = creates.findIndex((result) => result.status === 204);

    await worker.evictDurableObject("ONE_TIME_TEXTS", { name: id });
    assert.equal((await request(path, "PUT", "overwrite attempt")).status, 409);
    const revealed = await request(`${path}/consume`, "POST");
    assert.equal(revealed.status, 200);
    assert.equal(await revealed.text(), contents[winner]);

    await worker.evictDurableObject("ONE_TIME_TEXTS", { name: id });
    assert.equal((await request(path, "PUT", "resurrection attempt")).status, 409);
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(`${path}/consume`, "POST")).status, 404);
});

test("expiry denies both metadata and direct consume even when the cleanup alarm has not fired", async () => {
    await Promise.all([false, true].map(async (metadataFirst) => {
        const id = oneTimeId();
        const path = `/v1/text/${id}`;
        await create(id, "expired private text");
        const storage = await worker.getDurableObjectStorage("ONE_TIME_TEXTS", { name: id });
        // Seed expired persisted state, leaving the real alarm scheduled 24h ahead.
        // This specifically catches implementations that rely on alarm delivery alone.
        await storage.exec("UPDATE lifetime SET expires_at = ?", Date.now() - 1000);
        await worker.evictDurableObject("ONE_TIME_TEXTS", { name: id });
        if (metadataFirst) {
            assert.equal((await request(path)).status, 404);
        }
        assert.equal((await request(`${path}/consume`, "POST")).status, 404);
        assert.equal((await request(path)).status, 404);
    }));
});

test("ordinary KV shares remain readable repeatedly and cannot be consumed", async () => {
    const path = "/v1/text/abc123";
    await create("abc123", "ordinary text");
    await Promise.all(Array.from({ length: 2 }, async () => {
        const result = await request(path);
        assert.equal(result.status, 200);
        assert.equal(await result.text(), "ordinary text");
    }));
    assert.equal((await request(`${path}/consume`, "POST")).status, 404);
    assert.equal(await (await request(path)).text(), "ordinary text");
    await create("abc123", "ordinary replacement");
    assert.equal(await (await request(path)).text(), "ordinary replacement");
});

test("auth, route validation, blank and UTF-8 size limits apply before persistence", async () => {
    assert.equal((await request("/health", "GET", undefined, { Authorization: "" })).status, 200);
    const id = oneTimeId();
    const path = `/v1/text/${id}`;
    assert.equal((await request(path, "PUT", "secret", { Authorization: "" })).status, 401);
    assert.equal((await request(path, "PUT", " \n\t ")).status, 400);
    const oversized = await request(path, "PUT", "\u00e9".repeat(50_001));
    // Depending on the HTTP transport, Content-Length can reject before decoding.
    assert.ok([400, 413].includes(oversized.status));
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(`${path}/consume/extra`, "POST")).status, 404);
    assert.equal((await request("/v1/text/once-not-a-valid-id", "PUT", "text")).status, 404);
    assert.equal((await request(path, "POST")).status, 405);

    const boundary = "\u00e9".repeat(50_000);
    await create(id, boundary);
    const revealed = await request(`${path}/consume`, "POST");
    assert.equal(revealed.status, 200);
    assert.equal(await revealed.text(), boundary);
});
