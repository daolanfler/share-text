import { Check, Copy, Home, Link, Link2Off, TriangleAlert } from "lucide-react";
import * as React from "react";
import { Link as RouterLink, data, isRouteErrorResponse } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
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
    icon,
    title,
    description,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
            <div className="sm:py-12 container max-w-xl px-4 py-8 mx-auto">
                <div className="dark:bg-gray-800 flex flex-col items-center px-6 py-14 text-center rounded-lg shadow-lg sm:px-12 bg-white">
                    <div className="dark:bg-blue-500/10 dark:text-blue-400 bg-blue-50 text-blue-600 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
                        {icon}
                    </div>
                    <h1 className="dark:text-white sm:text-2xl text-xl font-semibold text-gray-900">
                        {title}
                    </h1>
                    <p className="dark:text-gray-400 mt-3 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                        {description}
                    </p>
                    {children && (
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const homeButtonClass = `
    bg-blue-600 hover:bg-blue-700
    dark:bg-blue-500 dark:hover:bg-blue-600
    text-white
    transition-colors
    cursor-pointer
`;

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    // A 404 from the loader means the share was never created or already expired.
    if (isRouteErrorResponse(error) && error.status === 404) {
        return (
            <UnavailablePage
                icon={<Link2Off className="w-8 h-8" />}
                title="链接不存在或已过期"
                description="这个分享链接可能已被删除，或已经超过 24 小时的有效期。请与分享者确认，或返回首页分享新的内容。"
            >
                <Button asChild size="lg" className={homeButtonClass}>
                    <RouterLink to="/" className="gap-2">
                        <Home className="w-5 h-5" />
                        返回首页
                    </RouterLink>
                </Button>
            </UnavailablePage>
        );
    }

    // Any other failure (storage temporarily unavailable, etc.).
    return (
        <UnavailablePage
            icon={<TriangleAlert className="w-8 h-8" />}
            title="暂时无法加载"
            description="加载这个分享时出了点问题，请稍后重试。"
        >
            <Button asChild size="lg" className={homeButtonClass}>
                <RouterLink to="/" className="gap-2">
                    <Home className="w-5 h-5" />
                    返回首页
                </RouterLink>
            </Button>
            <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-transparent cursor-pointer"
            >
                刷新重试
            </Button>
        </UnavailablePage>
    );
}

export default function SharedTextPage({ loaderData }: Route.ComponentProps) {
    const text = loaderData.text;
    const [copied, setCopied] = React.useState(false);
    const [linkCopied, setLinkCopied] = React.useState(false);

    const copyToClipboard = async () => {
        try {
            //  navigator clipboard only works in secure contexts
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("内容已复制到剪贴板", {
                position: "top-center",
                richColors: true,
                duration: 1000,
            });
        } catch {
            toast.error("复制失败，请重试");
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
            toast.success("链接已复制到剪贴板", {
                position: "top-center",
                richColors: true,
                duration: 1000,
            });
        } catch {
            toast.error("复制链接失败，请重试");
        }
    };

    return (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
            <div className="sm:py-12 container max-w-2xl py-8 mx-auto">
                <div className="dark:bg-gray-800 overflow-hidden bg-white rounded-lg shadow-lg">
                    <div className="p-6">
                        <div className="sm:flex-row sm:items-center sm:gap-0 flex flex-col justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <RouterLink to="/" className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        className="flex items-center h-10 gap-2 px-4 cursor-pointer"
                                        title="Back to Home"
                                    >
                                        <Home className="w-5 h-5" />
                                        <span>返回主页</span>
                                    </Button>
                                </RouterLink>
                                <div className="sm:block dark:bg-gray-700 hidden w-px h-6 bg-gray-200" />
                                <h1 className="dark:text-white text-xl font-medium text-gray-700 truncate">
                                    Shared Text
                                </h1>
                            </div>
                            <div className="sm:self-auto flex self-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={copyLink}
                                    className="w-8 h-8 cursor-pointer"
                                    title="Copy link"
                                >
                                    {linkCopied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Link className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={copyToClipboard}
                                    className="w-8 h-8 cursor-pointer"
                                    title="Copy text"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg min-h-[300px]">
                            <pre className="dark:text-gray-200 w-full text-gray-700 break-words whitespace-pre-wrap">
                                {text}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
