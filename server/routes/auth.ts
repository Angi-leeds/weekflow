import type { Express, Request, Response } from "express";
import passport from "passport";
import type { AuthConfig } from "../../shared/auth";
import {
  getSignupAllowlist,
  getSignupMode,
  getSuperAdminEmail,
  isAuthEnabled,
  isRegistrationAllowed,
} from "../config/auth-config";
import { countUsers, registerUser } from "../services/user-service";

async function buildAuthConfig(): Promise<AuthConfig> {
  const enabled = isAuthEnabled();
  const userCount = enabled ? await countUsers() : 0;
  return {
    enabled,
    signupMode: getSignupMode(),
    registrationAllowed: enabled ? isRegistrationAllowed(userCount) : false,
  };
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/config", async (_req, res) => {
    try {
      res.json(await buildAuthConfig());
    } catch (error) {
      console.error("GET /api/auth/config failed:", error);
      res.status(500).json({ message: "Failed to load auth config" });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    if (!isAuthEnabled()) {
      res.json({ user: null, enabled: false });
      return;
    }

    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ message: "Not authenticated", enabled: true });
      return;
    }

    res.json({ user: req.user, enabled: true });
  });

  app.post("/api/auth/register", async (req, res) => {
    if (!isAuthEnabled()) {
      res.status(503).json({ message: "Auth is not enabled on this deployment" });
      return;
    }

    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const displayName =
      typeof req.body?.displayName === "string" ? req.body.displayName : undefined;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    try {
      const result = await registerUser({ email, password, displayName });
      if (result.error) {
        const status =
          result.error === "email_taken"
            ? 409
            : result.error === "signup_closed" || result.error === "not_on_allowlist"
              ? 403
              : 400;
        res.status(status).json({
          message: registrationErrorMessage(result.error),
          error: result.error,
        });
        return;
      }

      if (!result.user) {
        res.status(500).json({ message: "Registration failed" });
        return;
      }

      req.login(result.user, (loginError) => {
        if (loginError) {
          console.error("Post-register login failed:", loginError);
          res.status(201).json({ user: result.user, loginFailed: true });
          return;
        }
        res.status(201).json({ user: result.user });
      });
    } catch (error) {
      console.error("POST /api/auth/register failed:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    if (!isAuthEnabled()) {
      res.status(503).json({ message: "Auth is not enabled on this deployment" });
      return;
    }

    passport.authenticate("local", (error: Error | null, user: Express.User | false, info?: { message?: string }) => {
      if (error) {
        next(error);
        return;
      }
      if (!user) {
        res.status(401).json({
          message: info?.message ?? "Incorrect email or password",
        });
        return;
      }

      req.login(user, (loginError) => {
        if (loginError) {
          next(loginError);
          return;
        }
        res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    if (!req.isAuthenticated?.()) {
      res.status(204).end();
      return;
    }

    req.logout((error) => {
      if (error) {
        console.error("Logout failed:", error);
        res.status(500).json({ message: "Logout failed" });
        return;
      }
      req.session.destroy((destroyError) => {
        if (destroyError) {
          console.error("Session destroy failed:", destroyError);
        }
        res.clearCookie("connect.sid");
        res.status(204).end();
      });
    });
  });
}

function registrationErrorMessage(code: string): string {
  switch (code) {
    case "email_taken":
      return "An account with this email already exists.";
    case "signup_closed":
      return "Registration is closed. Contact the app owner for access.";
    case "not_on_allowlist":
      return "This email is not on the registration allowlist.";
    case "password_too_short":
      return "Password must be at least 8 characters.";
    case "invalid_email":
      return "Enter a valid email address.";
    case "database_unavailable":
      return "Database is not available. Try again later.";
    default:
      return "Registration failed.";
  }
}

export async function getSuperAdminOverview() {
  const userCount = await countUsers();
  return {
    signupMode: getSignupMode(),
    allowlistCount: getSignupAllowlist().length,
    userCount,
    superAdminEmailConfigured: Boolean(getSuperAdminEmail()),
    authEnabled: isAuthEnabled(),
  };
}
