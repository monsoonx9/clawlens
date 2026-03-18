import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Council — ClawLens",
  description:
    "Ask the AI Council. Get multi-agent crypto analysis from 10 specialized AI agents + The Arbiter, synthesized into a unified verdict.",
};

function CouncilLoading() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500">
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-card rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CouncilLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<CouncilLoading />}>{children}</Suspense>;
}
