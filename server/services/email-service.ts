import { randomBytes } from "crypto";
import type { Request } from "express";
import { getAppBaseUrl } from "./microsoft-auth-service";

export function buildAppLink(req: Request | undefined, path: string): string {
  const base = req ? getAppBaseUrl(req) : (process.env.APP_URL ?? "http://localhost:5000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ delivered: boolean }> {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    try {
      const response = await fetch(smtpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html ?? input.text,
        }),
      });
      if (response.ok) {
        return { delivered: true };
      }
      console.warn("SMTP_URL webhook failed:", response.status);
    } catch (error) {
      console.warn("SMTP_URL webhook error:", error);
    }
  }

  console.log(`[auth-email] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
  return { delivered: false };
}

export async function sendPasswordResetEmail(
  req: Request | undefined,
  email: string,
  token: string,
): Promise<{ delivered: boolean; resetUrl: string }> {
  const resetUrl = buildAppLink(req, `/?reset=${encodeURIComponent(token)}`);
  const result = await sendAuthEmail({
    to: email,
    subject: "Reset your MyAxis password",
    text: `Use this link to reset your password (valid for 1 hour):\n\n${resetUrl}`,
  });
  return { ...result, resetUrl };
}

export async function sendInviteEmail(
  req: Request | undefined,
  email: string,
  token: string,
): Promise<{ delivered: boolean; inviteUrl: string }> {
  const inviteUrl = buildAppLink(req, `/?invite=${encodeURIComponent(token)}`);
  const result = await sendAuthEmail({
    to: email,
    subject: "You're invited to MyAxis",
    text: `You've been invited to join MyAxis. Create your account here (valid for 7 days):\n\n${inviteUrl}`,
  });
  return { ...result, inviteUrl };
}
