import {
  boolean,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  displayName: text("display_name").notNull(),
  permissionsJson: jsonb("permissions_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    fromType: text("from_type").notNull(),
    fromId: text("from_id").notNull(),
    toType: text("to_type").notNull(),
    toId: text("to_id").notNull(),
    kind: text("kind").notNull(),
    folderUrl: text("folder_url"),
    folderProvider: text("folder_provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("links_edge_unique").on(
      table.householdId,
      table.fromType,
      table.fromId,
      table.toType,
      table.toId,
      table.kind,
    ),
  ],
);

export const itemShares = pgTable(
  "item_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    sharedToBoard: boolean("shared_to_board").notNull().default(false),
    boardDisplay: text("board_display").notNull().default("title_only"),
    sharedBy: text("shared_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("item_shares_item_unique").on(
      table.householdId,
      table.itemType,
      table.itemId,
    ),
  ],
);

export const boardPins = pgTable("board_pins", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  itemType: text("item_type"),
  itemId: text("item_id"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  rotation: real("rotation").notNull().default(0),
  pinStyle: text("pin_style"),
  contentJson: jsonb("content_json"),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: text("item_id").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  filename: text("filename").notNull(),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Fixed demo household for prototype phases before real auth. */
export const DEMO_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";
