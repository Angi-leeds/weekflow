import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AuthUser } from "../../shared/auth";
import { APP_NAME } from "../branding";
import { fetchSuperAdminOverview, fetchSuperAdminUsers } from "../lib/auth";
import { SectionHeader } from "./ui/SectionHeader";

interface SuperAdminViewProps {
  onBack: () => void;
}

export function SuperAdminView({ onBack }: SuperAdminViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof fetchSuperAdminOverview>
  > | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextOverview, nextUsers] = await Promise.all([
          fetchSuperAdminOverview(),
          fetchSuperAdminUsers(),
        ]);
        if (!cancelled) {
          setOverview(nextOverview);
          setUsers(nextUsers.users);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load admin data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-subhead font-medium text-wf-accent"
      >
        <ArrowLeft size={18} />
        Back to Settings
      </button>

      <SectionHeader title="Super Admin" subtitle={`${APP_NAME} access control`} />

      {loading && <p className="text-subhead text-wf-text-secondary">Loading…</p>}
      {error && (
        <p className="rounded-xl bg-wf-red/10 px-3 py-2 text-caption font-medium text-wf-red">
          {error}
        </p>
      )}

      {overview && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-wf-border bg-wf-surface p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-subhead font-bold">Signup policy</h2>
            <dl className="mt-3 space-y-2 text-subhead">
              <div className="flex justify-between gap-4">
                <dt className="text-wf-text-secondary">Auth gateway</dt>
                <dd className="font-medium">{overview.authEnabled ? "Enabled" : "Disabled"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-wf-text-secondary">Signup mode</dt>
                <dd className="font-medium">{overview.signupMode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-wf-text-secondary">Registered users</dt>
                <dd className="font-medium">{overview.userCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-wf-text-secondary">Allowlist entries</dt>
                <dd className="font-medium">{overview.allowlistCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-wf-text-secondary">Super admin email set</dt>
                <dd className="font-medium">
                  {overview.superAdminEmailConfigured ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-caption text-wf-text-tertiary">
              Signup mode and allowlist are controlled by Replit secrets (
              <code className="text-wf-text-secondary">SIGNUP_MODE</code>,{" "}
              <code className="text-wf-text-secondary">SIGNUP_ALLOWLIST_EMAILS</code>,{" "}
              <code className="text-wf-text-secondary">SUPER_ADMIN_EMAIL</code>).
            </p>
          </section>

          <section className="rounded-2xl border border-wf-border bg-wf-surface p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-subhead font-bold">Users</h2>
            {users.length === 0 ? (
              <p className="mt-3 text-subhead text-wf-text-secondary">No users yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-wf-border">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-caption text-wf-text-secondary">{user.email}</p>
                    </div>
                    {user.isSuperAdmin && (
                      <span className="rounded-full bg-wf-accent-soft px-2 py-1 text-caption font-semibold text-wf-accent">
                        Super admin
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
