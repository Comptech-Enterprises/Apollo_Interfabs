import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo, ContactLinks } from "@/components/Brand";
import { LoginForm } from "./LoginForm";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Apollo Interfabs inventory portal to manage fabric stock, purchases and sales.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
        <Logo href="/" />
      </header>
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-10">
        <div className="card">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Use the account provided by your manager.</p>
          <LoginForm />
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <ContactLinks />
        </div>
      </footer>
    </main>
  );
}
