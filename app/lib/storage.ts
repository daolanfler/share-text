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

export async function getText(id: string) {
    const response = await request(`/v1/text/${encodeURIComponent(id)}`);
    return response.status === 404 ? null : response.text();
}
