import type { Contact } from "../types";

export function mergeGraphContacts(localContacts: Contact[], graphContacts: Contact[]): Contact[] {
  const graphExternalIds = new Set(
    graphContacts.map((contact) => contact.externalId).filter(Boolean) as string[],
  );

  const locals = localContacts.filter((contact) => {
    if (contact.source === "microsoft") {
      return contact.externalId ? !graphExternalIds.has(contact.externalId) : false;
    }
    if (contact.externalId) return !graphExternalIds.has(contact.externalId);
    return contact.source !== "mock";
  });

  const dedupedGraph = graphContacts.filter(
    (contact, index, list) =>
      list.findIndex((entry) => entry.externalId === contact.externalId) === index,
  );

  return [...dedupedGraph, ...locals].sort((a, b) => a.name.localeCompare(b.name));
}
