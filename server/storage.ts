import { users, candidateProfiles, tasks, assignedTasks, submissions, submissionFiles as submissionFilesTable, attendance, notifications } from "@shared/schema";
import type { User, InsertUser, CandidateProfile, InsertCandidateProfile, Task, InsertTask, Submission, InsertSubmission, Attendance, InsertAttendance, Notification } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, gte, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllCandidates(): Promise<any[]>;
  
  getProfileByUserId(userId: number): Promise<CandidateProfile | undefined>;
  createProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  updateProfile(userId: number, profile: Partial<InsertCandidateProfile>): Promise<CandidateProfile | undefined>;
  
  createTask(task: InsertTask): Promise<Task>;
  assignTask(taskId: number, userId: number): Promise<void>;
  getAllTasks(): Promise<Task[]>;
  getTasksByCandidate(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: any): Promise<void>;
  
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByTask(taskId: number): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  updateSubmissionStatus(id: number, status: any, comment?: string): Promise<Submission>;
  deleteSubmission(id: number): Promise<void>;
  deleteSubmissionsByTask(taskId: number): Promise<void>;
  deleteCandidate(userId: number): Promise<void>;
  deleteTask(taskId: number): Promise<void>;
  
  markAttendance(record: InsertAttendance): Promise<Attendance>;
  getAttendanceLogs(): Promise<Attendance[]>;
  getAttendanceLogsByCandidate(userId: number): Promise<Attendance[]>;
  
  createNotification(userId: number, message: string): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  getTodayActivity(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getAllCandidates(): Promise<any[]> {
    const candidates = await db.select({
      user: users,
      profile: candidateProfiles,
    })
    .from(users)
    .leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId))
    .where(eq(users.role, 'CANDIDATE'));
    
    return candidates.map(c => ({ ...c.user, profile: c.profile }));
  }

  async getProfileByUserId(userId: number): Promise<CandidateProfile | undefined> {
    const [profile] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId));
    return profile;
  }

  async createProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    const [created] = await db.insert(candidateProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(userId: number, profileUpdates: Partial<InsertCandidateProfile>): Promise<CandidateProfile | undefined> {
    const [updated] = await db.update(candidateProfiles)
      .set(profileUpdates)
      .where(eq(candidateProfiles.userId, userId))
      .returning();
    return updated;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async assignTask(taskId: number, userId: number): Promise<void> {
    await db.insert(assignedTasks).values({ taskId, userId });
    await this.createNotification(userId, `New task assigned`);
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByCandidate(userId: number): Promise<any[]> {
    const assigned = await db.select({ task: tasks })
      .from(assignedTasks)
      .innerJoin(tasks, eq(assignedTasks.taskId, tasks.id))
      .where(eq(assignedTasks.userId, userId));
    
    const submissionsList = await db.select().from(submissions).where(eq(submissions.candidateId, userId));
    
    return await Promise.all(assigned.map(async (a) => {
      const taskSubmissions = submissionsList.filter(s => s.taskId === a.task.id);
      const latestSubmission = taskSubmissions.sort((a, b) => 
        (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      )[0];
      
      let files: any[] = [];
      if (latestSubmission) {
        files = await db.select().from(submissionFilesTable).where(eq(submissionFilesTable.submissionId, latestSubmission.id));
      }

      return { 
        ...a.task, 
        status: latestSubmission ? latestSubmission.approvalStatus : 'PENDING',
        adminComment: latestSubmission?.adminComment || null,
        submissionId: latestSubmission?.id || null,
        submissionFiles: files,
      };
    }));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async updateTaskStatus(id: number, status: any): Promise<void> {
    await db.update(tasks).set({ status }).where(eq(tasks.id, id));
  }

  async updateTask(id: number, updates: any): Promise<any> {
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.deadline) updateData.deadline = new Date(updates.deadline);
    if (updates.requiredFormats) updateData.requiredFormats = updates.requiredFormats;
    
    const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    
    // Handle candidate reassignment if candidateIds provided
    if (updates.candidateIds) {
      await db.delete(assignedTasks).where(eq(assignedTasks.taskId, id));
      for (const candidateId of updates.candidateIds) {
        await this.assignTask(id, candidateId);
      }
    }
    
    return updated;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [created] = await db.insert(submissions).values(submission).returning();
    return created;
  }

  async addSubmissionFile(submissionId: number, format: string, fileUrl: string, fileHash: string, fileType: string, fileName?: string): Promise<number> {
    const [row] = await db.insert(submissionFilesTable).values({ submissionId, format, fileUrl, fileHash, fileType, fileName: fileName ?? null }).returning({ id: submissionFilesTable.id });
    return row.id;
  }

  async updateSubmissionFileStatus(fileId: number, status: any, comment?: string): Promise<void> {
    await db.update(submissionFilesTable).set({ approvalStatus: status, adminComment: comment }).where(eq(submissionFilesTable.id, fileId));
  }

  async getSubmissionsByTask(taskId: number): Promise<any[]> {
    const subs = await db.select().from(submissions).where(eq(submissions.taskId, taskId));
    const result = await Promise.all(subs.map(async (sub) => {
      const files = await db.select().from(submissionFilesTable).where(eq(submissionFilesTable.submissionId, sub.id));
      return { ...sub, files };
    }));
    return result;
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async updateSubmissionStatus(id: number, status: any, comment?: string): Promise<Submission> {
    const [updated] = await db.update(submissions)
      .set({ approvalStatus: status, adminComment: comment })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async deleteSubmission(id: number): Promise<void> {
    await db.delete(submissionFilesTable).where(eq(submissionFilesTable.submissionId, id));
    await db.delete(submissions).where(eq(submissions.id, id));
  }

  async deleteSubmissionsByTask(taskId: number): Promise<void> {
    const subs = await db.select().from(submissions).where(eq(submissions.taskId, taskId));
    for (const sub of subs) {
      await db.delete(submissionFilesTable).where(eq(submissionFilesTable.submissionId, sub.id));
    }
    await db.delete(submissions).where(eq(submissions.taskId, taskId));
  }

  async deleteCandidate(userId: number): Promise<void> {
    await db.delete(assignedTasks).where(eq(assignedTasks.userId, userId));
    await this.deleteSubmissionsByTask(userId);
    await db.delete(attendance).where(eq(attendance.candidateId, userId));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(candidateProfiles).where(eq(candidateProfiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.deleteSubmissionsByTask(taskId);
    await db.delete(assignedTasks).where(eq(assignedTasks.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
  }

  async markAttendance(record: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(record).returning();
    return created;
  }

  async getAttendanceLogs(): Promise<Attendance[]> {
    return await db.select().from(attendance).orderBy(desc(attendance.timestamp));
  }

  async getAttendanceLogsByCandidate(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.candidateId, userId)).orderBy(desc(attendance.timestamp));
  }

  async createNotification(userId: number, message: string): Promise<Notification> {
    const [created] = await db.insert(notifications).values({ userId, message }).returning();
    return created;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async getTodayActivity(): Promise<any[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select({
        assignmentId: assignedTasks.id,
        assignedAt: assignedTasks.assignedAt,
        task: tasks,
        user: users,
        profile: candidateProfiles,
      })
      .from(assignedTasks)
      .innerJoin(tasks, eq(assignedTasks.taskId, tasks.id))
      .innerJoin(users, eq(assignedTasks.userId, users.id))
      .leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId))
      .where(
        and(
          gte(assignedTasks.assignedAt, todayStart),
          lt(assignedTasks.assignedAt, todayEnd)
        )
      )
      .orderBy(desc(assignedTasks.assignedAt));

    const result = await Promise.all(rows.map(async (row) => {
      const [submission] = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.taskId, row.task.id), eq(submissions.candidateId, row.user.id)));

      let status: string;
      if (submission) {
        status = submission.approvalStatus;
      } else if (new Date() > new Date(row.task.deadline)) {
        status = 'MISSED';
      } else {
        status = 'PENDING';
      }

      return {
        assignmentId: row.assignmentId,
        assignedAt: row.assignedAt,
        taskId: row.task.id,
        taskTitle: row.task.title,
        taskDeadline: row.task.deadline,
        candidateId: row.user.id,
        candidateName: row.profile?.fullName || row.user.email,
        status,
        submissionId: submission?.id || null,
      };
    }));

    return result;
  }
}

export const storage = new DatabaseStorage();