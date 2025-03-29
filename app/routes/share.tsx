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
        <div className="container max-w-2xl py-12 mx-auto">
            <h1 className="mb-8 text-3xl font-bold">Share Text</h1>
            <Form method="post">
                <div className="space-y-4">
                    <Textarea
                        name="text"
                        placeholder="Enter your text here..."
                        value={text}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setText(e.target.value)
                        }
                        className="min-h-[200px]"
                    />
                    {actionData?.error && (
                        <div className="text-sm text-red-500">
                            {actionData.error}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            size="lg"
                            variant="default"
                            className="px-8"
                            disabled={navigation.state === "submitting"}
                        >
                            {navigation.state === "submitting"
                                ? "Sharing..."
                                : "Share"}
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
}
