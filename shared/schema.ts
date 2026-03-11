import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const roles = ['ADMIN', 'CANDIDATE'] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ['ADMIN', 'CANDIDATE'] }).notNull().default('CANDIDATE'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidateProfiles = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fullName: text("full_name").notNull(),
  age: integer("age"),
  state: text("state").notNull(),
  phone: text("phone"),
  address: text("address"),
  education: text("education"),
  achievements: text("achievements"),
  bio: text("bio"),
  profilePhoto: text("profile_photo"),
  resume: text("resume"),
  certificates: json("certificates").$type<string[]>(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline").notNull(),
  status: text("status", { enum: ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] }).notNull().default('PENDING'),
  requiredFormats: json("required_formats").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignedTasks = pgTable("assigned_tasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: integer("user_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  candidateId: integer("candidate_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationArea: text("location_area"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationPincode: text("location_pincode"),
  locationAddress: text("location_address"),
  approvalStatus: text("approval_status", { enum: ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'MISSED'] }).notNull().default('SUBMITTED'),
  adminComment: text("admin_comment"),
});

export const submissionFiles = pgTable("submission_files", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  format: text("format").notNull(), // e.g., 'Video', 'PDF', 'Word', 'Excel', 'Text'
  fileName: text("file_name"), // original file name from uploader
  fileUrl: text("file_url").notNull(),
  fileHash: text("file_hash").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  approvalStatus: text("approval_status", { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).notNull().default('PENDING'),
  adminComment: text("admin_comment"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationArea: text("location_area"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationPincode: text("location_pincode"),
  locationAddress: text("location_address"),
  date: timestamp("date").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(candidateProfiles, {
    fields: [users.id],
    references: [candidateProfiles.userId],
  }),
  assignedTasks: many(assignedTasks),
  submissions: many(submissions),
  attendance: many(attendance),
  notifications: many(notifications),
}));

export const tasksRelations = relations(tasks, ({ many }) => ({
  assignedTo: many(assignedTasks),
  submissions: many(submissions),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, status: true });
export const insertSubmissionSchema = createInsertSchema(submissions).omit({ id: true, timestamp: true, approvalStatus: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, timestamp: true, date: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
