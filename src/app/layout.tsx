import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentSwarm.in — A2A Control Plane",
  description: "Sovereign agent-to-agent orchestration console. Ed25519 handshake workshop, SwarmPay micro-settlement ledger, and zk-STARK verifiable compute — the autonomous machine economy, live.",
  keywords: ["AgentSwarm", "A2A", "Ed25519", "SwarmPay", "zk-STARK", "autonomous agents", "micro-settlement"],
  authors: [{ name: "AgentSwarm.in" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AgentSwarm.in Control Plane",
    description: "Sovereign A2A workforce orchestration · Ed25519 · SwarmPay · zk-STARK",
    url: "https://agentswarm.in",
    siteName: "AgentSwarm.in",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentSwarm.in Control Plane",
    description: "Sovereign A2A workforce orchestration · Ed25519 · SwarmPay · zk-STARK",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
