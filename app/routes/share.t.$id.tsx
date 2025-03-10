import * as React from "react";
import { useLoaderData } from "react-router";
import { redis } from "~/lib/redis";

type LoaderData = {
    text: string;
}

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

export default function SharedTextPage() {
    const { text } = useLoaderData() as LoaderData;

    return (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
            <div className="container max-w-2xl py-12 mx-auto">
                <div className="dark:bg-gray-800 overflow-hidden bg-white rounded-lg shadow-lg">
                    <div className="p-6">
                        <h1 className="dark:text-white mb-6 text-2xl font-bold text-gray-900">
                            Shared Text
                        </h1>
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
