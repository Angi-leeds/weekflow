import connectPgSimple from "connect-pg-simple";
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { isAuthEnabled } from "../config/auth-config";
import { getPool } from "../db/index";
import {
  getUserByEmail,
  getUserById,
  serializeUserForSession,
  verifyUserPassword,
} from "../services/user-service";

declare module "express-session" {
  interface SessionData {
    passport?: { user?: string };
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      displayName: string;
      isSuperAdmin: boolean;
      totpEnabled?: boolean;
      createdAt: string;
    }
  }
}

export function setupAuth(app: Express): boolean {
  if (!isAuthEnabled()) {
    console.log("SESSION_SECRET not set — auth gateway disabled (prototype mode)");
    return false;
  }

  const pool = getPool();
  if (!pool) {
    console.warn("SESSION_SECRET set but DATABASE_URL missing — auth gateway disabled");
    return false;
  }

  app.set("trust proxy", 1);

  const PgSession = connectPgSimple(session);
  const sessionMiddleware = session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await verifyUserPassword(email, password);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          return done(null, serializeUserForSession(user));
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await getUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, serializeUserForSession(user));
    } catch (error) {
      // Stale session or schema mismatch — log out instead of 500ing every page load.
      console.error("Failed to deserialize user session — treating as logged out:", error);
      done(null, false);
    }
  });

  console.log("Auth gateway enabled (session + passport)");
  return true;
}

export async function findUserForLogin(email: string) {
  return getUserByEmail(email);
}
