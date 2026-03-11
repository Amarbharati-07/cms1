import { z } from 'zod';
import { insertUserSchema, insertCandidateProfileSchema, insertTaskSchema, insertSubmissionSchema, insertAttendanceSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ id: z.number(), email: z.string(), role: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: { 200: z.object({ message: z.string() }) }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({ id: z.number(), email: z.string(), role: z.string() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  admin: {
    candidates: {
      create: {
        method: 'POST' as const,
        path: '/api/admin/candidates' as const,
        input: z.object({ 
          email: z.string().email(), 
          password: z.string(), 
          profile: insertCandidateProfileSchema.omit({ userId: true }) 
        }),
        responses: { 201: z.any() }
      },
      list: {
        method: 'GET' as const,
        path: '/api/admin/candidates' as const,
        responses: { 200: z.any() }
      },
      get: {
        method: 'GET' as const,
        path: '/api/admin/candidates/:id' as const,
        responses: { 200: z.any(), 404: errorSchemas.notFound }
      },
      update: {
        method: 'PUT' as const,
        path: '/api/admin/candidates/:id' as const,
        input: insertCandidateProfileSchema.partial(),
        responses: { 200: z.any() }
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/admin/candidates/:id' as const,
        responses: { 200: z.any() }
      }
    },
    tasks: {
      create: {
        method: 'POST' as const,
        path: '/api/admin/tasks' as const,
        input: insertTaskSchema.omit({ deadline: true, requiredFormats: true }).extend({ 
          deadline: z.string().or(z.date()).transform(d => typeof d === 'string' ? new Date(d) : d),
          requiredFormats: z.array(z.enum(['Video', 'PDF', 'Word', 'Excel', 'Text'])).default([]),
          candidateIds: z.array(z.number()) 
        }),
        responses: { 201: z.any() }
      },
      list: {
        method: 'GET' as const,
        path: '/api/admin/tasks' as const,
        responses: { 200: z.any() }
      },
      review: {
        method: 'PUT' as const,
        path: '/api/admin/tasks/:id/review' as const,
        input: z.object({ approvalStatus: z.enum(['APPROVED', 'REJECTED', 'MISSED']), adminComment: z.string().optional() }),
        responses: { 200: z.any() }
      },
      edit: {
        method: 'PUT' as const,
        path: '/api/admin/tasks/:id' as const,
        input: z.object({ 
          title: z.string().min(3).optional(),
          description: z.string().min(10).optional(),
          deadline: z.string().or(z.date()).optional(),
          requiredFormats: z.array(z.enum(['Video', 'PDF', 'Word', 'Excel', 'Text'])).optional(),
          candidateIds: z.array(z.number()).optional()
        }),
        responses: { 200: z.any() }
      },
      reviewFile: {
        method: 'PUT' as const,
        path: '/api/admin/files/:fileId/review' as const,
        input: z.object({ approvalStatus: z.enum(['APPROVED', 'REJECTED']), adminComment: z.string().optional() }),
        responses: { 200: z.any() }
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/admin/tasks/:id' as const,
        responses: { 200: z.any() }
      }
    },
    attendance: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/attendance' as const,
        responses: { 200: z.any() }
      }
    },
    reports: {
      get: {
        method: 'GET' as const,
        path: '/api/admin/reports/:candidateId' as const,
        responses: { 200: z.any() }
      }
    }
  },
  candidate: {
    profile: {
      get: {
        method: 'GET' as const,
        path: '/api/candidate/profile' as const,
        responses: { 200: z.any() }
      },
      update: {
        method: 'PUT' as const,
        path: '/api/candidate/profile' as const,
        input: insertCandidateProfileSchema.partial().omit({ userId: true }),
        responses: { 200: z.any() }
      },
      upload: {
        method: 'POST' as const,
        path: '/api/candidate/profile/upload' as const,
        responses: { 200: z.any() }
      }
    },
    tasks: {
      list: {
        method: 'GET' as const,
        path: '/api/candidate/tasks' as const,
        responses: { 200: z.any() }
      },
      submit: {
        method: 'POST' as const,
        path: '/api/candidate/tasks/:id/submit' as const,
        responses: { 201: z.any() }
      },
      deleteSubmission: {
        method: 'DELETE' as const,
        path: '/api/candidate/tasks/:submissionId/submission' as const,
        responses: { 200: z.any() }
      }
    },
    attendance: {
      mark: {
        method: 'POST' as const,
        path: '/api/candidate/attendance' as const,
        responses: { 201: z.any() }
      },
      list: {
        method: 'GET' as const,
        path: '/api/candidate/attendance' as const,
        responses: { 200: z.any() }
      }
    },
    notifications: {
      list: {
        method: 'GET' as const,
        path: '/api/candidate/notifications' as const,
        responses: { 200: z.any() }
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
