import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  room: text("room"),
  isOnline: boolean("is_online").default(false),
  syllabusUrl: text("syllabus_url"),
});

export const weekPatterns = pgTable("week_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
});

export const patternSlots = pgTable("pattern_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  patternId: uuid("pattern_id")
    .notNull()
    .references(() => weekPatterns.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  period: integer("period").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  note: text("note"),
});

export const weeks = pgTable("weeks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  startDate: date("start_date").notNull(),
  label: text("label"),
  patternId: uuid("pattern_id").references(() => weekPatterns.id, {
    onDelete: "set null",
  }),
  isHoliday: boolean("is_holiday").default(false),
  holidayLabel: text("holiday_label"),
});

export const slotOverrides = pgTable("slot_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: uuid("week_id")
    .notNull()
    .references(() => weeks.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  period: integer("period").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  note: text("note"),
  isCancelled: boolean("is_cancelled").default(false),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  isDone: boolean("is_done").default(false),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendances = pgTable("attendances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekId: uuid("week_id")
    .notNull()
    .references(() => weeks.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  period: integer("period").notNull(),
  status: text("status").default("present"),
  note: text("note"),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").unique().notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type WeekPattern = typeof weekPatterns.$inferSelect;
export type PatternSlot = typeof patternSlots.$inferSelect;
export type Week = typeof weeks.$inferSelect;
export type SlotOverride = typeof slotOverrides.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
