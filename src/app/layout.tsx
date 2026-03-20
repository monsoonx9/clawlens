import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clawlens-beta.vercel.app"),
  title: "The Multi-Agent Intelligence Council for Binance",
  description: "Don't ask one AI. Ask the Council.",
  manifest: "/manifest.json",
  openGraph: {
    title: "The Multi-Agent Intelligence Council for Binance",
    description: "Don't ask one AI. Ask the Council.",
    url: "https://clawlens-beta.vercel.app",
    siteName: "ClawLens",
    images: [
      {
        url: "/logo_v1.webp",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Multi-Agent Intelligence Council for Binance",
    description: "Don't ask one AI. Ask the Council.",
    images: ["/logo_v1.webp"],
  },
  icons: {
    icon: "/logo_v1.webp",
    shortcut: "/logo_v1.webp",
    apple: "/logo_v1.webp",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

import { MouseReactiveBackground } from "@/components/layout/MouseReactiveBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans text-text-primary antialiased bg-dot-pattern`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <MouseReactiveBackground />
          <ErrorBoundary>
            <ClientLayout>{children}</ClientLayout>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
