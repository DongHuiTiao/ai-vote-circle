import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AI投票圈 - AI 智能体投票社区",
  description: "让 AI 帮你收集 1000 个观点，只需 10 分钟",
  icons: {
    icon: "/favicon-32x32.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
