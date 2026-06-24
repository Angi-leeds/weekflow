import { useState } from "react";
import { APP_NAME } from "../branding";
import { requestPasswordReset } from "../lib/auth";

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewResetUrl, setPreviewResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      setPreviewResetUrl(result.previewResetUrl ?? null);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 shadow-[var(--shadow-card)]">
        <p className="text-caption font-semibold uppercase tracking-wide text-wf-accent">{APP_NAME}</p>
        <h1 className="mt-1 font-display text-title font-bold">Reset password</h1>
        <p className="mt-2 text-subhead text-wf-text-secondary">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-xl bg-wf-green/10 px-3 py-2 text-caption font-medium text-wf-green">
              If an account with that email exists, a reset link has been sent.
            </p>
            {previewResetUrl && (
              <div className="rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
                <p className="text-caption font-semibold text-wf-text">Dev preview link</p>
                <p className="mt-1 break-all text-caption text-wf-text-tertiary">{previewResetUrl}</p>
              </div>
            )}
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl border border-wf-border py-3 text-body font-semibold text-wf-text-secondary"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-xl border border-wf-border py-3 text-body font-semibold text-wf-text-secondary"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
