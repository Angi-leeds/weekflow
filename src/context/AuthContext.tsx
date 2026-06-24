import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthConfig, AuthUser } from "../../shared/auth";
import {
  clearAuthUrlParams,
  fetchAuthConfig,
  fetchCurrentUser,
  logout as logoutRequest,
  readAuthUrlParams,
} from "../lib/auth";
import { AcceptInviteScreen } from "../components/AcceptInviteScreen";
import { AuthScreen } from "../components/AuthScreen";
import { ResetPasswordScreen } from "../components/ResetPasswordScreen";

interface AuthContextValue {
  config: AuthConfig | null;
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlParams] = useState(() => readAuthUrlParams());

  const refresh = useCallback(async () => {
    const [nextConfig, session] = await Promise.all([
      fetchAuthConfig(),
      fetchCurrentUser().catch(() => ({ user: null, enabled: true })),
    ]);
    setConfig(nextConfig);
    setUser(nextConfig.enabled ? session.user : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ config, user, loading, refresh, setUser, logout }),
    [config, user, loading, refresh, logout],
  );

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-wf-bg">
        <p className="text-subhead text-wf-text-secondary">Loading…</p>
      </div>
    );
  }

  if (config?.enabled && !user) {
    if (urlParams.reset) {
      return (
        <AuthContext.Provider value={value}>
          <ResetPasswordScreen
            token={urlParams.reset}
            onComplete={() => {
              clearAuthUrlParams();
              window.location.href = window.location.pathname;
            }}
          />
        </AuthContext.Provider>
      );
    }

    if (urlParams.invite) {
      return (
        <AuthContext.Provider value={value}>
          <AcceptInviteScreen
            token={urlParams.invite}
            config={config}
            onAuthenticated={(nextUser) => {
              setUser(nextUser);
            }}
            onBack={() => {
              clearAuthUrlParams();
              window.location.href = window.location.pathname;
            }}
          />
        </AuthContext.Provider>
      );
    }

    return (
      <AuthContext.Provider value={value}>
        <AuthScreen
          config={config}
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
          }}
        />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
