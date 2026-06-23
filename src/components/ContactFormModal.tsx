import { useEffect, useState } from "react";
import type { Contact } from "../types";
import { generateId } from "../dateUtils";

interface ContactFormModalProps {
  open: boolean;
  contact: Contact | null;
  onSave: (contact: Contact) => void;
  onClose: () => void;
}

export function ContactFormModal({ open, contact, onSave, onClose }: ContactFormModalProps) {
  const [form, setForm] = useState<Contact>(() => emptyContact());

  useEffect(() => {
    if (open) {
      setForm(contact ? { ...contact } : emptyContact());
    }
  }, [open, contact]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave(normalizeContactForm(form));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-wf-surface shadow-[var(--shadow-modal)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-form-title"
      >
        <div className="border-b border-wf-border px-5 py-4">
          <h2 id="contact-form-title" className="font-display text-title font-bold text-wf-text">
            {contact ? "Edit contact" : "Add contact"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <Section title="Name">
              <Field label="Display name" required>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className={inputClass}
                  autoFocus
                />
              </Field>
            </Section>

            <Section title="Work">
              <Field label="Company">
                <input
                  value={form.company ?? ""}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Job title">
                <input
                  value={form.jobTitle ?? ""}
                  onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Department">
                <input
                  value={form.department ?? ""}
                  onChange={(event) => setForm({ ...form, department: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </Section>

            <Section title="Email & phone">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Email (other)">
                <input
                  type="email"
                  value={form.emailSecondary ?? ""}
                  onChange={(event) => setForm({ ...form, emailSecondary: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Business phone">
                <input
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Mobile">
                <input
                  type="tel"
                  value={form.mobilePhone ?? ""}
                  onChange={(event) => setForm({ ...form, mobilePhone: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Home phone">
                <input
                  type="tel"
                  value={form.homePhone ?? ""}
                  onChange={(event) => setForm({ ...form, homePhone: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </Section>

            <Section title="Other">
              <Field label="Website">
                <input
                  type="url"
                  value={form.website ?? ""}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field label="Address">
                <textarea
                  value={form.address ?? ""}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Birthday">
                <input
                  type="date"
                  value={form.birthday ?? ""}
                  onChange={(event) => setForm({ ...form, birthday: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Categories">
                <input
                  value={(form.categories ?? []).join(", ")}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      categories: event.target.value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Work, Family, VIP"
                  className={inputClass}
                />
              </Field>
            </Section>

            <Section title="Notes">
              <Field label="Personal notes">
                <textarea
                  value={form.notes ?? ""}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={4}
                  placeholder="Anything you'd keep in Outlook notes…"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </Section>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(form.starred)}
                onChange={(event) => setForm({ ...form, starred: event.target.checked })}
                className="h-4 w-4 rounded accent-wf-accent"
              />
              <span className="text-body text-wf-text">Starred</span>
            </label>
          </div>

          <div className="flex gap-2 border-t border-wf-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-wf-border py-2.5 text-body font-semibold text-wf-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-wf-accent py-2.5 text-body font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-subhead font-semibold text-wf-text-secondary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-semibold text-wf-text-tertiary">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent";

function normalizeContactForm(form: Contact): Contact {
  return {
    ...form,
    name: form.name.trim(),
    jobTitle: form.jobTitle?.trim() || undefined,
    company: form.company?.trim() || undefined,
    department: form.department?.trim() || undefined,
    email: form.email?.trim() || undefined,
    emailSecondary: form.emailSecondary?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    mobilePhone: form.mobilePhone?.trim() || undefined,
    homePhone: form.homePhone?.trim() || undefined,
    website: form.website?.trim() || undefined,
    address: form.address?.trim() || undefined,
    birthday: form.birthday?.trim() || undefined,
    notes: form.notes?.trim() || undefined,
    categories: form.categories?.length ? form.categories : undefined,
    source: form.source ?? "local",
  };
}

function emptyContact(): Contact {
  return {
    id: generateId(),
    name: "",
    source: "local",
    starred: false,
  };
}
