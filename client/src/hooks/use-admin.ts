import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// Candidates
export function useAdminCandidates() {
  return useQuery({
    queryKey: [api.admin.candidates.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.candidates.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return await res.json();
    }
  });
}

export function useAdminCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.admin.candidates.create.path, {
        method: api.admin.candidates.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create candidate");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.candidates.list.path] })
  });
}

// Tasks
export function useAdminTasks() {
  return useQuery({
    queryKey: [api.admin.tasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.tasks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    }
  });
}

export function useAdminCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.admin.tasks.create.path, {
        method: api.admin.tasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create task");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/today-activity'] });
    }
  });
}

export function useAdminReviewTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const url = buildUrl(api.admin.tasks.review.path, { id });
      const res = await fetch(url, {
        method: api.admin.tasks.review.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to review task");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] })
  });
}

export function useAdminEditTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const url = buildUrl(api.admin.tasks.edit.path, { id });
      const res = await fetch(url, {
        method: api.admin.tasks.edit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update task");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] })
  });
}

export function useAdminReviewFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, data }: { fileId: number, data: any }) => {
      const url = buildUrl(api.admin.tasks.reviewFile.path, { fileId });
      const res = await fetch(url, {
        method: api.admin.tasks.reviewFile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to review file");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] })
  });
}

export function useAdminDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: number) => {
      const url = buildUrl(api.admin.candidates.delete.path, { id: candidateId });
      const res = await fetch(url, {
        method: api.admin.candidates.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete candidate");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.candidates.list.path] })
  });
}

export function useAdminDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const url = buildUrl(api.admin.tasks.delete.path, { id: taskId });
      const res = await fetch(url, {
        method: api.admin.tasks.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.tasks.list.path] })
  });
}

// Today's Activity
export function useTodayActivity() {
  return useQuery({
    queryKey: ['/api/admin/today-activity'],
    queryFn: async () => {
      const res = await fetch('/api/admin/today-activity', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch today's activity");
      return await res.json();
    },
    refetchInterval: 30000,
  });
}

// Attendance
export function useAdminAttendance() {
  return useQuery({
    queryKey: [api.admin.attendance.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.attendance.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return await res.json();
    }
  });
}
