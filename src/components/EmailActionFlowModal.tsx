import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ClipboardList, Copy, FolderOpen, Share2, X } from 'lucide-react'
import type { EmailActionFlowOptions } from '../../shared/emailActionFlow'
import { DEFAULT_EMAIL_ACTION_FLOW } from '../../shared/emailActionFlow'
import { BOARD_DISPLAY_LABELS } from '../../shared/itemShares'
import type { EmailMessage } from '../types'
import { MOCK_CLOUD_FOLDERS } from '../mockData'
import { OneDriveFolderPicker } from './OneDriveFolderPicker'
import { GoogleDriveFolderPicker } from './GoogleDriveFolderPicker'
import { isGoogleEmail, isMicrosoftEmail } from '../lib/connectedAccounts'

interface EmailActionFlowModalProps {
  open: boolean
  email: EmailMessage | null
  defaultDueDate?: string
  usingRealMicrosoft?: boolean
  usingRealGoogle?: boolean
  connectedAccountId?: string
  onClose: () => void
  onSubmit: (email: EmailMessage, options: EmailActionFlowOptions) => Promise<void>
}

export function EmailActionFlowModal({
  open,
  email,
  defaultDueDate,
  usingRealMicrosoft = false,
  usingRealGoogle = false,
  connectedAccountId,
  onClose,
  onSubmit,
}: EmailActionFlowModalProps) {
  const [options, setOptions] = useState<EmailActionFlowOptions>(DEFAULT_EMAIL_ACTION_FLOW)
  const [submitting, setSubmitting] = useState(false)

  const resolvedAccountId = useMemo(() => {
    if (connectedAccountId) return connectedAccountId
    if (email?.connectedAccountId) return email.connectedAccountId
    if (email?.accountId?.startsWith('ms-')) return email.accountId.slice(3)
    if (email?.accountId?.startsWith('google-')) return email.accountId.slice(7)
    return undefined
  }, [connectedAccountId, email])

  const usesGoogleDrive = Boolean(email && isGoogleEmail(email) && usingRealGoogle)
  const usesOneDrive = Boolean(email && isMicrosoftEmail(email) && usingRealMicrosoft)
  const usesRealCloud = usesGoogleDrive || usesOneDrive

  useEffect(() => {
    if (open && email) {
      const mockFolder = MOCK_CLOUD_FOLDERS[0]
      setOptions({
        ...DEFAULT_EMAIL_ACTION_FLOW,
        dueDate: defaultDueDate ?? DEFAULT_EMAIL_ACTION_FLOW.dueDate,
        folderId: usesRealCloud ? undefined : mockFolder?.id,
        folderUrl: usesRealCloud ? undefined : mockFolder?.url,
        folderLabel: usesRealCloud ? undefined : mockFolder?.label,
        folderProvider: usesRealCloud ? undefined : mockFolder?.provider,
      })
    }
  }, [open, email, defaultDueDate, usesRealCloud])

  if (!open || !email) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!options.dueDate) return
    if (options.tagFolder && !options.folderId) return
    setSubmitting(true)
    try {
      await onSubmit(email, options)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const folderTagLabel = usesGoogleDrive
    ? 'Tag Google Drive folder'
    : usesOneDrive
      ? 'Tag OneDrive folder'
      : 'Tag OneDrive folder (mock)'
  const autoCopyLabel = usesRealCloud
    ? 'Auto-copy email to folder'
    : 'Auto-copy email to folder (mock)'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-labelledby="email-action-flow-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-wf-surface shadow-xl"
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-wf-border bg-wf-surface px-4 py-3">
          <div>
            <h2 id="email-action-flow-title" className="font-display text-body font-bold">
              Email action flow
            </h2>
            <p className="mt-0.5 line-clamp-2 text-caption text-wf-text-secondary">
              {email.subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-wf-text-tertiary hover:bg-wf-bg"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-caption text-wf-text-tertiary">
            One submit creates calendar entry, task, links, and optional folder tag — all connected.
          </p>

          <FlowToggle
            icon={CalendarPlus}
            label="Add to calendar"
            checked={options.createCalendar}
            onChange={(createCalendar) => setOptions((prev) => ({ ...prev, createCalendar }))}
          />

          {options.createCalendar && (
            <label className="block pl-8">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Due date
              </span>
              <input
                type="date"
                required
                value={options.dueDate}
                onChange={(event) =>
                  setOptions((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent"
              />
            </label>
          )}

          <FlowToggle
            icon={ClipboardList}
            label="Create pay-before task"
            checked={options.createTask}
            onChange={(createTask) => setOptions((prev) => ({ ...prev, createTask }))}
          />

          {options.createTask && (
            <label className="block pl-8">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Task due (days before bill date)
              </span>
              <select
                value={options.taskLeadDays}
                onChange={(event) =>
                  setOptions((prev) => ({
                    ...prev,
                    taskLeadDays: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent"
              >
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>1 week before</option>
              </select>
            </label>
          )}

          <FlowToggle
            icon={FolderOpen}
            label={folderTagLabel}
            checked={options.tagFolder}
            onChange={(tagFolder) => setOptions((prev) => ({ ...prev, tagFolder }))}
          />

          {options.tagFolder && usesOneDrive && resolvedAccountId && (
            <div className="pl-8">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Folder
              </span>
              <OneDriveFolderPicker
                accountId={resolvedAccountId}
                selectedFolderId={options.folderId}
                onSelect={(folder) =>
                  setOptions((prev) => ({
                    ...prev,
                    folderId: folder.id,
                    folderUrl: folder.url,
                    folderLabel: folder.label,
                    folderProvider: 'OneDrive',
                  }))
                }
              />
              {options.folderLabel && (
                <p className="mt-2 text-caption text-wf-text-tertiary">
                  Selected: {options.folderLabel}
                </p>
              )}
            </div>
          )}

          {options.tagFolder && usesGoogleDrive && resolvedAccountId && (
            <div className="pl-8">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Folder
              </span>
              <GoogleDriveFolderPicker
                accountId={resolvedAccountId}
                selectedFolderId={options.folderId}
                onSelect={(folder) =>
                  setOptions((prev) => ({
                    ...prev,
                    folderId: folder.id,
                    folderUrl: folder.url,
                    folderLabel: folder.label,
                    folderProvider: 'Google Drive',
                  }))
                }
              />
              {options.folderLabel && (
                <p className="mt-2 text-caption text-wf-text-tertiary">
                  Selected: {options.folderLabel}
                </p>
              )}
            </div>
          )}

          {options.tagFolder && !usesRealCloud && (
            <label className="block pl-8">
              <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                Folder path
              </span>
              <select
                value={options.folderId ?? ''}
                onChange={(event) => {
                  const folder = MOCK_CLOUD_FOLDERS.find((entry) => entry.id === event.target.value)
                  setOptions((prev) => ({
                    ...prev,
                    folderId: event.target.value,
                    folderUrl: folder?.url,
                    folderLabel: folder?.label,
                    folderProvider: folder?.provider,
                  }))
                }}
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent"
              >
                {MOCK_CLOUD_FOLDERS.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {options.tagFolder && usesRealCloud && !resolvedAccountId && (
            <p className="pl-8 text-caption text-wf-red">
              Connect Gmail or Outlook in Settings to pick a cloud folder.
            </p>
          )}

          <FlowToggle
            icon={Copy}
            label={autoCopyLabel}
            checked={options.autoCopy}
            onChange={(autoCopy) => setOptions((prev) => ({ ...prev, autoCopy }))}
          />

          <div className="rounded-xl bg-wf-bg px-3 py-3">
            <FlowToggle
              icon={Share2}
              label="Share calendar entry to family board"
              checked={options.shareToBoard}
              onChange={(shareToBoard) => setOptions((prev) => ({ ...prev, shareToBoard }))}
            />
            {options.shareToBoard && (
              <label className="mt-3 block pl-8">
                <span className="mb-1 block text-caption font-medium text-wf-text-secondary">
                  Board display
                </span>
                <select
                  value={options.boardDisplay}
                  onChange={(event) =>
                    setOptions((prev) => ({
                      ...prev,
                      boardDisplay: event.target.value as EmailActionFlowOptions['boardDisplay'],
                    }))
                  }
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                >
                  {Object.entries(BOARD_DISPLAY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !options.dueDate ||
              (options.tagFolder && !options.folderId)
            }
            className="w-full rounded-xl bg-wf-accent py-3.5 text-body font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create linked items'}
          </button>
        </form>
      </div>
    </div>
  )
}

function FlowToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof CalendarPlus
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded accent-wf-accent"
      />
      <Icon size={18} className="shrink-0 text-wf-accent" strokeWidth={1.75} />
      <span className="text-[15px] font-medium">{label}</span>
    </label>
  )
}

export { BOARD_DISPLAY_LABELS }
