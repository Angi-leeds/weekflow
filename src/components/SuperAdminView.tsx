import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AuthUser, HouseholdInviteRow } from "../../shared/auth";
import { APP_NAME } from "../branding";
import {
  createSuperAdminInvite,
  fetchSuperAdminInvites,
  fetchSuperAdminOverview,
  fetchSuperAdminUsers,
  revokeSuperAdminInvite,
} from "../lib/auth";
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
  const [invites, setInvites] = useState<HouseholdInviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const loadData = async () => {
    const [nextOverview, nextUsers, nextInvites] = await Promise.all([
      fetchSuperAdminOverview(),
      fetchSuperAdminUsers(),
      fetchSuperAdminInvites(),
    ]);
    setOverview(nextOverview);
    setUsers(nextUsers.users);
    setInvites(nextInvites.invites);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadData();
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

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteMessage(null);
    setSubmittingInvite(true);
    try {
      const result = await createSuperAdminInvite({
        email: inviteEmail,
        displayName: inviteName.trim() || undefined,
      });
      setInviteEmail("");
      setInviteName("");
      await loadData();
      setInviteMessage(
        result.delivered
          ? `Invite sent to ${result.invite.email}`
          : `Invite created. Share this link: ${result.inviteUrl}`,
      );
    } catch (createError) {
      setInviteMessage(createError instanceof Error ? createError.message : "Failed to create invite");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    await revokeSuperAdminInvite(id);
    await loadData();
  };

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
            <h2 className="text-subhead font-bold">Household invites</h2>
            <p className="mt-2 text-caption text-wf-text-tertiary">
              Invite links bypass closed signup for the invited email (valid 7 days).
            </p>
            <form onSubmit={handleCreateInvite} className="mt-4 space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Email to invite"
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
                required
              />
              <input
                type="text"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Display name (optional)"
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
              />
              <button
                type="submit"
                disabled={submittingInvite}
                className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
              >
                {submittingInvite ? "Creating invite…" : "Create invite link"}
              </button>
            </form>
            {inviteMessage && (
              <p className="mt-3 break-all rounded-xl bg-wf-accent-soft px-3 py-2 text-caption text-wf-accent">
                {inviteMessage}
              </p>
            )}
            {invites.length > 0 && (
              <ul className="mt-4 divide-y divide-wf-border">
                {invites.map((invite) => (
                  <li key={invite.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{invite.email}</p>
                        <p className="break-all text-caption text-wf-text-tertiary">{invite.inviteUrl}</p>
                        <p className="mt-1 text-caption text-wf-text-tertiary">
                          {invite.acceptedAt ? "Accepted" : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      {!invite.acceptedAt && (
                        <button
                          type="button"
                          onClick={() => void handleRevokeInvite(invite.id)}
                          className="shrink-0 rounded-lg border border-wf-border px-2 py-1 text-caption font-semibold text-wf-red"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                    <div className="flex flex-col items-end gap-1">
                      {user.isSuperAdmin && (
                        <span className="rounded-full bg-wf-accent-soft px-2 py-1 text-caption font-semibold text-wf-accent">
                          Super admin
                        </span>
                      )}
                      {user.totpEnabled && (
                        <span className="rounded-full bg-wf-green/10 px-2 py-1 text-caption font-semibold text-wf-green">
                          2FA
                        </span>
                      )}
                    </div>
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
