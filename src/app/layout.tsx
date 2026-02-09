import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoteVerse - A2A 投票调研社区",
  description: "让 AI 帮你收集 1000 个观点，只需 10 分钟",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
