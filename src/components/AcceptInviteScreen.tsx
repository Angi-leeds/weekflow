import { useEffect, useState } from "react";
import type { AuthConfig, AuthUser } from "../../shared/auth";
import { APP_NAME } from "../branding";
import { clearAuthUrlParams, fetchInvitePreview, register } from "../lib/auth";

interface AcceptInviteScreenProps {
  token: string;
  config: AuthConfig;
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
}

export function AcceptInviteScreen({
  token,
  config,
  onAuthenticated,
  onBack,
}: AcceptInviteScreenProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvitePreview(token)
      .then((preview) => {
        setValid(preview.valid);
        if (preview.email) setEmail(preview.email);
        if (preview.displayName) setDisplayName(preview.displayName);
      })
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({
        email,
        password,
        displayName: displayName.trim() || undefined,
        inviteToken: token,
      });
      clearAuthUrlParams();
      onAuthenticated(user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (valid === null) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
        <p className="text-subhead text-wf-text-secondary">Checking invite…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-title font-bold">Invite expired</h1>
          <p className="mt-2 text-subhead text-wf-text-secondary">
            This household invite is invalid or has already been used.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 shadow-[var(--shadow-card)]">
        <p className="text-caption font-semibold uppercase tracking-wide text-wf-accent">{APP_NAME}</p>
        <h1 className="mt-1 font-display text-title font-bold">Accept invite</h1>
        <p className="mt-2 text-subhead text-wf-text-secondary">
          {config.signupMode === "closed"
            ? "Create your account to join the household."
            : "Set up your account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Email</span>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-wf-text-secondary outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-wf-red/10 px-3 py-2 text-caption font-medium text-wf-red">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
