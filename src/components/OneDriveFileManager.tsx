import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Folder, Trash2, Upload } from "lucide-react";
import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import {
  deleteOneDriveItem,
  fetchOneDriveItems,
  type OneDriveItem,
  uploadOneDriveFile,
} from "../lib/microsoft";

interface OneDriveFileManagerProps {
  accounts: MicrosoftIntegrationStatus["accounts"];
  defaultAccountId?: string;
}

export function OneDriveFileManager({ accounts, defaultAccountId }: OneDriveFileManagerProps) {
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [parentStack, setParentStack] = useState<Array<{ id?: string; name: string }>>([
    { name: "OneDrive" },
  ]);
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentParentId = parentStack[parentStack.length - 1]?.id;

  const refresh = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchOneDriveItems(accountId, currentParentId);
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OneDrive items");
    } finally {
      setLoading(false);
    }
  }, [accountId, currentParentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openFolder = (item: OneDriveItem) => {
    if (!item.isFolder) return;
    setParentStack((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const goUp = () => {
    if (parentStack.length <= 1) return;
    setParentStack((prev) => prev.slice(0, -1));
  };

  const handleUpload = async (file: File) => {
    if (!accountId || !currentParentId) {
      setError("Open a folder before uploading");
      return;
    }
    await uploadOneDriveFile(accountId, currentParentId, file);
    await refresh();
  };

  const handleDelete = async (item: OneDriveItem) => {
    if (!window.confirm(`Delete "${item.name}" from OneDrive?`)) return;
    await deleteOneDriveItem(accountId, item.id);
    await refresh();
  };

  if (accounts.length === 0) {
    return (
      <p className="text-subhead text-wf-text-secondary">
        Connect Microsoft 365 to browse OneDrive files.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.length > 1 && (
        <select
          value={accountId}
          onChange={(event) => {
            setAccountId(event.target.value);
            setParentStack([{ name: "OneDrive" }]);
          }}
          className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-subhead"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.email}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goUp}
          disabled={parentStack.length <= 1}
          className="flex items-center gap-1 text-subhead font-medium text-wf-accent disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <p className="truncate text-caption font-semibold text-wf-text-secondary">
          {parentStack.map((entry) => entry.name).join(" / ")}
        </p>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-wf-accent px-3 py-1.5 text-caption font-semibold text-white">
          <Upload size={14} />
          Upload
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file).catch((err) => setError(String(err)));
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="text-caption text-wf-red">{error}</p>}
      {loading ? (
        <p className="text-subhead text-wf-text-tertiary">Loading…</p>
      ) : (
        <ul className="divide-y divide-wf-border rounded-xl border border-wf-border bg-wf-surface">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => (item.isFolder ? openFolder(item) : item.webUrl && window.open(item.webUrl, "_blank"))}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Folder size={16} className={item.isFolder ? "text-wf-accent" : "text-wf-text-tertiary"} />
                <span className="truncate text-subhead">{item.name}</span>
                {!item.isFolder && item.size != null && (
                  <span className="shrink-0 text-caption text-wf-text-tertiary">
                    {Math.round(item.size / 1024)} KB
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(item).catch((err) => setError(String(err)))}
                className="shrink-0 text-wf-text-tertiary hover:text-wf-red"
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-4 text-center text-subhead text-wf-text-tertiary">Empty folder</li>
          )}
        </ul>
      )}
    </div>
  );
}
