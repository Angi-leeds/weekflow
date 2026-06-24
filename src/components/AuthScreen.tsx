import { useState } from "react";
import type { AuthConfig, AuthUser } from "../../shared/auth";
import { APP_NAME } from "../branding";
import { login, register } from "../lib/auth";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { TotpLoginScreen } from "./TotpLoginScreen";

type AuthMode = "login" | "register";

interface AuthScreenProps {
  config: AuthConfig;
  onAuthenticated: (user: AuthUser) => void;
}

export function AuthScreen({ config, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    config.registrationAllowed ? "register" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [totpChallenge, setTotpChallenge] = useState<string | null>(null);

  if (showForgot) {
    return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;
  }

  if (totpChallenge) {
    return (
      <TotpLoginScreen
        challengeToken={totpChallenge}
        onAuthenticated={onAuthenticated}
        onBack={() => setTotpChallenge(null)}
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.requiresTotp && result.challengeToken) {
          setTotpChallenge(result.challengeToken);
          return;
        }
        if (result.user) {
          onAuthenticated(result.user);
        }
        return;
      }

      const user = await register({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });
      onAuthenticated(user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-wf-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-wf-surface p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-wf-accent">
            {APP_NAME}
          </p>
          <h1 className="mt-1 font-display text-title font-bold">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-subhead text-wf-text-secondary">
            {mode === "login"
              ? "Sign in to access your household hub."
              : config.signupMode === "closed"
                ? "Registration is limited to approved emails only."
                : "Set up your account to get started."}
          </p>
        </div>

        {config.registrationAllowed && (
          <div className="mb-5 flex rounded-xl bg-wf-bg p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-subhead font-semibold transition ${
                mode === "login" ? "bg-wf-surface text-wf-text shadow-sm" : "text-wf-text-secondary"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-subhead font-semibold transition ${
                mode === "register"
                  ? "bg-wf-surface text-wf-text shadow-sm"
                  : "text-wf-text-secondary"
              }`}
            >
              Register
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 outline-none focus:border-wf-accent"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>

          {mode === "login" && config.passwordResetEnabled && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-caption font-semibold text-wf-accent"
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="rounded-xl bg-wf-red/10 px-3 py-2 text-caption font-medium text-wf-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {config.registrationAllowed && mode === "login" && (
          <p className="mt-4 text-center text-caption text-wf-text-tertiary">
            Need an account?{" "}
            <button
              type="button"
              className="font-semibold text-wf-accent"
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
