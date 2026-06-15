import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenMesh — Web3 Native LLM Gateway",
  description: "A Web3 native model gateway for global LLM access, wallet payments, and GPU-to-token compute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
