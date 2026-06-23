import type { Contact, EmailAccount, EmailFolder, EmailMessage } from "../types";

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: "contact-sarah",
    name: "Sarah Chen",
    email: "sarah.chen@gmail.com",
    mobilePhone: "+44 7700 900456",
    company: "Personal",
    categories: ["Friends", "Personal"],
    notes: "Met at The Willow — prefers lunch bookings by text.\nAllergic to shellfish.",
    starred: true,
    source: "mock",
  },
  {
    id: "contact-james",
    name: "James Mitchell",
    jobTitle: "Project Director",
    email: "projects@acme.com",
    emailSecondary: "j.mitchell@acme.com",
    company: "Acme Corp",
    department: "Delivery",
    phone: "+44 7700 900123",
    website: "https://acme.com",
    address: "Acme House\n12 Industrial Way\nLeeds LS1 4AB",
    categories: ["Work", "Clients"],
    notes: "Primary contact for Q2 deliverables.\nPrefers Teams calls before 5pm.",
    source: "mock",
  },
  {
    id: "contact-steel",
    name: "Steel Supplies Ltd",
    email: "orders@steelsupplies.co.uk",
    company: "Steel Supplies Ltd",
    phone: "+44 121 555 0100",
    address: "Unit 4\nForge Lane\nBirmingham B1 2ST",
    notes: "Account #SS-44821. Ask for dispatch when chasing orders.",
    source: "mock",
  },
  {
    id: "contact-oakwood",
    name: "Oakwood Primary",
    email: "office@oakwoodprimary.sch.uk",
    phone: "+44 113 555 0199",
    company: "Oakwood Primary School",
    address: "Oakwood Primary School\nField Lane\nLeeds LS8 1AA",
    categories: ["Family", "School"],
    notes: "Office hours 8:30–4pm. Sports day info usually sent 1 week ahead.",
    household: true,
    source: "mock",
  },
  {
    id: "contact-hmrc",
    name: "HMRC",
    email: "noreply@hmrc.gov.uk",
    company: "HM Revenue & Customs",
    website: "https://www.gov.uk/hmrc",
    notes: "VAT agent login saved in password manager.\nQuarterly deadlines — check calendar.",
    source: "mock",
  },
  {
    id: "contact-design",
    name: "Design Studio",
    jobTitle: "Account team",
    email: "hello@designstudio.io",
    company: "Design Studio",
    phone: "+44 20 7946 0958",
    website: "https://designstudio.io",
    categories: ["Work", "Suppliers"],
    notes: "Brand guidelines v2 shared June 2026.\nContact: Maya for urgent amends.",
    starred: true,
    source: "mock",
  },
];

const STORAGE_KEY = "weekflow-contacts";

export function loadStoredContacts(): Contact[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredContacts(contacts: Contact[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function countEmailsFromContact(
  contact: Contact,
  emails: { fromEmail: string; from: string }[],
): number {
  return emailsForContact(contact, emails as EmailMessage[]).length;
}

export function emailsForContact(contact: Contact, emails: EmailMessage[]): EmailMessage[] {
  const nameNeedle = contact.name.toLowerCase();
  if (!contact.email) {
    return emails.filter((email) => email.from.toLowerCase() === nameNeedle);
  }
  const emailNeedle = contact.email.toLowerCase();
  return emails.filter(
    (email) =>
      email.fromEmail.toLowerCase() === emailNeedle ||
      email.from.toLowerCase() === nameNeedle,
  );
}

export interface ContactEmailFolderGroup {
  folderId: string;
  folderLabel: string;
  accountLabel: string;
  emails: EmailMessage[];
}

export function groupContactEmailsByFolder(
  contact: Contact,
  emails: EmailMessage[],
  folders: EmailFolder[],
  accounts: EmailAccount[],
): ContactEmailFolderGroup[] {
  const contactEmails = emailsForContact(contact, emails);
  const byFolder = new Map<string, EmailMessage[]>();

  for (const email of contactEmails) {
    const list = byFolder.get(email.folderId) ?? [];
    list.push(email);
    byFolder.set(email.folderId, list);
  }

  const groups: ContactEmailFolderGroup[] = [];

  for (const [folderId, folderEmails] of byFolder.entries()) {
    const folder = folders.find((entry) => entry.id === folderId);
    const accountId = folder?.accountId ?? folderEmails[0]?.accountId;
    const account = accounts.find((entry) => entry.id === accountId);
    const sorted = [...folderEmails].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    groups.push({
      folderId,
      folderLabel: folder?.label ?? "Inbox",
      accountLabel: account?.label ?? "Email",
      emails: sorted,
    });
  }

  return groups.sort(
    (a, b) =>
      new Date(b.emails[0]?.date ?? 0).getTime() - new Date(a.emails[0]?.date ?? 0).getTime(),
  );
}

export function mergeGraphContacts(localContacts: Contact[], graphContacts: Contact[]): Contact[] {
  const graphEmails = new Set(
    graphContacts.map((contact) => contact.email?.toLowerCase()).filter(Boolean) as string[],
  );
  const locals = localContacts.filter((contact) => {
    if (contact.source === "microsoft") return false;
    if (contact.email && graphEmails.has(contact.email.toLowerCase())) return false;
    return true;
  });
  return [...graphContacts, ...locals];
}

export function isEditableContact(contact: Contact): boolean {
  return contact.source !== "microsoft" && contact.source !== "household";
}
