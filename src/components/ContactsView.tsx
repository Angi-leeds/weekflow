import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Mail, PenLine, Phone, Plus, Search, Star, User, Globe, MapPin, Calendar, StickyNote, Briefcase, Smartphone, Home } from "lucide-react";
import type { Contact, EmailAccount, EmailFolder, EmailMessage } from "../types";
import {
  countEmailsFromContact,
  emailsForContact,
  groupContactEmailsByFolder,
  isEditableContact,
} from "../lib/contacts";
import { useIsWide } from "../hooks/useMediaQuery";
import { ContactFormModal } from "./ContactFormModal";

type ContactFilter = "all" | "starred" | "household";

interface ContactsViewProps {
  contacts: Contact[];
  emails: EmailMessage[];
  emailAccounts: EmailAccount[];
  emailFolders: EmailFolder[];
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onToggleStar: (id: string) => void;
  onOpenEmail: (email: EmailMessage) => void;
}

export function ContactsView({
  contacts,
  emails,
  emailAccounts,
  emailFolders,
  onSaveContact,
  onDeleteContact,
  onToggleStar,
  onOpenEmail,
}: ContactsViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const isWide = useIsWide();

  const filtered = useMemo(() => {
    let list = contacts;
    if (filter === "starred") list = list.filter((contact) => contact.starred);
    if (filter === "household") list = list.filter((contact) => contact.household);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.emailSecondary?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.jobTitle?.toLowerCase().includes(query) ||
          contact.notes?.toLowerCase().includes(query) ||
          contact.phone?.includes(query) ||
          contact.mobilePhone?.includes(query) ||
          contact.homePhone?.includes(query),
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, filter, search]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((contact) => contact.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((contact) => contact.id === selectedId) ?? filtered[0] ?? null;

  const openAdd = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-wf-border bg-wf-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl safe-top">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-display text-title font-bold tracking-tight">Contacts</h1>
            <p className="text-subhead text-wf-text-secondary">{contacts.length} people</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex h-10 items-center gap-2 rounded-full bg-wf-accent px-4 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95"
          >
            <Plus size={16} strokeWidth={2} />
            Add
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-wf-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            className="w-full rounded-xl border border-wf-border bg-wf-surface py-2.5 pl-10 pr-4 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              { id: "all", label: "All" },
              { id: "starred", label: "Starred" },
              { id: "household", label: "Household" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`inline-flex shrink-0 rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
                filter === chip.id
                  ? "bg-wf-accent text-white"
                  : "bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`min-h-0 overflow-y-auto ${
            isWide ? "w-[340px] shrink-0 border-r border-wf-border" : selected ? "hidden" : "flex-1"
          }`}
        >
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-subhead text-wf-text-tertiary">No contacts found</p>
          ) : (
            filtered.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                selected={selected?.id === contact.id}
                emailCount={countEmailsFromContact(contact, emails)}
                onSelect={() => setSelectedId(contact.id)}
                onToggleStar={() => onToggleStar(contact.id)}
              />
            ))
          )}
        </div>

        {(isWide || selected) && (
          <ContactDetail
            contact={selected}
            emails={emails}
            emailAccounts={emailAccounts}
            emailFolders={emailFolders}
            onBack={() => setSelectedId(null)}
            onEdit={() => selected && openEdit(selected)}
            onDelete={() => selected && onDeleteContact(selected.id)}
            onOpenEmail={onOpenEmail}
            onSaveNotes={(notes) => onSaveContact({ ...selected, notes: notes || undefined })}
            onToggleStar={() => selected && onToggleStar(selected.id)}
            showBack={!isWide}
          />
        )}
      </div>

      <ContactFormModal
        open={modalOpen}
        contact={editingContact}
        onSave={onSaveContact}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function ContactRow({
  contact,
  selected,
  emailCount,
  onSelect,
  onToggleStar,
}: {
  contact: Contact;
  selected: boolean;
  emailCount: number;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 border-b border-wf-border/50 px-4 py-3.5 ${
        selected ? "bg-wf-accent-soft" : "hover:bg-black/[0.02]"
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ContactAvatar name={contact.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-wf-text">{contact.name}</p>
          <p className="truncate text-caption text-wf-text-tertiary">
            {contact.jobTitle && contact.company
              ? `${contact.jobTitle} · ${contact.company}`
              : contact.email ?? contact.company ?? contact.phone ?? contact.mobilePhone ?? "No details"}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {emailCount > 0 && (
          <span className="rounded-full bg-wf-bg px-2 py-0.5 text-[11px] font-semibold text-wf-text-secondary">
            {emailCount}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleStar}
          className="flex h-8 w-8 items-center justify-center rounded-full text-wf-text-tertiary hover:bg-black/[0.04]"
          aria-label={contact.starred ? "Unstar contact" : "Star contact"}
        >
          <Star
            size={16}
            className={contact.starred ? "fill-wf-orange text-wf-orange" : undefined}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </div>
  );
}

function ContactDetail({
  contact,
  emails,
  emailAccounts,
  emailFolders,
  onBack,
  onEdit,
  onDelete,
  onOpenEmail,
  onSaveNotes,
  onToggleStar,
  showBack,
}: {
  contact: Contact | null;
  emails: EmailMessage[];
  emailAccounts: EmailAccount[];
  emailFolders: EmailFolder[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenEmail?: (email: EmailMessage) => void;
  onSaveNotes: (notes: string) => void;
  onToggleStar: () => void;
  showBack: boolean;
}) {
  if (!contact) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-subhead text-wf-text-tertiary">
        Select a contact
      </div>
    );
  }

  const editable = isEditableContact(contact);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-wf-bg">
      {showBack && (
        <div className="border-b border-wf-border px-4 py-3 safe-top">
          <button
            type="button"
            onClick={onBack}
            className="text-subhead font-semibold text-wf-accent"
          >
            ← All contacts
          </button>
        </div>
      )}

      <div className="px-4 py-6">
        <div className="mb-5 flex items-start gap-4">
          <ContactAvatar name={contact.name} large />
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-title font-bold tracking-tight text-wf-text">
                {contact.name}
              </h2>
              <button
                type="button"
                onClick={onToggleStar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.04]"
                aria-label={contact.starred ? "Unstar contact" : "Star contact"}
              >
                <Star
                  size={18}
                  className={contact.starred ? "fill-wf-orange text-wf-orange" : "text-wf-text-tertiary"}
                  strokeWidth={1.75}
                />
              </button>
            </div>
            {contact.company && (
              <p className="mt-0.5 text-subhead text-wf-text-secondary">
                {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {!contact.company && contact.jobTitle && (
              <p className="mt-0.5 text-subhead text-wf-text-secondary">{contact.jobTitle}</p>
            )}
            {contact.department && (
              <p className="text-caption text-wf-text-tertiary">{contact.department}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {contact.household && (
                <span className="rounded-full bg-wf-accent-soft px-2 py-0.5 text-[11px] font-semibold text-wf-accent">
                  Household
                </span>
              )}
              {contact.source === "microsoft" && (
                <span className="rounded-full bg-[#0078d4]/15 px-2 py-0.5 text-[11px] font-semibold text-[#0078d4]">
                  Outlook
                </span>
              )}
              {(contact.categories ?? []).map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-wf-bg px-2 py-0.5 text-[11px] font-semibold text-wf-text-secondary ring-1 ring-wf-border"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>

        <ContactFieldsCard contact={contact} />

        <ContactNotesSection
          contact={contact}
          editable={editable}
          onSaveNotes={onSaveNotes}
        />

        <ContactEmailsSection
          contact={contact}
          emails={emails}
          emailAccounts={emailAccounts}
          emailFolders={emailFolders}
          onOpenEmail={onOpenEmail}
        />

        {editable && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-wf-border py-2.5 text-body font-semibold text-wf-text-secondary"
            >
              <PenLine size={16} strokeWidth={1.75} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${contact.name}?`)) onDelete();
              }}
              className="rounded-xl border border-wf-red/30 px-4 py-2.5 text-body font-semibold text-wf-red"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactFieldsCard({ contact }: { contact: Contact }) {
  const hasContactMethods =
    contact.email ||
    contact.emailSecondary ||
    contact.phone ||
    contact.mobilePhone ||
    contact.homePhone ||
    contact.website;
  const hasOther = contact.address || contact.birthday;

  if (!hasContactMethods && !hasOther) return null;

  return (
    <div className="space-y-3 rounded-2xl bg-wf-surface p-4 shadow-[var(--shadow-card)]">
      {contact.email && (
        <DetailRow icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
      )}
      {contact.emailSecondary && (
        <DetailRow
          icon={Mail}
          label="Email (other)"
          value={contact.emailSecondary}
          href={`mailto:${contact.emailSecondary}`}
        />
      )}
      {contact.phone && (
        <DetailRow icon={Briefcase} label="Business phone" value={contact.phone} href={`tel:${contact.phone}`} />
      )}
      {contact.mobilePhone && (
        <DetailRow icon={Smartphone} label="Mobile" value={contact.mobilePhone} href={`tel:${contact.mobilePhone}`} />
      )}
      {contact.homePhone && (
        <DetailRow icon={Home} label="Home phone" value={contact.homePhone} href={`tel:${contact.homePhone}`} />
      )}
      {contact.website && (
        <DetailRow
          icon={Globe}
          label="Website"
          value={contact.website.replace(/^https?:\/\//, "")}
          href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
        />
      )}
      {contact.address && (
        <DetailRow icon={MapPin} label="Address" value={contact.address} multiline />
      )}
      {contact.birthday && (
        <DetailRow icon={Calendar} label="Birthday" value={formatContactBirthday(contact.birthday)} />
      )}
    </div>
  );
}

function ContactNotesSection({
  contact,
  editable,
  onSaveNotes,
}: {
  contact: Contact;
  editable: boolean;
  onSaveNotes: (notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(Boolean(contact.notes));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact.notes ?? "");

  useEffect(() => {
    setDraft(contact.notes ?? "");
    setEditing(false);
    if (contact.notes) setExpanded(true);
  }, [contact.id, contact.notes]);

  const preview = contact.notes?.split("\n")[0] ?? "No notes yet";

  const save = () => {
    onSaveNotes(draft.trim());
    setEditing(false);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <StickyNote size={16} className="shrink-0 text-wf-accent" strokeWidth={1.75} />
          <span className="min-w-0">
            <span className="block text-body font-semibold text-wf-text">Notes</span>
            {!expanded && (
              <span className="block truncate text-caption text-wf-text-tertiary">{preview}</span>
            )}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-wf-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {expanded && (
        <div className="border-t border-wf-border/50 px-4 py-3">
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={5}
                placeholder="Personal notes, account numbers, preferences…"
                className="w-full resize-none rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body leading-relaxed outline-none focus:border-wf-accent"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(contact.notes ?? "");
                    setEditing(false);
                  }}
                  className="flex-1 rounded-xl border border-wf-border py-2 text-caption font-semibold text-wf-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="flex-1 rounded-xl bg-wf-accent py-2 text-caption font-semibold text-white"
                >
                  Save notes
                </button>
              </div>
            </>
          ) : (
            <>
              {contact.notes ? (
                <p className="whitespace-pre-wrap text-body leading-relaxed text-wf-text">{contact.notes}</p>
              ) : (
                <p className="text-body text-wf-text-tertiary">No notes for this contact.</p>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-3 flex items-center gap-1.5 text-caption font-semibold text-wf-accent"
                >
                  <PenLine size={14} strokeWidth={1.75} />
                  {contact.notes ? "Edit notes" : "Add notes"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatContactBirthday(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function ContactEmailsSection({
  contact,
  emails,
  emailAccounts,
  emailFolders,
  onOpenEmail,
}: {
  contact: Contact;
  emails: EmailMessage[];
  emailAccounts: EmailAccount[];
  emailFolders: EmailFolder[];
  onOpenEmail?: (email: EmailMessage) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [openEmails, setOpenEmails] = useState<Record<string, boolean>>({});

  const contactEmails = useMemo(
    () => emailsForContact(contact, emails),
    [contact, emails],
  );
  const folderGroups = useMemo(
    () => groupContactEmailsByFolder(contact, emails, emailFolders, emailAccounts),
    [contact, emails, emailFolders, emailAccounts],
  );

  useEffect(() => {
    setOpenFolders(Object.fromEntries(folderGroups.map((group) => [group.folderId, true])));
    setOpenEmails({});
  }, [contact.id, folderGroups]);

  if (contactEmails.length === 0) return null;

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const toggleEmail = (emailId: string) => {
    setOpenEmails((prev) => ({ ...prev, [emailId]: !prev[emailId] }));
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-body font-semibold text-wf-text">
          <Mail size={16} className="text-wf-accent" strokeWidth={1.75} />
          Emails ({contactEmails.length})
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-wf-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {expanded && (
        <div className="border-t border-wf-border/50 pb-2">
          {folderGroups.map((group) => {
            const folderOpen = openFolders[group.folderId] ?? true;
            return (
              <div key={group.folderId} className="border-b border-wf-border/40 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleFolder(group.folderId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-black/[0.02]"
                  aria-expanded={folderOpen}
                >
                  <div className="min-w-0">
                    <p className="truncate text-subhead font-semibold text-wf-text">
                      {group.accountLabel} · {group.folderLabel}
                    </p>
                    <p className="text-caption text-wf-text-tertiary">
                      {group.emails.length} message{group.emails.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-wf-text-tertiary transition-transform ${folderOpen ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </button>

                {folderOpen && (
                  <div className="pb-1">
                    {group.emails.map((email) => (
                      <ContactEmailRow
                        key={email.id}
                        email={email}
                        open={Boolean(openEmails[email.id])}
                        onToggle={() => toggleEmail(email.id)}
                        onOpenInInbox={onOpenEmail ? () => onOpenEmail(email) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactEmailRow({
  email,
  open,
  onToggle,
  onOpenInInbox,
}: {
  email: EmailMessage;
  open: boolean;
  onToggle: () => void;
  onOpenInInbox?: () => void;
}) {
  return (
    <div className="border-t border-wf-border/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-body ${email.unread ? "font-semibold text-wf-text" : "font-medium text-wf-text-secondary"}`}
          >
            {email.subject}
          </p>
          {!open && (
            <p className="truncate text-caption text-wf-text-tertiary">{email.preview}</p>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
          <span className="text-caption tabular-nums text-wf-text-tertiary">
            {formatContactEmailDate(email.date)}
          </span>
          <ChevronDown
            size={16}
            className={`text-wf-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-wf-border/20 bg-wf-bg/60 px-4 py-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body font-semibold text-wf-text">{email.from}</p>
              <p className="truncate text-caption text-wf-text-tertiary">{email.fromEmail}</p>
            </div>
            {email.unread && (
              <span className="rounded-full bg-wf-accent-soft px-2 py-0.5 text-[11px] font-semibold text-wf-accent">
                Unread
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-body leading-relaxed text-wf-text">{email.body}</p>
          {onOpenInInbox && (
            <button
              type="button"
              onClick={onOpenInInbox}
              className="mt-3 text-caption font-semibold text-wf-accent"
            >
              Open in Email tab
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatContactEmailDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  multiline = false,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
  multiline?: boolean;
}) {
  const content = (
    <>
      <Icon size={16} className="mt-0.5 shrink-0 text-wf-text-tertiary" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-caption font-semibold text-wf-text-tertiary">{label}</p>
        <p className={`text-body text-wf-text ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className="flex gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-black/[0.02]">
        {content}
      </a>
    );
  }

  return <div className="flex gap-3 px-1 py-1">{content}</div>;
}

function ContactAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const size = large ? "h-16 w-16 text-title" : "h-11 w-11 text-subhead";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-wf-accent-soft font-semibold text-wf-accent ${size}`}
    >
      {initials || <User size={large ? 24 : 18} strokeWidth={1.75} />}
    </span>
  );
}
