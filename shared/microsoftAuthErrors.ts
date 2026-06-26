/** Turn Microsoft OAuth / Graph token errors into short user-facing copy. */
export function friendlyMicrosoftAuthError(raw: string): string {
  if (
    raw.includes("consent_required") ||
    raw.includes("AADSTS65001") ||
    raw.includes("has not consented")
  ) {
    return "Microsoft needs permission again — open Settings, disconnect Outlook, then connect (or use Reconnect).";
  }
  if (raw.includes("invalid_grant") || raw.includes("AADSTS700082")) {
    return "Microsoft session expired. Reconnect Outlook in Settings.";
  }
  if (raw.includes("Microsoft session expired")) {
    return raw;
  }
  if (raw.length > 160) {
    return "Could not sync to Outlook. Try reconnecting your Microsoft account in Settings.";
  }
  return raw;
}
