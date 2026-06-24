import { useEffect, useState } from "react";
import type { AuthUser } from "../../shared/auth";
import { APP_NAME } from "../branding";
import { clearAuthUrlParams, fetchResetTokenPreview, resetPassword } from "../lib/auth";

interface ResetPasswordScreenProps {
  token: string;
  onComplete: () => void;
}

export function ResetPasswordScreen({ token, onComplete }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResetTokenPreview(token)
      .then((preview) => {
        setValid(preview.valid);
        setEmail(preview.email ?? null);
      })
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      clearAuthUrlParams();
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (valid === null) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
        <p className="text-subhead text-wf-text-secondary">Checking reset link…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-title font-bold">Link expired</h1>
          <p className="mt-2 text-subhead text-wf-text-secondary">
            This password reset link is invalid or has expired.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-title font-bold">Password updated</h1>
          <p className="mt-2 text-subhead text-wf-text-secondary">You can sign in with your new password.</p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 shadow-[var(--shadow-card)]">
        <p className="text-caption font-semibold uppercase tracking-wide text-wf-accent">{APP_NAME}</p>
        <h1 className="mt-1 font-display text-title font-bold">Choose a new password</h1>
        {email && <p className="mt-2 text-subhead text-wf-text-secondary">For {email}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
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
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
