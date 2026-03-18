import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History — ClawLens",
  description:
    "Browse your past AI Council sessions. Review verdicts, agent analyses, and risk assessments from previous queries.",
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
