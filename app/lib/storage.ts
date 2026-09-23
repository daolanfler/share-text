export type SharedText =
    | { kind: "regular"; text: string }
    | { kind: "one-time" };

const oneTimeIdPattern = /^once-[0-9a-f]{32}$/;

function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not defined`);
    }
    return value;
}

const storageUrl = requireEnv("CLOUDFLARE_STORAGE_URL");
const storageToken = requireEnv("CLOUDFLARE_STORAGE_TOKEN");

async function request(path: string, init?: RequestInit) {
    const response = await fetch(`${storageUrl.replace(/\/$/, "")}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${storageToken}`,
            ...init?.headers,
        },
        signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Cloudflare storage request failed with status ${response.status}`);
    }

    return response;
}

export async function saveText(id: string, text: string) {
    const response = await request(`/v1/text/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: text,
    });

    if (!response.ok) {
        throw new Error("Failed to save text");
    }
}

export async function getText(id: string): Promise<SharedText | null> {
    const response = await request(`/v1/text/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;

    return oneTimeIdPattern.test(id)
        ? response.json()
        : { kind: "regular", text: await response.text() };
}

export async function consumeText(id: string): Promise<string | null> {
    if (!oneTimeIdPattern.test(id)) return null;

    const response = await request(`/v1/text/${encodeURIComponent(id)}/consume`, {
        method: "POST",
    });
    return response.status === 404 ? null : response.text();
}
