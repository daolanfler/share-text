import * as React from "react";
import { Button } from "../components/ui/button";
import { Form, redirect } from "react-router";
import { Textarea } from "../components/ui/textarea";
import { useNavigate } from "react-router";
import { redis } from "~/lib/redis";
import { generateId } from "~/lib/utils";

export async function action({ request }: { request: Request }) {
    let formData = await request.formData();
    const text = formData.get("text");
    console.log(text);

    const id = generateId();
    await redis.set(id, text, { ex: 24 * 60 * 60 });
    return redirect(`/share/t/${id}`);
}

export default function SharePage() {
    const [text, setText] = React.useState("");
    const [isSharing, setIsSharing] = React.useState(false);
    const navigate = useNavigate();

    const handleShare = async () => {
        try {
            setIsSharing(true);
            const response = await fetch("/share", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            // Navigate to the shared text page
            navigate(`/t/${result.id}`);
        } catch (error) {
            console.error("Failed to share text:", error);
            alert("Failed to share text. Please try again.");
        } finally {
            setIsSharing(false);
        }
    };

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
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            // onClick={handleShare}
                            size="lg"
                            variant="default"
                            className="px-8"
                            // disabled={!text.trim() || isSharing}
                        >
                            {isSharing ? "Sharing..." : "Share"}
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
}
