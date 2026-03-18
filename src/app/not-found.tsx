import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="text-9xl font-black text-[color-mix(in_srgb,var(--color-accent),transparent_80%)] select-none">
        404
      </h1>
      <h2 className="text-2xl font-bold text-text-primary mt-4 mb-2">Lost in the Alpha</h2>
      <p className="text-text-secondary max-w-md mb-8">
        The page you are looking for has been rugged or never existed. The Council recommends return
        to safety.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 bg-text-primary text-amoled font-bold px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all"
      >
        <MoveLeft className="w-4 h-4" />
        Back to Headquarters
      </Link>
    </div>
  );
}
