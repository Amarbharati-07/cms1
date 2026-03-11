import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback_secret';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Use explicit disk storage to avoid temp-file rename overhead
const storage_disk = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique);
  },
});
const upload = multer({ storage: storage_disk });

// Compute file hash asynchronously in background (streaming, no memory buffer)
function computeHashBackground(filePath: string, fileId: number) {
  setImmediate(async () => {
    try {
      const hashSum = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => hashSum.update(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      const hex = hashSum.digest('hex');
      await db.update(schema.submissionFiles).set({ fileHash: hex }).where(eq(schema.submissionFiles.id, fileId));
    } catch (err) {
      console.error('Background hash error for file', fileId, err);
    }
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(cookieParser());

  // --- Auth Middleware ---
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };

  const requireCandidate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'CANDIDATE') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };

  // --- SECURE FILE SERVING ---
  app.get('/api/files/:filename', authenticate, async (req, res) => {
    try {
      const { filename } = req.params;
      // Prevent path traversal
      const safeName = path.basename(filename);
      const filePath = path.join(UPLOADS_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      const fileUrl = `/uploads/${safeName}`;

      // Check if this is a submission file
      const [fileRecord] = await db
        .select({ submissionId: schema.submissionFiles.submissionId })
        .from(schema.submissionFiles)
        .where(eq(schema.submissionFiles.fileUrl, fileUrl));

      if (fileRecord) {
        // Submission file: only the uploading candidate or admin can access
        const [submission] = await db
          .select({ candidateId: schema.submissions.candidateId })
          .from(schema.submissions)
          .where(eq(schema.submissions.id, fileRecord.submissionId));

        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        if (req.user.role !== 'ADMIN' && req.user.id !== submission.candidateId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } else {
        // Attendance / profile file: the owner or admin
        const [attendanceRecord] = await db
          .select({ candidateId: schema.attendance.candidateId })
          .from(schema.attendance)
          .where(eq(schema.attendance.photoUrl, fileUrl));

        if (attendanceRecord) {
          if (req.user.role !== 'ADMIN' && req.user.id !== attendanceRecord.candidateId) {
            return res.status(403).json({ message: 'Forbidden' });
          }
        } else {
          // Profile file — allow any authenticated user to see profile photos/resumes
          // (needed for admin to view candidate profiles)
        }
      }

      res.sendFile(filePath);
    } catch (err) {
      console.error('File serve error:', err);
      res.status(500).json({ message: 'Failed to serve file' });
    }
  });

  // --- AUTH ROUTES ---
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  });

  app.get(api.auth.me.path, authenticate, async (req, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    res.json({ id: user.id, email: user.email, role: user.role });
  });

  // --- ADMIN ROUTES ---
  app.post(api.admin.candidates.create.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.candidates.create.input.parse(req.body);
      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      const user = await storage.createUser({
        email: input.email,
        password: hashedPassword,
        role: 'CANDIDATE'
      });

      const profile = await storage.createProfile({
        ...input.profile,
        userId: user.id
      });

      res.status(201).json({ user, profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Failed to create candidate' });
      }
    }
  });

  app.get(api.admin.candidates.list.path, authenticate, requireAdmin, async (req, res) => {
    const candidates = await storage.getAllCandidates();
    res.json(candidates);
  });

  app.get(api.admin.candidates.get.path, authenticate, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user || user.role !== 'CANDIDATE') return res.status(404).json({ message: 'Candidate not found' });
    
    const profile = await storage.getProfileByUserId(id);
    const tasks = await storage.getTasksByCandidate(id);
    const attendance = await storage.getAttendanceLogsByCandidate(id);
    
    res.json({ user, profile, tasks, attendance });
  });

  app.put(api.admin.candidates.update.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = api.admin.candidates.update.input.parse(req.body);
      const updated = await storage.updateProfile(id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.post(api.admin.tasks.create.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.tasks.create.input.parse(req.body);
      
      const task = await storage.createTask({
        title: input.title,
        description: input.description,
        deadline: new Date(input.deadline),
        requiredFormats: input.requiredFormats || []
      });

      for (const candidateId of input.candidateIds) {
        await storage.assignTask(task.id, candidateId);
      }

      res.status(201).json(task);
    } catch (error: any) {
      console.error('Task creation error:', error.message, error.errors || '');
      res.status(400).json({ message: 'Invalid input', error: error.message });
    }
  });

  app.get('/api/admin/today-activity', authenticate, requireAdmin, async (req, res) => {
    const activity = await storage.getTodayActivity();
    res.json(activity);
  });

  app.get(api.admin.tasks.list.path, authenticate, requireAdmin, async (req, res) => {
    const tasks = await storage.getAllTasks();
    // Fetch submissions with files and candidate info for each task
    const tasksWithSubmissions = await Promise.all(tasks.map(async (t) => {
      const submissions = await storage.getSubmissionsByTask(t.id);
      // Enrich submissions with candidate profile info
      const enrichedSubmissions = await Promise.all(submissions.map(async (sub) => {
        const candidateProfile = await storage.getProfileByUserId(sub.candidateId);
        return { ...sub, candidateProfile };
      }));
      return { ...t, submissions: enrichedSubmissions };
    }));
    res.json(tasksWithSubmissions);
  });

  app.put(api.admin.tasks.edit.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
      
      const updates = req.body;
      const updated = await storage.updateTask(id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error('Task edit error:', error);
      res.status(400).json({ message: 'Failed to update task', error: error.message });
    }
  });

  app.put(api.admin.tasks.review.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id); // submission id
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid submission ID' });
      }

      const { approvalStatus, adminComment } = api.admin.tasks.review.input.parse(req.body);
      
      const updated = await storage.updateSubmissionStatus(id, approvalStatus, adminComment);
      if (!updated) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      // Update task status - if any submission is approved, mark task as approved
      // If rejected, only mark task as rejected if it's the latest state the admin wants
      await storage.updateTaskStatus(updated.taskId, approvalStatus);
      
      // Notify candidate
      try {
        await storage.createNotification(updated.candidateId, `Your task submission has been ${approvalStatus.toLowerCase()}${adminComment ? ': ' + adminComment : ''}`);
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Review error:', error);
      res.status(400).json({ message: 'Invalid input', error: error.message });
    }
  });

  app.put(api.admin.tasks.reviewFile.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const { approvalStatus, adminComment } = api.admin.tasks.reviewFile.input.parse(req.body);
      
      await storage.updateSubmissionFileStatus(fileId, approvalStatus, adminComment);
      res.json({ success: true });
    } catch (error: any) {
      console.error('File review error:', error);
      res.status(400).json({ message: 'Invalid input', error: error.message });
    }
  });

  app.delete(api.admin.candidates.delete.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid candidate ID' });
      }

      await storage.deleteCandidate(id);
      res.json({ message: 'Candidate deleted successfully' });
    } catch (error: any) {
      console.error('Delete candidate error:', error);
      res.status(400).json({ message: 'Failed to delete candidate', error: error.message });
    }
  });

  app.delete(api.admin.tasks.delete.path, authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }

      await storage.deleteTask(id);
      res.json({ message: 'Task deleted successfully' });
    } catch (error: any) {
      console.error('Delete task error:', error);
      res.status(400).json({ message: 'Failed to delete task', error: error.message });
    }
  });

  app.get(api.admin.attendance.list.path, authenticate, requireAdmin, async (req, res) => {
    const logs = await storage.getAttendanceLogs();
    const enriched = await Promise.all(logs.map(async (log) => {
      const profile = await storage.getProfileByUserId(log.candidateId);
      return { ...log, candidateProfile: profile };
    }));
    res.json(enriched);
  });

  // --- CANDIDATE ROUTES ---
  app.get(api.candidate.profile.get.path, authenticate, requireCandidate, async (req, res) => {
    const profile = await storage.getProfileByUserId(req.user.id);
    res.json(profile || {});
  });

  app.put(api.candidate.profile.update.path, authenticate, requireCandidate, async (req, res) => {
    try {
      const updates = api.candidate.profile.update.input.parse(req.body);
      const updated = await storage.updateProfile(req.user.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.post(api.candidate.profile.upload.path, authenticate, requireCandidate, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.get(api.candidate.tasks.list.path, authenticate, requireCandidate, async (req, res) => {
    const candidateTasks = await storage.getTasksByCandidate(req.user.id);
    res.json(candidateTasks);
  });

  app.post(api.candidate.tasks.submit.path, authenticate, requireCandidate, upload.array('files'), async (req, res) => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        console.error('Submission error: No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        console.error('Submission error: Invalid task ID', req.params.id);
        return res.status(400).json({ message: 'Invalid task ID' });
      }

      // Check deadline
      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (new Date() > new Date(task.deadline)) {
        return res.status(403).json({ message: 'You missed this task submission deadline.' });
      }

      const { latitude, longitude, locationArea, locationCity, locationState, locationPincode, locationAddress, formats } = req.body;
      const fileFormats = formats ? JSON.parse(formats) : [];

      console.log(`Processing submission for task ${taskId} by user ${req.user.id}`);

      const submission = await storage.createSubmission({
        taskId,
        candidateId: req.user.id,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationArea: locationArea || null,
        locationCity: locationCity || null,
        locationState: locationState || null,
        locationPincode: locationPincode || null,
        locationAddress: locationAddress || null,
        approvalStatus: 'SUBMITTED'
      } as any);

      // Record uploaded files immediately — no sync I/O on the hot path
      const files = Array.isArray(req.files) ? req.files : [req.files];
      const savedFileIds: { id: number; path: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const format = fileFormats[i] || 'Unknown';
        // Insert with empty placeholder hash — real hash computed in background
        const fileId = await storage.addSubmissionFile(submission.id, format, `/uploads/${file.filename}`, '', file.mimetype, file.originalname);
        savedFileIds.push({ id: fileId, path: file.path });
      }

      await storage.updateTaskStatus(taskId, 'SUBMITTED');

      // Respond immediately so the user sees instant confirmation
      console.log('Submission successful:', submission.id);
      res.status(201).json(submission);

      // --- Background work: hash computation + notifications (non-blocking) ---
      setImmediate(async () => {
        for (const { id, path } of savedFileIds) {
          computeHashBackground(path, id);
        }
        try {
          const admins = await db.select().from(schema.users).where(eq(schema.users.role, 'ADMIN'));
          for (const admin of admins) {
            await storage.createNotification(admin.id, `New submission for task ${taskId}`);
          }
        } catch (notifyError) {
          console.error('Notification error:', notifyError);
        }
      });
    } catch (error: any) {
      console.error('Task submission error details:', error);
      res.status(500).json({ message: 'Failed to submit task', error: error.message });
    }
  });

  app.delete(api.candidate.tasks.deleteSubmission.path, authenticate, requireCandidate, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: 'Invalid submission ID' });
      }

      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      // Verify ownership
      if (submission.candidateId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Check deadline
      const task = await storage.getTaskById(submission.taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (new Date() > new Date(task.deadline)) {
        return res.status(403).json({ message: 'Cannot delete submission after deadline has passed' });
      }

      await storage.deleteSubmission(submissionId);
      res.json({ message: 'Submission deleted successfully' });
    } catch (error: any) {
      console.error('Submission deletion error:', error);
      res.status(500).json({ message: 'Failed to delete submission', error: error.message });
    }
  });

  app.post(api.candidate.attendance.mark.path, authenticate, requireCandidate, upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const { latitude, longitude, locationArea, locationCity, locationState, locationPincode, locationAddress } = req.body;

    const record = await storage.markAttendance({
      candidateId: req.user.id,
      photoUrl: `/uploads/${req.file.filename}`,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      locationArea: locationArea || null,
      locationCity: locationCity || null,
      locationState: locationState || null,
      locationPincode: locationPincode || null,
      locationAddress: locationAddress || null,
    } as any);

    res.status(201).json(record);
  });

  app.get(api.candidate.attendance.list.path, authenticate, requireCandidate, async (req, res) => {
    const logs = await storage.getAttendanceLogsByCandidate(req.user.id);
    res.json(logs);
  });

  app.get(api.candidate.notifications.list.path, authenticate, async (req, res) => {
    const notifications = await storage.getNotifications(req.user.id);
    res.json(notifications);
  });

  return httpServer;
}

// Add Express Request type definition for the user object
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
