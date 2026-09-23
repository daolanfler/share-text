import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    isRouteErrorResponse,
} from "react-router";

import type { Route } from "./+types/root";
import "@fontsource-variable/geist/wght.css";
import "./app.css";

export const meta: Route.MetaFunction = () => [
    { title: "Share Text" },
    { name: "description", content: "输入文本，生成分享链接。无需注册，链接 24 小时后自动过期。" },
];

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-CN">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <Meta />
                <Links />
            </head>
            <body>
                <a href="#main-content" className="skip-link">跳转到内容</a>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "暂时无法加载";
    let details = "出了点问题，请稍后重试。";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "页面不存在" : "暂时无法加载";
        details =
            error.status === 404
                ? "请检查链接，或返回首页分享新的内容。"
                : "出了点问题，请稍后重试。";
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main id="main-content" className="workspace unavailable">
            <h1>{message}</h1>
            <p>{details}</p>
            <a href="/" className="button button-primary">返回首页</a>
            {stack && (
                <pre className="error-stack">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}
