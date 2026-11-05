import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Logo, ContactLinks } from "@/components/Brand";
import { Field, SubmitButton } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";
import { site } from "@/lib/site";

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ username: username.trim(), password });
      toast.success("Signed in successfully");
    } catch (err: any) {
      setError(err.message || "Incorrect username or password.");
      toast.error(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-br from-red-100/70 via-white to-red-50/80">
      <header className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
        <Logo href="/" />
      </header>
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-10">
        <div className="card animate-page-enter border-red-100 shadow-xl shadow-red-500/5">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-black text-xl shadow-md shadow-red-500/25">
            A
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Use the account provided by your manager.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Username" name="username">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={120}
                className="input"
                placeholder="Enter your username"
              />
            </Field>
            <Field label="Password" name="password">
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={100}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            <SubmitButton loading={loading} className="btn-primary w-full cursor-pointer">
              Sign in
            </SubmitButton>
          </form>
        </div>
      </section>
      <footer className="border-t border-red-100 bg-white/70 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <ContactLinks />
        </div>
      </footer>
    </main>
  );
}
