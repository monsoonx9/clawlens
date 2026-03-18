import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — ClawLens",
  description:
    "Configure your Binance API keys, choose your AI provider, manage agent settings, and customize your risk preferences.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
