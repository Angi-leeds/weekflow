import { useEffect, useState } from "react";
import { MessageSquare, Video } from "lucide-react";
import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import type { CalendarItem } from "../types";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

interface TeamsPanelProps {
  accounts: MicrosoftIntegrationStatus["accounts"];
  upcomingItems: CalendarItem[];
  defaultAccountId?: string;
}

export function TeamsPanel({ accounts, upcomingItems, defaultAccountId }: TeamsPanelProps) {
  const [accountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [chats, setChats] = useState<Array<{ id: string; topic?: string; webUrl?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const meetings = upcomingItems.filter((item) => item.onlineMeetingUrl).slice(0, 5);

  useEffect(() => {
    if (!accountId) return;
    void apiFetch<Array<{ id: string; topic?: string; webUrl?: string }>>(
      `/api/microsoft/teams/chats?accountId=${encodeURIComponent(accountId)}`,
    )
      .then(setChats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load Teams chats"));
  }, [accountId]);

  if (accounts.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-wf-border/50 px-4 py-4">
      <p className="text-caption font-semibold text-wf-text-secondary">Microsoft Teams</p>
      {error && <p className="text-caption text-wf-red">{error}</p>}

      {meetings.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1 text-caption font-semibold text-wf-text-secondary">
            <Video size={14} /> Upcoming meetings
          </p>
          <ul className="space-y-2">
            {meetings.map((item) => (
              <li key={item.id}>
                <a
                  href={item.onlineMeetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-[#464775]/10 px-3 py-2 text-subhead font-semibold text-[#464775]"
                >
                  Join: {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chats.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1 text-caption font-semibold text-wf-text-secondary">
            <MessageSquare size={14} /> Recent chats
          </p>
          <ul className="space-y-1">
            {chats.slice(0, 5).map((chat) => (
              <li key={chat.id}>
                {chat.webUrl ? (
                  <a
                    href={chat.webUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-subhead text-wf-accent"
                  >
                    {chat.topic}
                  </a>
                ) : (
                  <span className="text-subhead text-wf-text">{chat.topic}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
