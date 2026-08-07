import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  day: integer("day").notNull(),
  prompt: text("prompt").notNull(),
  cardId: text("card_id").notNull(),
  cardName: text("card_name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("journal_user_day_idx").on(table.userEmail, table.day),
]);

export const pendulumEntries = sqliteTable("pendulum_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  question: text("question").notNull(),
  result: text("result").notNull(),
  resultLabel: text("result_label").notNull(),
  category: text("category").notNull().default("內在指引"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
