import { useState } from "react";
import type { AuthUser } from "../../shared/auth";
import { APP_NAME } from "../branding";
import { verifyTotpLogin } from "../lib/auth";

interface TotpLoginScreenProps {
  challengeToken: string;
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
}

export function TotpLoginScreen({ challengeToken, onAuthenticated, onBack }: TotpLoginScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await verifyTotpLogin(challengeToken, code);
      onAuthenticated(user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 shadow-[var(--shadow-card)]">
        <p className="text-caption font-semibold uppercase tracking-wide text-wf-accent">{APP_NAME}</p>
        <h1 className="mt-1 font-display text-title font-bold">Two-factor code</h1>
        <p className="mt-2 text-subhead text-wf-text-secondary">
          Enter the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Authentication code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-center text-title tracking-[0.3em] outline-none focus:border-wf-accent"
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-wf-red/10 px-3 py-2 text-caption font-medium text-wf-red">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Continue"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl border border-wf-border py-3 text-body font-semibold text-wf-text-secondary"
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
