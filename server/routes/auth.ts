import type { Express, Request, Response } from "express";
import type { AuthConfig } from "../../shared/auth";
import {
  getSignupAllowlist,
  getSignupMode,
  getSuperAdminEmail,
  isAuthEnabled,
  isRegistrationAllowed,
} from "../config/auth-config";
import { requireAuthenticated } from "../middleware/require-auth";
import { consumeLoginChallenge, createLoginChallenge } from "../services/auth-challenge-service";
import {
  createPasswordResetToken,
  previewPasswordResetToken,
  resetPasswordWithToken,
  userHasTotpEnabled,
} from "../services/password-reset-service";
import { previewHouseholdInvite } from "../services/invite-service";
import {
  beginTotpSetup,
  countUsers,
  disableTotp,
  enableTotp,
  getUserById,
  registerUser,
  serializeUserForSession,
  verifyUserPassword,
  verifyUserTotp,
} from "../services/user-service";

async function buildAuthConfig(): Promise<AuthConfig> {
  const enabled = isAuthEnabled();
  const userCount = enabled ? await countUsers() : 0;
  return {
    enabled,
    signupMode: getSignupMode(),
    registrationAllowed: enabled ? isRegistrationAllowed(userCount) : false,
    passwordResetEnabled: enabled,
    invitesEnabled: enabled,
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

  app.get("/api/auth/invite/:token", async (req, res) => {
    try {
      const preview = await previewHouseholdInvite(req.params.token);
      res.json(preview);
    } catch (error) {
      console.error("GET /api/auth/invite/:token failed:", error);
      res.status(500).json({ message: "Failed to load invite" });
    }
  });

  app.get("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const preview = await previewPasswordResetToken(req.params.token);
      res.json(preview);
    } catch (error) {
      console.error("GET /api/auth/reset-password/:token failed:", error);
      res.status(500).json({ message: "Failed to verify reset token" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    if (!isAuthEnabled()) {
      res.status(503).json({ message: "Auth is not enabled on this deployment" });
      return;
    }

    const email = typeof req.body?.email === "string" ? req.body.email : "";
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    try {
      const result = await createPasswordResetToken(email, req);
      res.json({
        message: "If an account with that email exists, a reset link has been sent.",
        previewResetUrl: result.resetUrl,
      });
    } catch (error) {
      console.error("POST /api/auth/forgot-password failed:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!token || !password) {
      res.status(400).json({ message: "Token and password are required" });
      return;
    }

    try {
      const result = await resetPasswordWithToken(token, password);
      if (!result.ok) {
        res.status(400).json({ message: resetErrorMessage(result.error) });
        return;
      }
      res.json({ message: "Password updated. You can sign in now." });
    } catch (error) {
      console.error("POST /api/auth/reset-password failed:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
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
    const inviteToken =
      typeof req.body?.inviteToken === "string" ? req.body.inviteToken : undefined;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    try {
      const result = await registerUser({ email, password, displayName, inviteToken });
      if (result.error) {
        const status =
          result.error === "email_taken"
            ? 409
            : result.error === "signup_closed" ||
                result.error === "not_on_allowlist" ||
                result.error === "invalid_invite" ||
                result.error === "invite_email_mismatch"
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

  app.post("/api/auth/login", async (req, res, next) => {
    if (!isAuthEnabled()) {
      res.status(503).json({ message: "Auth is not enabled on this deployment" });
      return;
    }

    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
      const dbUser = await verifyUserPassword(email, password);
      if (!dbUser) {
        res.status(401).json({ message: "Incorrect email or password" });
        return;
      }

      if (userHasTotpEnabled(dbUser)) {
        const challengeToken = await createLoginChallenge(dbUser.id);
        res.json({ requiresTotp: true, challengeToken });
        return;
      }

      const sessionUser = serializeUserForSession(dbUser);
      req.login(sessionUser, (loginError) => {
        if (loginError) {
          next(loginError);
          return;
        }
        res.json({ user: sessionUser });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/totp/login", async (req, res, next) => {
    const challengeToken =
      typeof req.body?.challengeToken === "string" ? req.body.challengeToken : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!challengeToken || !code) {
      res.status(400).json({ message: "Challenge token and code are required" });
      return;
    }

    try {
      const userId = await consumeLoginChallenge(challengeToken);
      if (!userId) {
        res.status(401).json({ message: "Login challenge expired. Sign in again." });
        return;
      }

      const valid = await verifyUserTotp(userId, code);
      if (!valid) {
        res.status(401).json({ message: "Invalid authentication code" });
        return;
      }

      const dbUser = await getUserById(userId);
      if (!dbUser) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      const sessionUser = serializeUserForSession(dbUser);
      req.login(sessionUser, (loginError) => {
        if (loginError) {
          next(loginError);
          return;
        }
        res.json({ user: sessionUser });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/totp/setup", requireAuthenticated, async (req, res) => {
    try {
      const payload = await beginTotpSetup(req.user!.id);
      if (!payload) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(payload);
    } catch (error) {
      console.error("POST /api/auth/totp/setup failed:", error);
      res.status(500).json({ message: "Failed to start 2FA setup" });
    }
  });

  app.post("/api/auth/totp/enable", requireAuthenticated, async (req, res) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!code) {
      res.status(400).json({ message: "Authentication code is required" });
      return;
    }

    try {
      const result = await enableTotp(req.user!.id, code);
      if (!result.ok) {
        res.status(400).json({ message: "Invalid authentication code" });
        return;
      }
      const dbUser = await getUserById(req.user!.id);
      if (!dbUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const sessionUser = serializeUserForSession(dbUser);
      req.login(sessionUser, () => {
        res.json({ user: sessionUser });
      });
    } catch (error) {
      console.error("POST /api/auth/totp/enable failed:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  app.post("/api/auth/totp/disable", requireAuthenticated, async (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!password || !code) {
      res.status(400).json({ message: "Password and authentication code are required" });
      return;
    }

    try {
      const result = await disableTotp(req.user!.id, password, code);
      if (!result.ok) {
        res.status(400).json({
          message:
            result.error === "invalid_password"
              ? "Incorrect password"
              : "Invalid authentication code",
        });
        return;
      }
      const dbUser = await getUserById(req.user!.id);
      if (!dbUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const sessionUser = serializeUserForSession(dbUser);
      req.login(sessionUser, () => {
        res.json({ user: sessionUser });
      });
    } catch (error) {
      console.error("POST /api/auth/totp/disable failed:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
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
    case "invalid_invite":
      return "This invite link is invalid or has expired.";
    case "invite_email_mismatch":
      return "Register with the email address that received the invite.";
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

function resetErrorMessage(code?: string): string {
  switch (code) {
    case "password_too_short":
      return "Password must be at least 8 characters.";
    case "invalid_token":
      return "This reset link is invalid or has expired.";
    default:
      return "Failed to reset password.";
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
