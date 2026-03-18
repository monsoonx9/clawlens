import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio — ClawLens",
  description:
    "Track your Binance portfolio health, asset allocation, risk score, and 24h performance with real-time data.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
