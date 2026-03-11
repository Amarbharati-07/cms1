import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// Profile
export function useCandidateProfile() {
  return useQuery({
    queryKey: [api.candidate.profile.get.path],
    queryFn: async () => {
      const res = await fetch(api.candidate.profile.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return await res.json();
    }
  });
}

export function useCandidateUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.candidate.profile.update.path, {
        method: api.candidate.profile.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidate.profile.get.path] })
  });
}

// Tasks
export function useCandidateTasks() {
  return useQuery({
    queryKey: [api.candidate.tasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.candidate.tasks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    }
  });
}

export function useCandidateSubmitTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const url = buildUrl(api.candidate.tasks.submit.path, { id });
      const res = await fetch(url, {
        method: api.candidate.tasks.submit.method,
        body: formData, // No Content-Type header so browser sets multipart/form-data with boundary
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit task");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidate.tasks.list.path] })
  });
}

export function useCandidateDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: number) => {
      const url = buildUrl(api.candidate.tasks.deleteSubmission.path, { submissionId });
      const res = await fetch(url, {
        method: api.candidate.tasks.deleteSubmission.method,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete submission");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidate.tasks.list.path] })
  });
}

// Attendance
export function useCandidateAttendance() {
  return useQuery({
    queryKey: [api.candidate.attendance.list.path],
    queryFn: async () => {
      const res = await fetch(api.candidate.attendance.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return await res.json();
    }
  });
}

export function useCandidateMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.candidate.attendance.mark.path, {
        method: api.candidate.attendance.mark.method,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidate.attendance.list.path] })
  });
}
