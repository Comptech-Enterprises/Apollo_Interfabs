import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Account", description: "Change your password." };

export default async function Account({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const user = await requireUser();
  const { first } = await searchParams;
  return (
    <>
      <PageHeader title="Account" subtitle={`Signed in as ${user.name} (${user.role === "MANAGER" ? "Manager" : "Sales"})`} />
      {(first || user.mustChangePassword) && (
        <p role="status" className="mx-auto mb-4 max-w-md rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Please choose a new password to replace your temporary one.
        </p>
      )}
      <div className="mx-auto max-w-md"><PasswordForm /></div>
    </>
  );
}
