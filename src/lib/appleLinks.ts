export const ICLOUD_MAIL_URL = "https://www.icloud.com/mail/";
export const ICLOUD_NOTES_URL = "https://www.icloud.com/notes/";
export const ICLOUD_CALENDAR_URL = "https://www.icloud.com/calendar/";

export function icloudMailUrl(_email?: string): string {
  return ICLOUD_MAIL_URL;
}

export function icloudNotesUrl(): string {
  return ICLOUD_NOTES_URL;
}

export function icloudCalendarUrl(): string {
  return ICLOUD_CALENDAR_URL;
}

export function mailtoUrl(email: string, subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query ? `mailto:${encodeURIComponent(email)}?${query}` : `mailto:${encodeURIComponent(email)}`;
}

export function noteTitleForAppleNotes(title: string, body: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) return title.trim();
  return `${title.trim()}\n\n${trimmedBody}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openExternalUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
