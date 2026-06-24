import { useState } from "react";
import type { AuthUser } from "../../shared/auth";
import { disableTotp, enableTotp, startTotpSetup } from "../lib/auth";

interface SecuritySettingsPanelProps {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onShowToast?: (message: string) => void;
}

export function SecuritySettingsPanel({
  user,
  onUserUpdated,
  onShowToast,
}: SecuritySettingsPanelProps) {
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStartSetup = async () => {
    setSubmitting(true);
    try {
      const payload = await startTotpSetup();
      setSetupSecret(payload.secret);
      setSetupUrl(payload.otpauthUrl);
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Failed to start 2FA setup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnable = async () => {
    setSubmitting(true);
    try {
      const nextUser = await enableTotp(code);
      setSetupSecret(null);
      setSetupUrl(null);
      setCode("");
      onUserUpdated(nextUser);
      onShowToast?.("Two-factor authentication enabled");
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Invalid authentication code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    setSubmitting(true);
    try {
      const nextUser = await disableTotp(password, code);
      setPassword("");
      setCode("");
      onUserUpdated(nextUser);
      onShowToast?.("Two-factor authentication disabled");
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Could not disable 2FA");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-wf-border bg-wf-surface shadow-[var(--shadow-card)]">
      <h2 className="border-b border-wf-border px-4 py-3 text-subhead font-bold text-wf-text">Security</h2>
      <div className="px-4 py-4">
        <p className="text-body font-medium text-wf-text">Two-factor authentication</p>
        <p className="mt-1 text-caption text-wf-text-tertiary">
          Protect your account with a 6-digit code from an authenticator app.
        </p>

        {user.totpEnabled ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-xl bg-wf-green/10 px-3 py-2 text-caption font-medium text-wf-green">
              2FA is enabled on this account.
            </p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Current password"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
            />
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Authentication code"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
            />
            <button
              type="button"
              disabled={submitting || !password || code.length !== 6}
              onClick={() => void handleDisable()}
              className="w-full rounded-xl border border-wf-red/30 py-3 text-body font-semibold text-wf-red disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {!setupSecret ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleStartSetup()}
                className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
              >
                Set up authenticator app
              </button>
            ) : (
              <>
                <div className="rounded-xl border border-wf-border bg-wf-bg px-3 py-3">
                  <p className="text-caption font-semibold text-wf-text">Manual setup key</p>
                  <p className="mt-1 break-all font-mono text-caption text-wf-text-secondary">
                    {setupSecret}
                  </p>
                  {setupUrl && (
                    <p className="mt-2 break-all text-caption text-wf-text-tertiary">{setupUrl}</p>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
                />
                <button
                  type="button"
                  disabled={submitting || code.length !== 6}
                  onClick={() => void handleEnable()}
                  className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
                >
                  Enable 2FA
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
