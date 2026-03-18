import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — ClawLens",
  description:
    "Your AI-powered command center. View portfolio stats, active agents, recent council sessions, and quick actions at a glance.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
