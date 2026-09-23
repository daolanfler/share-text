import * as React from "react";
import { Link as RouterLink, data, isRouteErrorResponse, useFetcher, useLocation, type ShouldRevalidateFunctionArgs } from "react-router";
import { consumeText, getText } from "~/lib/storage";
import type { Route } from "./+types/shared-view";

const noStore = { "Cache-Control": "no-store" };

export function headers() {
    return noStore;
}

export async function loader({ params }: Route.LoaderArgs) {
    let share;
    try {
        share = await getText(params.id);
    } catch {
        throw data(null, { status: 503, headers: noStore });
    }

    if (share === null) {
        throw data(null, { status: 404, statusText: "Not Found", headers: noStore });
    }

    return data({ id: params.id, share }, { headers: noStore });
}

export async function action({ params, request }: Route.ActionArgs) {
    const failure = (error: string, status: number) => data(
        { kind: "consume-error" as const, id: params.id, error },
        { status, headers: { ...noStore, ...(status === 405 ? { Allow: "POST" } : {}) } },
    );

    if (request.method !== "POST") {
        return failure("请使用确认按钮查看文本。", 405);
    }
    if (request.headers.get("Origin") !== new URL(request.url).origin) {
        return failure("无法确认请求来源，请重新打开链接后再试。", 403);
    }
    if (!/^once-[0-9a-f]{32}$/.test(params.id)) {
        return failure("此链接不是阅后即焚链接。", 400);
    }

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return failure("请使用确认按钮查看文本。", 400);
    }
    if (formData.get("confirmed") !== "yes") {
        return failure("请先确认已知晓，再查看文本。", 400);
    }

    try {
        const text = await consumeText(params.id);
        if (text === null) {
            return failure("链接已被查看、已过期或不存在，请联系分享者。", 404);
        }
        return data({ kind: "consumed" as const, id: params.id, text }, { headers: noStore });
    } catch {
        return failure("未能取得文本，链接可能已失效。请重试或联系分享者。", 503);
    }
}

export function shouldRevalidate({
    actionResult,
    formAction,
    formMethod,
    currentUrl,
    nextUrl,
    currentParams,
    nextParams,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
    // Only this confirmation's result bypasses revalidation; later navigation
    // must read storage again rather than restore an already-consumed reveal.
    if (
        formMethod?.toUpperCase() === "POST"
        && formAction
        && new URL(formAction, currentUrl).pathname === currentUrl.pathname
        && currentUrl.href === nextUrl.href
        && currentParams.id === nextParams.id
        && actionResult?.id === currentParams.id
        && (actionResult.kind === "consumed" || actionResult.kind === "consume-error")
    ) {
        return false;
    }
    return defaultShouldRevalidate;
}

function UnavailablePage({
    title,
    description,
    retry = false,
}: {
    title: string;
    description: string;
    retry?: boolean;
}) {
    return (
        <main id="main-content" className="workspace unavailable">
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="unavailable-actions">
                <RouterLink to="/" className="button button-primary">
                    返回首页
                </RouterLink>
                {retry && (
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="button button-secondary"
                    >
                        刷新重试
                    </button>
                )}
            </div>
        </main>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    if (isRouteErrorResponse(error) && error.status === 404) {
        return (
            <UnavailablePage
                title="链接已失效"
                description="链接可能已被查看、已过期或不存在，请联系分享者。"
            />
        );
    }

    return (
        <UnavailablePage
            title="暂时无法加载"
            description="加载这个分享时出了点问题，请稍后重试。"
            retry
        />
    );
}

export default function SharedTextPage({ loaderData }: Route.ComponentProps) {
    const location = useLocation();
    return <SharedTextReader key={`${loaderData.id}:${location.key}`} loaderData={loaderData} />;
}

function SharedTextReader({ loaderData }: Pick<Route.ComponentProps, "loaderData">) {
    const fetcher = useFetcher<typeof action>();
    const oneTime = loaderData.share.kind === "one-time";
    const result = fetcher.data?.id === loaderData.id ? fetcher.data : undefined;
    const text = loaderData.share.kind === "regular"
        ? loaderData.share.text
        : result?.kind === "consumed" ? result.text : null;
    const revealed = oneTime && text !== null;
    const pending = fetcher.state !== "idle";
    const [hydrated, setHydrated] = React.useState(false);
    const [copied, setCopied] = React.useState<"text" | "link" | null>(null);
    const [copyError, setCopyError] = React.useState("");
    const readerRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        setHydrated(true);
    }, []);

    React.useEffect(() => {
        if (!copied) return;
        const timeout = window.setTimeout(() => setCopied(null), 2000);
        return () => window.clearTimeout(timeout);
    }, [copied]);

    React.useEffect(() => {
        if (!oneTime) return;
        // HTTP no-store does not universally disable the browser's back/forward
        // snapshot cache. Redact before leaving and reload any restored snapshot.
        const redact = () => {
            const reader = readerRef.current;
            if (!reader) return;
            reader.hidden = true;
            const textarea = reader.querySelector("textarea");
            if (textarea) {
                textarea.value = "";
                textarea.defaultValue = "";
            }
        };
        const restore = (event: PageTransitionEvent) => {
            if (event.persisted) window.location.reload();
        };
        window.addEventListener("pagehide", redact);
        window.addEventListener("pageshow", restore);
        return () => {
            window.removeEventListener("pagehide", redact);
            window.removeEventListener("pageshow", restore);
        };
    }, [oneTime]);

    const copy = async (kind: "text" | "link") => {
        if (kind === "text" && text === null) return;
        setCopyError("");
        try {
            await navigator.clipboard.writeText(kind === "text" ? text! : window.location.href);
            setCopied(kind);
        } catch {
            setCopied(null);
            setCopyError(
                kind === "text"
                    ? "复制失败，请重试或手动选择文本复制。"
                    : "复制失败，请重试或从地址栏复制链接。",
            );
        }
    };

    return (
        <main ref={readerRef} id="main-content" className="workspace reader" aria-label="分享的文本">
            <div className="reader-actions">
                <RouterLink to="/" className="text-link">返回主页</RouterLink>
                <div className="copy-actions">
                    {!revealed && (
                        <button type="button" onClick={() => copy("link")} className="button button-secondary">
                            {copied === "link" ? "链接已复制" : "复制链接"}
                        </button>
                    )}
                    {text !== null && (
                        <button type="button" onClick={() => copy("text")} className="button button-primary">
                            {copied === "text" ? "文本已复制" : "复制文本"}
                        </button>
                    )}
                </div>
            </div>
            {text === null ? (
                <section className="confirmation" aria-labelledby="confirmation-title">
                    <h1 id="confirmation-title">阅后即焚</h1>
                    <p className="confirmation-description" id="confirmation-description">
                        确认查看后，链接立即失效。刷新或重新打开将无法再次查看。
                    </p>
                    <fetcher.Form method="post" aria-busy={pending}>
                        <button
                            type="submit"
                            name="confirmed"
                            value="yes"
                            className="button button-primary"
                            aria-describedby="confirmation-description"
                            disabled={!hydrated || pending}
                        >
                            {pending ? "查看中..." : "我已知晓，查看文本"}
                        </button>
                        <noscript><p className="error-message">请启用 JavaScript 后再确认查看。</p></noscript>
                        {result?.kind === "consume-error" && (
                            <p className="error-message" role="alert">{result.error}</p>
                        )}
                    </fetcher.Form>
                </section>
            ) : (
                <>
                    <textarea className="shared-text" aria-label="文本内容" value={text} readOnly />
                    {revealed && <p className="read-once-note">链接已失效，请在离开前保存文本。</p>}
                </>
            )}
            <p className={copyError ? "copy-status error-message" : "sr-only"} role="status" aria-live="polite">
                {copyError || (copied === "link" ? "链接已复制到剪贴板" : copied === "text" ? "内容已复制到剪贴板" : "")}
            </p>
        </main>
    );
}
