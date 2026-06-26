import { useEffect, useState } from 'react'
import type { EmailAccount, EmailMessage } from '../types'
import { connectedAccountIdFromAccountKey } from '../lib/connectedAccounts'

export type EmailComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward'

interface EmailComposeModalProps {
  open: boolean
  mode: EmailComposeMode
  replyTo?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  sending?: boolean
  onClose: () => void
  onSend: (payload: {
    connectedAccountId: string
    to?: string
    subject?: string
    body: string
    replyToExternalId?: string
    replyAll?: boolean
    forwardToExternalId?: string
    saveAsDraft?: boolean
    draftId?: string
  }) => void | Promise<void>
}

export function EmailComposeModal({
  open,
  mode,
  replyTo,
  accounts,
  defaultAccountId,
  sending = false,
  onClose,
  onSend,
}: EmailComposeModalProps) {
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? '')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!open) return

    const connectedId =
      replyTo?.connectedAccountId ??
      (defaultAccountId ? connectedAccountIdFromAccountKey(defaultAccountId) ?? defaultAccountId : undefined) ??
      connectedAccountIdFromAccountKey(accounts[0]?.id ?? '') ??
      accounts[0]?.id ??
      ''

    setAccountId(connectedId)

    if (mode === 'compose') {
      setTo('')
      setSubject('')
      setBody('')
      return
    }

    if (replyTo) {
      if (mode === 'forward') {
        setTo('')
        setSubject(
          replyTo.subject.startsWith('Fwd:') ? replyTo.subject : `Fwd: ${replyTo.subject}`,
        )
        setBody('')
        return
      }

      setTo(replyTo.fromEmail)
      setSubject(replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`)
      setBody('')
    }
  }, [open, mode, replyTo, accounts, defaultAccountId])

  if (!open) return null

  const isReply = mode === 'reply' || mode === 'replyAll'
  const isForward = mode === 'forward'
  const title =
    mode === 'compose'
      ? 'New message'
      : mode === 'replyAll'
        ? 'Reply all'
        : mode === 'forward'
          ? 'Forward'
          : 'Reply'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!body.trim() || !accountId) return

    if (isReply && replyTo?.externalId) {
      void onSend({
        connectedAccountId: accountId,
        body: body.trim(),
        replyToExternalId: replyTo.externalId,
        replyAll: mode === 'replyAll',
      })
      return
    }

    if (isForward && replyTo?.externalId) {
      if (!to.trim()) return
      void onSend({
        connectedAccountId: accountId,
        to: to.trim(),
        body: body.trim(),
        forwardToExternalId: replyTo.externalId,
      })
      return
    }

    if (!to.trim() || !subject.trim()) return
    void onSend({
      connectedAccountId: accountId,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
    })
  }

  const handleSaveDraft = () => {
    if (!accountId) return
    void onSend({
      connectedAccountId: accountId,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      saveAsDraft: true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex w-full max-w-lg max-h-[min(92dvh,100%)] flex-col rounded-t-3xl bg-wf-surface shadow-[var(--shadow-modal)] safe-bottom sm:rounded-3xl">
        <div className="shrink-0 border-b border-wf-border px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="text-[15px] font-medium text-wf-accent">
              Cancel
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {(mode === 'compose' || isForward) && accounts.length > 1 && (
              <Field label="From">
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className={inputClass}
                >
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={connectedAccountIdFromAccountKey(account.id) ?? account.id}
                    >
                      {account.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {(!isReply || isForward) && (
              <>
                <Field label="To">
                  <input
                    type="text"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="name@example.com"
                    className={inputClass}
                    autoFocus={isForward || mode === 'compose'}
                  />
                </Field>
                {!isReply && (
                  <Field label="Subject">
                    <input
                      type="text"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
              </>
            )}

            {isReply && !isForward && replyTo && (
              <div className="rounded-xl bg-wf-bg px-4 py-3 text-caption text-wf-text-secondary">
                <p>
                  {mode === 'replyAll' ? 'Reply all to' : 'Reply to'}{' '}
                  <span className="font-semibold text-wf-text">{replyTo.from}</span>
                </p>
                <p className="truncate">{replyTo.subject}</p>
              </div>
            )}

            {isForward && replyTo && (
              <div className="rounded-xl bg-wf-bg px-4 py-3 text-caption text-wf-text-secondary">
                <p className="font-semibold text-wf-text">Forwarding</p>
                <p className="truncate">{replyTo.subject}</p>
              </div>
            )}

            <Field label="Message">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                placeholder={
                  isForward ? 'Add a comment…' : isReply ? 'Write your reply…' : 'Write your message…'
                }
                className={`${inputClass} resize-none`}
                autoFocus={isReply && !isForward}
              />
            </Field>
          </div>

          <div className="shrink-0 space-y-2 border-t border-wf-border px-5 py-4">
            {mode === 'compose' && (
              <button
                type="button"
                disabled={sending}
                onClick={handleSaveDraft}
                className="w-full rounded-2xl border border-wf-border py-3 text-[15px] font-semibold text-wf-text disabled:opacity-50"
              >
                Save draft
              </button>
            )}
            <button
              type="submit"
              disabled={
                sending ||
                !body.trim() ||
                (isForward && !to.trim()) ||
                (!isReply && !isForward && (!to.trim() || !subject.trim()))
              }
              className="w-full rounded-2xl bg-wf-accent py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-wf-accent/25 disabled:opacity-50"
            >
              {sending ? 'Sending…' : isForward ? 'Forward' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-wf-text-secondary">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20'
