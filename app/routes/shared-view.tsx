import * as React from "react";
import { Link as RouterLink, data, isRouteErrorResponse } from "react-router";
import { getText } from "~/lib/storage";
import type { Route } from "./+types/shared-view";

export async function loader({ params }: Route.LoaderArgs) {
    const text = await getText(params.id);

    // The storage returns 404 both when the text never existed and when its
    // 24h TTL expired, so both cases collapse into a single "not found".
    if (text === null) {
        throw data(null, { status: 404, statusText: "Not Found" });
    }

    return { text };
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
                title="链接不存在或已过期"
                description="这个分享链接可能已被删除，或已经超过 24 小时的有效期。请与分享者确认，或返回首页分享新的内容。"
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
    const text = loaderData.text;
    const [copied, setCopied] = React.useState<"text" | "link" | null>(null);
    const [copyError, setCopyError] = React.useState("");

    React.useEffect(() => {
        if (!copied) return;
        const timeout = window.setTimeout(() => setCopied(null), 2000);
        return () => window.clearTimeout(timeout);
    }, [copied]);

    const copy = async (kind: "text" | "link") => {
        setCopyError("");
        try {
            await navigator.clipboard.writeText(kind === "text" ? text : window.location.href);
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
        <main id="main-content" className="workspace reader" aria-label="分享的文本">
            <div className="reader-actions">
                <RouterLink to="/" className="text-link">返回主页</RouterLink>
                <div className="copy-actions">
                    <button type="button" onClick={() => copy("link")} className="button button-secondary">
                        {copied === "link" ? "链接已复制" : "复制链接"}
                    </button>
                    <button type="button" onClick={() => copy("text")} className="button button-primary">
                        {copied === "text" ? "文本已复制" : "复制文本"}
                    </button>
                </div>
            </div>
            <textarea className="shared-text" aria-label="文本内容" value={text} readOnly />
            <p className={copyError ? "copy-status error-message" : "sr-only"} role="status" aria-live="polite">
                {copyError || (copied === "link" ? "链接已复制到剪贴板" : copied === "text" ? "内容已复制到剪贴板" : "")}
            </p>
        </main>
    );
}
