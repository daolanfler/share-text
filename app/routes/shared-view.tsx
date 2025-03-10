import * as React from "react";
import { useLoaderData } from "react-router";
import { redis } from "~/lib/redis";
import { Copy, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
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

    const copyToClipboard = async () => {
        try {
            //  navigator clipboard only works in secure contexts
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Copied to clipboard");
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    };

    return (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
            <div className="container max-w-2xl py-12 mx-auto">
                <div className="dark:bg-gray-800 overflow-hidden bg-white rounded-lg shadow-lg">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="dark:text-white text-2xl font-bold text-gray-900">
                                Shared Text
                            </h1>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyToClipboard}
                                className="w-8 h-8"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <pre className="dark:text-gray-200 text-gray-700 break-words whitespace-pre-wrap">
                                {text}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
