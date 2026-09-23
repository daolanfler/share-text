import * as React from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { saveText } from "~/lib/storage";
import { generateId } from "~/lib/utils";

export async function action({ request }: { request: Request }) {
    const formData = await request.formData();
    const text = formData.get("text");
    const oneTime = formData.get("oneTime") === "yes";

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
            },
        );
    }

    const id = oneTime ? `once-${crypto.randomUUID().replaceAll("-", "")}` : generateId();
    await saveText(id, text);
    return redirect(`/share/t/${id}`);
}

export default function SharePage() {
    const [text, setText] = React.useState("");
    const [oneTime, setOneTime] = React.useState(false);
    const navigation = useNavigation();
    const actionData = useActionData<{ error: string }>();
    const isSharing = navigation.state !== "idle";

    return (
        <main id="main-content" className="workspace">
            <header className="page-heading">
                <h1>分享文本</h1>
            </header>

            <Form method="post" aria-busy={isSharing}>
                <div className="text-surface">
                    <div className="surface-toolbar">
                        <label htmlFor="share-text">文本内容</label>
                        <span className="character-count">
                            {text.length.toLocaleString("zh-CN")} 字符
                        </span>
                    </div>
                    <textarea
                        id="share-text"
                        name="text"
                        placeholder="在这里输入或粘贴你想分享的文本..."
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        className="text-editor"
                        aria-describedby={`sharing-note${actionData?.error ? " share-error" : ""}`}
                        aria-invalid={Boolean(actionData?.error)}
                        readOnly={isSharing}
                        required
                    />
                </div>
                {actionData?.error && (
                    <p id="share-error" className="error-message" role="alert">
                        {actionData.error}
                    </p>
                )}
                <div className="share-options">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="oneTime"
                            value="yes"
                            checked={oneTime}
                            onChange={(event) => setOneTime(event.target.checked)}
                            disabled={isSharing}
                        />
                        阅后即焚（仅可查看一次）
                    </label>
                </div>
                <div className="form-actions">
                    <p id="sharing-note" className="expiry-note">
                        <span className="expiry-value">24h</span>
                        {oneTime ? "确认查看后失效，未查看时 24 小时后过期" : "链接有效期为 24 小时"}
                    </p>
                    <button
                        type="submit"
                        className="button button-primary"
                        disabled={isSharing || !text.trim()}
                    >
                        {isSharing ? "分享中..." : "分享"}
                        <span aria-hidden="true">↗</span>
                    </button>
                </div>
                <p className="privacy-note">
                    任何获得链接的人都可以查看，请勿分享敏感信息。
                </p>
            </Form>
        </main>
    );
}
