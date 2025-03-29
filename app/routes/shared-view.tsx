import { Check, Copy, Home, Link } from "lucide-react";
import * as React from "react";
import { Link as RouterLink } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { redis } from "~/lib/redis";
import type { Route } from "./+types/shared-view";

export async function loader({ params }: { params: { id: string } }) {
    try {
        const text = await redis.get<string>(params.id);
        if (!text) {
            throw new Error("Text not found or has expired");
        }

        return { text };
    } catch (error) {
        console.error("Failed to get text:", error);
        throw new Error("Failed to load text");
    }
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
        } catch (err) {
            console.error("复制失败: ", err);
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
        } catch (err) {
            console.error("Failed to copy link:", err);
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
