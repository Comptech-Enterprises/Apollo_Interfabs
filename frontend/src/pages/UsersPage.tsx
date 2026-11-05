import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiUsers } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageHeader, Field, SubmitButton } from "@/components/ui";
import { ActiveBadge } from "@/components/bits";
import { PasswordInput } from "@/components/PasswordInput";
import { ToggleActiveButton } from "@/components/ToggleActiveButton";

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SALES");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset password dialog state
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  if (user?.role !== "OWNER") {
    return <Navigate to="/dashboard" replace />;
  }

  const loadUsers = () => {
    setLoading(true);
    apiUsers
      .list()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormErrors({});
    try {
      const res = await apiUsers.create({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        role,
        password,
      });
      toast.success(res.message);
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err: any) {
      if (err.fields) setFormErrors(err.fields);
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openResetDialog = (u: { id: string; name: string }) => {
    setResetTarget(u);
    setNewPassword("");
    resetDialogRef.current?.showModal();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    try {
      const res = await apiUsers.resetPassword(resetTarget.id, newPassword);
      toast.success(res.message);
      resetDialogRef.current?.close();
      setResetTarget(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Manage manager and sales staff accounts." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Users list */}
        <div>
          {loading && users.length === 0 ? (
            <div className="card text-center py-12 text-slate-500">Loading users...</div>
          ) : (
            <ul className="space-y-3">
              {users.map((u) => (
                <li key={u.id} className="card hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {u.name}
                        {u.name === user.name && (
                          <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>
                        )}
                      </p>
                      <p className="break-all text-sm text-slate-600">
                        {u.username ? `@${u.username} · ` : ""}
                        {u.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {u.role === "OWNER" ? "Owner" : u.role === "MANAGER" ? "Manager" : "Sales"} · added{" "}
                        {formatDate(u.createdAt)}
                      </p>
                    </div>
                    <ActiveBadge active={u.active} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary cursor-pointer"
                      onClick={() => openResetDialog({ id: u.id, name: u.name })}
                    >
                      Reset password
                    </button>
                    {u.name !== user.name && (
                      <ToggleActiveButton
                        noun="user"
                        active={u.active}
                        action={async (active) => {
                          const res = await apiUsers.toggleActive(u.id, active);
                          loadUsers();
                          return res;
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create user form */}
        <form onSubmit={handleCreateUser} className="card space-y-4 h-fit" noValidate>
          <h2 className="text-lg font-bold text-slate-900">Add user</h2>
          <Field label="Full Name" name="name" error={formErrors.name}>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="input"
              autoComplete="off"
              placeholder="e.g. Ramesh Kumar"
            />
          </Field>
          <Field label="Username" name="username" error={formErrors.username}>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={30}
              className="input"
              autoComplete="off"
              placeholder="e.g. ramesh"
            />
          </Field>
          <Field label="Email" name="email" error={formErrors.email}>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={120}
              className="input"
              autoComplete="off"
              placeholder="e.g. ramesh@example.com"
            />
          </Field>
          <Field label="Role" name="role" error={formErrors.role}>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input"
            >
              <option value="SALES">Sales</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </Field>
          <Field
            label="Temporary password"
            name="password"
            error={formErrors.password}
            hint="Min 8 characters. Must be changed at first sign-in."
          >
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={100}
              autoComplete="off"
            />
          </Field>
          <SubmitButton loading={creating} className="btn-primary w-full cursor-pointer">
            Create user
          </SubmitButton>
        </form>
      </div>

      {/* Reset Password Dialog */}
      <dialog
        ref={resetDialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 backdrop:bg-slate-900/50"
      >
        {resetTarget && (
          <form onSubmit={handleResetPassword} className="space-y-4 p-5">
            <h2 className="text-lg font-bold text-slate-900">Reset password for {resetTarget.name}</h2>
            <Field label="New temporary password" name="new-pw">
              <PasswordInput
                id="new-pw"
                name="new-pw"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={100}
                autoComplete="off"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary cursor-pointer"
                onClick={() => resetDialogRef.current?.close()}
              >
                Cancel
              </button>
              <SubmitButton loading={resetting} className="btn-primary cursor-pointer">
                Save new password
              </SubmitButton>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
