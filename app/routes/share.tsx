import * as React from "react";
import { Button } from "../components/ui/button";
import { Form, redirect, useNavigation, useActionData } from "react-router";
import { Textarea } from "../components/ui/textarea";
import { redis } from "~/lib/redis";
import { generateId } from "~/lib/utils";

export async function action({ request }: { request: Request }) {
    let formData = await request.formData();
    const text = formData.get("text");

    // Server-side validation
    if (!text || typeof text !== "string" || !text.trim()) {
        return new Response(
            JSON.stringify({
                error: "Text cannot be empty or contain only whitespace",
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    const id = generateId();
    await redis.set(id, text, { ex: 24 * 60 * 60 });
    return redirect(`/share/t/${id}`);
}

export default function SharePage() {
    const [text, setText] = React.useState("");
    const navigation = useNavigation();
    const actionData = useActionData<{ error: string }>();

    return (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
            <div className="sm:py-12 container max-w-2xl px-4 py-8 mx-auto">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="dark:text-white sm:text-3xl text-2xl font-bold text-gray-900">
                            Share Text
                        </h1>
                        <p className="dark:text-gray-400 sm:text-base text-sm text-gray-500">
                            分享你的文本内容，生成一个可访问的链接
                        </p>
                    </div>

                    <div className="dark:bg-gray-800 overflow-hidden bg-white rounded-lg shadow-lg">
                        <Form method="post" className="sm:p-6 p-4">
                            <div className="space-y-4">
                                <Textarea
                                    name="text"
                                    placeholder="在这里输入你想分享的文本..."
                                    value={text}
                                    onChange={(
                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                    ) => setText(e.target.value)}
                                    className="min-h-[200px] sm:min-h-[300px] resize-y text-base"
                                />
                                {actionData?.error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 px-2 py-1 text-sm text-red-500 rounded">
                                        {actionData.error}
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-2">
                                    <p className="dark:text-gray-400 text-xs text-gray-500">
                                        链接有效期为24小时
                                    </p>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        variant="default"
                                        className={`
                                            sm:px-8 px-6
                                            bg-blue-600 hover:bg-blue-700
                                            dark:bg-blue-500 dark:hover:bg-blue-600
                                            text-white
                                            transition-colors
                                            active:scale-95 transform
                                            cursor-pointer
                                            disabled:cursor-not-allowed
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-500
                                            disabled:active:scale-100
                                        `}
                                        disabled={
                                            navigation.state !== "idle" ||
                                            !text.trim()
                                        }
                                    >
                                        {navigation.state === "idle" ? (
                                            "分享"
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <span className="border-t-transparent animate-spin w-4 h-4 border-2 border-white rounded-full" />
                                                分享中...
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    );
}
