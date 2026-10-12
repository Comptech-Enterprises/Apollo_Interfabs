import Link from "next/link";
import { Logo } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo href="/" />
      <p className="mt-8 text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn-primary">Go to inventory</Link>
        <Link href="/" className="btn-secondary">Home</Link>
      </div>
    </main>
  );
}
