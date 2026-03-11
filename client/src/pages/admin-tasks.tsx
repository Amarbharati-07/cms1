import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAdminTasks, useAdminCreateTask, useAdminReviewTask, useAdminEditTask, useAdminCandidates, useAdminReviewFile, useAdminDeleteTask } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Calendar, FileText, CheckCircle2, XCircle, CheckSquare, Edit2, Trash2, MapPin, Download, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function secureFileUrl(fileUrl: string): string {
  return fileUrl.replace('/uploads/', '/api/files/');
}

function fileIcon(fileType: string) {
  if (fileType?.startsWith('video/')) return '🎬';
  if (fileType === 'application/pdf') return '📄';
  if (fileType?.includes('word')) return '📝';
  if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
  return '📁';
}

const deadlineBaseFields = {
  deadlineDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  deadlineTime: z.string().refine(val => /^\d{2}:\d{2}$/.test(val), { message: "Invalid time format (HH:MM)" }),
};

const deadlineNotInPastRefine = (data: { deadlineDate: string; deadlineTime: string }) => {
  if (!data.deadlineDate || !data.deadlineTime) return true;
  const [hours, minutes] = data.deadlineTime.split(':').map(Number);
  const chosen = new Date(data.deadlineDate);
  chosen.setHours(hours, minutes, 0, 0);
  return chosen > new Date();
};

const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  ...deadlineBaseFields,
  requiredFormats: z.array(z.enum(['Video', 'PDF', 'Word', 'Excel', 'Text'])).min(1, "Select at least one format"),
  candidateIds: z.string().min(1, "Select at least one candidate ID (comma separated)").transform(val => val.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)))
}).refine(deadlineNotInPastRefine, { message: "Deadline cannot be in the past.", path: ["deadlineTime"] });

const editTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  ...deadlineBaseFields,
  requiredFormats: z.array(z.enum(['Video', 'PDF', 'Word', 'Excel', 'Text'])).optional(),
}).refine(deadlineNotInPastRefine, { message: "Deadline cannot be in the past.", path: ["deadlineTime"] });

const reviewSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
  adminComment: z.string().optional(),
});

function getNowDateStr() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getNowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function AdminTasks() {
  const { data: tasks, isLoading } = useAdminTasks();
  const { data: candidates } = useAdminCandidates();
  const { mutateAsync: createTask, isPending: creating } = useAdminCreateTask();
  const { mutateAsync: reviewTask, isPending: reviewing } = useAdminReviewTask();
  const { mutateAsync: editTask, isPending: editing } = useAdminEditTask();
  const { mutateAsync: reviewFile, isPending: reviewingFile } = useAdminReviewFile();
  const { mutateAsync: deleteTask, isPending: deleting } = useAdminDeleteTask();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState<number | null>(null);
  const [fileReviewOpen, setFileReviewOpen] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<number | null>(null);
  const [fileComment, setFileComment] = useState("");
  const [nowDisplay, setNowDisplay] = useState(() => format(new Date(), "PPp"));
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => setNowDisplay(format(new Date(), "PPp")), 1000);
    return () => clearInterval(interval);
  }, []);

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "", description: "", deadlineDate: getNowDateStr(), deadlineTime: getNowTimeStr(), requiredFormats: [], candidateIds: "" as any }
  });

  const editForm = useForm<z.infer<typeof editTaskSchema>>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: { title: "", description: "", deadlineDate: getNowDateStr(), deadlineTime: getNowTimeStr(), requiredFormats: [] }
  });

  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { approvalStatus: 'APPROVED', adminComment: "" }
  });

  const onSubmitCreate = async (values: z.infer<typeof createTaskSchema>) => {
    try {
      // Combine date and time into ISO timestamp
      const [hours, minutes] = values.deadlineTime.split(':').map(Number);
      const deadlineDate = new Date(values.deadlineDate);
      deadlineDate.setHours(hours, minutes, 0, 0);
      await createTask({ ...values, deadline: deadlineDate.toISOString() });
      toast({ title: "Task created successfully" });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const onSubmitEdit = async (taskId: number, values: z.infer<typeof editTaskSchema>) => {
    try {
      const [hours, minutes] = values.deadlineTime.split(':').map(Number);
      const deadlineDate = new Date(values.deadlineDate);
      deadlineDate.setHours(hours, minutes, 0, 0);
      await editTask({
        id: taskId,
        data: {
          title: values.title,
          description: values.description,
          deadline: deadlineDate.toISOString(),
          requiredFormats: values.requiredFormats,
        }
      });
      toast({ title: "Task updated successfully" });
      setEditOpen(null);
      editForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const onSubmitReview = async (taskId: number, values: z.infer<typeof reviewSchema>) => {
    try {
      await reviewTask({ id: taskId, data: values });
      toast({ title: "Task reviewed successfully" });
      setReviewOpen(null);
      reviewForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold font-display text-gradient mb-2">Task Management</h1>
            <p className="text-muted-foreground">Assign and review field tasks.</p>
          </div>

          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) form.reset({ title: "", description: "", deadlineDate: getNowDateStr(), deadlineTime: getNowTimeStr(), requiredFormats: [], candidateIds: "" as any });
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" /> Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-panel border-white/10">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-300">Current date &amp; time: <span className="font-semibold" data-testid="text-current-datetime-create">{nowDisplay}</span></p>
                  </div>
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea className="bg-black/20 border-white/10 resize-none h-24" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="deadlineDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={getNowDateStr()}
                            className="bg-black/20 border-white/10 [&::-webkit-calendar-picker-indicator]:invert"
                            data-testid="input-deadline-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="deadlineTime" render={({ field }) => {
                      const watchedDate = form.watch("deadlineDate");
                      const isToday = watchedDate === getNowDateStr();
                      return (
                        <FormItem>
                          <FormLabel>Deadline Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              min={isToday ? getNowTimeStr() : undefined}
                              className="bg-black/20 border-white/10"
                              data-testid="input-deadline-time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                  </div>
                  <FormField control={form.control} name="requiredFormats" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Submission Formats</FormLabel>
                      <div className="space-y-3">
                        {['Video', 'PDF', 'Word', 'Excel', 'Text'].map(fmt => (
                          <div key={fmt} className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={fmt}
                              checked={field.value?.includes(fmt as any) || false}
                              onChange={(e) => {
                                const newValue = e.target.checked 
                                  ? [...(field.value || []), fmt] 
                                  : (field.value || []).filter(v => v !== fmt);
                                field.onChange(newValue);
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-black/20 cursor-pointer"
                            />
                            <label htmlFor={fmt} className="text-sm font-medium cursor-pointer">{fmt}</label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="candidateIds" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Candidate IDs (comma separated)</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" placeholder="e.g. 1, 2, 3" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Available IDs: {candidates?.map((c:any)=>c.id).join(', ')}</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full mt-6" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign Task"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-card border border-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-6">
            {tasks?.map((task: any) => (
              <Card key={task.id} className="glass-panel border-white/5 hover-elevate">
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{task.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Due: {format(new Date(task.deadline), 'PPp')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={editOpen === task.id} onOpenChange={(val) => setEditOpen(val ? task.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => {
                            const deadline = new Date(task.deadline);
                            const dateStr = deadline.toISOString().split('T')[0];
                            const timeStr = `${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}`;
                            editForm.reset({
                              title: task.title,
                              description: task.description,
                              deadlineDate: dateStr,
                              deadlineTime: timeStr,
                              requiredFormats: task.requiredFormats || [],
                            });
                          }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] glass-panel border-white/10">
                          <DialogHeader>
                            <DialogTitle className="font-display text-2xl">Edit Task</DialogTitle>
                          </DialogHeader>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit((val) => onSubmitEdit(task.id, val))} className="space-y-4 mt-4">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                                <p className="text-xs text-blue-300">Current date &amp; time: <span className="font-semibold" data-testid="text-current-datetime-edit">{nowDisplay}</span></p>
                              </div>
                              <FormField control={editForm.control} name="title" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Task Title</FormLabel>
                                  <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={editForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl><Textarea className="bg-black/20 border-white/10 resize-none h-24" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-2 gap-3">
                                <FormField control={editForm.control} name="deadlineDate" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Deadline Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        min={getNowDateStr()}
                                        className="bg-black/20 border-white/10 [&::-webkit-calendar-picker-indicator]:invert"
                                        data-testid="input-edit-deadline-date"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={editForm.control} name="deadlineTime" render={({ field }) => {
                                  const watchedDate = editForm.watch("deadlineDate");
                                  const isToday = watchedDate === getNowDateStr();
                                  return (
                                    <FormItem>
                                      <FormLabel>Deadline Time</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="time"
                                          min={isToday ? getNowTimeStr() : undefined}
                                          className="bg-black/20 border-white/10"
                                          data-testid="input-edit-deadline-time"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }} />
                              </div>
                              <Button type="submit" className="w-full mt-6" disabled={editing}>
                                {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Task"}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDeleteOpen(task.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {deleteOpen === task.id && (
                        <Dialog open={deleteOpen === task.id} onOpenChange={(val) => !val && setDeleteOpen(null)}>
                          <DialogContent className="glass-panel border-white/10 sm:max-w-[400px]">
                            <DialogHeader>
                              <DialogTitle>Delete Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground">Are you sure? This will delete all submissions and assignments.</p>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setDeleteOpen(null)} className="flex-1">Cancel</Button>
                                <Button variant="destructive" onClick={async () => {
                                  try {
                                    await deleteTask(task.id);
                                    toast({ title: "Task deleted successfully" });
                                    setDeleteOpen(null);
                                  } catch (error: any) {
                                    toast({ variant: "destructive", title: "Error", description: error.message });
                                  }
                                }} disabled={deleting} className="flex-1">
                                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                  {task.requiredFormats && task.requiredFormats.length > 0 && (
                    <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs font-semibold text-blue-400 mb-2">Required Formats:</p>
                      <div className="flex flex-wrap gap-2">
                        {task.requiredFormats.map((fmt: string) => (
                          <Badge key={fmt} variant="secondary" className="bg-blue-500/20 text-blue-300">{fmt}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {task.submissions && task.submissions.length > 0 && (
                    <div className="space-y-4 mt-6 border-t border-white/10 pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-sm font-semibold">Submission History</h3>
                        <Badge variant="secondary" className="text-xs">{task.submissions.length}</Badge>
                      </div>
                      {task.submissions?.map((sub: any) => (
                        <div key={sub.id} className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-sm">
                                  {sub.candidateProfile?.fullName || `Candidate ID: ${sub.candidateId}`}
                                </p>
                                <p className="text-xs text-muted-foreground">ID: {sub.candidateId}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">{format(new Date(sub.timestamp), 'PPp')}</p>
                            </div>
                            {sub.candidateProfile?.phone && (
                              <p className="text-xs text-muted-foreground">Phone: {sub.candidateProfile.phone}</p>
                            )}
                            {sub.candidateProfile?.state && (
                              <p className="text-xs text-muted-foreground">State: {sub.candidateProfile.state}</p>
                            )}
                          </div>
                          {(sub.locationAddress || sub.locationCity) && (
                            <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/15 rounded-md space-y-0.5">
                              <p className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Upload Location
                              </p>
                              {(sub.locationArea || sub.locationCity) && (
                                <p className="text-xs text-foreground font-medium">
                                  {[sub.locationArea, sub.locationCity].filter(Boolean).join(", ")}
                                </p>
                              )}
                              {sub.locationState && (
                                <p className="text-xs text-muted-foreground">
                                  {sub.locationState}{sub.locationPincode ? ` - ${sub.locationPincode}` : ""}
                                </p>
                              )}
                              {sub.locationAddress && (
                                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{sub.locationAddress}</p>
                              )}
                              {sub.latitude && sub.longitude && (
                                <p className="text-[11px] font-mono text-muted-foreground/50">{sub.latitude.toFixed(6)}, {sub.longitude.toFixed(6)}</p>
                              )}
                            </div>
                          )}

                          {sub.files && sub.files.length > 0 && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3 space-y-2">
                              <p className="text-xs font-semibold text-blue-400">Submitted Files:</p>
                              {sub.files.map((file: any) => (
                                <div key={file.id} className="flex items-center justify-between gap-2 text-xs" data-testid={`card-admin-file-${file.id}`}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-sm shrink-0">{fileIcon(file.fileType)}</span>
                                    <div className="min-w-0">
                                      <p className="font-medium truncate" data-testid={`text-admin-file-name-${file.id}`}>{file.fileName || file.format}</p>
                                      <div className="flex flex-wrap items-center gap-2 text-muted-foreground mt-0.5">
                                        <span>{file.fileType}</span>
                                        {file.uploadedAt && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {format(new Date(file.uploadedAt), 'PPp')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant={file.approvalStatus === 'APPROVED' ? 'default' : file.approvalStatus === 'REJECTED' ? 'destructive' : 'outline'} className="text-xs">
                                      {file.approvalStatus}
                                    </Badge>
                                    <Button variant="outline" size="sm" asChild className="h-7 px-2">
                                      <a href={secureFileUrl(file.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" data-testid={`link-admin-download-file-${file.id}`}>
                                        <Download className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <Dialog open={reviewOpen === sub.id} onOpenChange={(val) => setReviewOpen(val ? sub.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="secondary" className="w-full">
                                {task.status === 'SUBMITTED' ? (
                                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Review This Submission</>
                                ) : (
                                  <><FileText className="w-4 h-4 mr-2" /> View Submission</>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-panel border-white/10 sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="space-y-2">
                                  <div>{task.status === 'SUBMITTED' ? 'Review Submission' : 'View Submission'}</div>
                                  <div className="text-sm font-normal text-muted-foreground">
                                    <p>{sub.candidateProfile?.fullName || `Candidate ID: ${sub.candidateId}`}</p>
                                    <p className="text-xs">{task.title}</p>
                                    <p className="text-xs mt-1">Submitted: {format(new Date(sub.timestamp), 'PPp')}</p>
                                  </div>
                                </DialogTitle>
                              </DialogHeader>
                              
                              {(sub.locationAddress || sub.locationCity || sub.latitude) && (
                                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-1">
                                  <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mb-2">
                                    <MapPin className="w-3.5 h-3.5" /> Submission Location
                                  </p>
                                  {(sub.locationArea || sub.locationCity) && (
                                    <p className="text-sm font-medium text-foreground">
                                      {[sub.locationArea, sub.locationCity].filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                  {sub.locationState && (
                                    <p className="text-xs text-muted-foreground">
                                      {sub.locationState}{sub.locationPincode ? ` — ${sub.locationPincode}` : ""}
                                    </p>
                                  )}
                                  {sub.locationAddress && (
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{sub.locationAddress}</p>
                                  )}
                                  {sub.latitude && sub.longitude && (
                                    <p className="text-xs font-mono text-muted-foreground/50 pt-1">
                                      GPS: {sub.latitude.toFixed(6)}, {sub.longitude.toFixed(6)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {sub.files && sub.files.length > 0 && (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3">Submitted Files:</h4>
                                    <div className="space-y-3">
                                      {sub.files.map((file: any) => (
                                        <div key={file.id} className="border border-white/10 rounded-lg p-3 space-y-3 bg-black/20" data-testid={`card-admin-review-file-${file.id}`}>
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                              <span className="text-lg shrink-0 mt-0.5">{fileIcon(file.fileType)}</span>
                                              <div className="min-w-0">
                                                <p className="font-medium text-sm truncate" data-testid={`text-admin-review-file-name-${file.id}`}>{file.fileName || file.format}</p>
                                                <p className="text-xs text-muted-foreground">{file.fileType}</p>
                                                {file.uploadedAt && (
                                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5" data-testid={`text-admin-review-file-date-${file.id}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(file.uploadedAt), 'PPp')}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <Badge variant={file.approvalStatus === 'APPROVED' ? 'default' : file.approvalStatus === 'REJECTED' ? 'destructive' : 'outline'} className="text-xs">
                                                {file.approvalStatus}
                                              </Badge>
                                              <Button variant="outline" size="sm" asChild>
                                                <a href={secureFileUrl(file.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" data-testid={`link-admin-review-download-${file.id}`}>
                                                  <Download className="w-3 h-3" /> Download
                                                </a>
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          {file.adminComment && (
                                            <p className="text-xs text-muted-foreground italic border-l-2 border-yellow-500/30 pl-2">Comment: {file.adminComment}</p>
                                          )}
                                          
                                          {file.fileType?.startsWith('video/') && (
                                            <div className="aspect-video rounded overflow-hidden border border-white/5">
                                              <video 
                                                src={secureFileUrl(file.fileUrl)} 
                                                controls 
                                                className="h-full w-full object-contain bg-black"
                                              />
                                            </div>
                                          )}
                                          
                                          {sub.approvalStatus === 'SUBMITTED' && (
                                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                              <Button 
                                                size="sm" 
                                                variant={file.approvalStatus === 'APPROVED' ? 'default' : 'outline'} 
                                                className="flex-1 text-xs h-8"
                                                onClick={() => reviewFile({ fileId: file.id, data: { approvalStatus: 'APPROVED', adminComment: '' } })}
                                                disabled={reviewingFile}
                                              >
                                                ✓ Approve
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant={file.approvalStatus === 'REJECTED' ? 'destructive' : 'outline'} 
                                                className="flex-1 text-xs h-8"
                                                onClick={() => setFileReviewOpen(file.id)}
                                                disabled={reviewingFile}
                                              >
                                                ✗ Reject
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sub.approvalStatus === 'SUBMITTED' && (
                                <div className="border-t border-white/10 pt-4">
                                  <h4 className="text-sm font-semibold mb-3">Submission Review:</h4>
                                  <Form {...reviewForm}>
                                    <form onSubmit={reviewForm.handleSubmit((v) => onSubmitReview(sub.id, v))} className="space-y-3">
                                      <FormField control={reviewForm.control} name="approvalStatus" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Overall Status</FormLabel>
                                          <FormControl>
                                            <select 
                                              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-black/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              {...field}
                                            >
                                              <option className="bg-card" value="APPROVED">Approve Submission</option>
                                              <option className="bg-card" value="REJECTED">Reject Submission</option>
                                            </select>
                                          </FormControl>
                                        </FormItem>
                                      )} />
                                      <FormField control={reviewForm.control} name="adminComment" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Overall Comments</FormLabel>
                                          <FormControl><Textarea className="bg-black/20 border-white/10 resize-none text-xs h-20" placeholder="Enter your feedback..." {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )} />
                                      <Button type="submit" className="w-full text-sm h-9" disabled={reviewing}>
                                        {reviewing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : ""}Submit Review
                                      </Button>
                                    </form>
                                  </Form>
                                </div>
                              )}
                              
                              {sub.approvalStatus !== 'SUBMITTED' && (
                                <div className="border-t border-white/10 pt-4 bg-black/40 p-3 rounded">
                                  <h4 className="text-sm font-semibold mb-2">Submission Status:</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={sub.approvalStatus === 'APPROVED' ? 'default' : sub.approvalStatus === 'REJECTED' ? 'destructive' : 'outline'}>
                                        {sub.approvalStatus}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">on {format(new Date(sub.timestamp), 'PPp')}</span>
                                    </div>
                                    {sub.adminComment && (
                                      <div>
                                        <p className="text-xs font-medium mb-1">Admin Comment:</p>
                                        <p className="text-xs text-muted-foreground italic">{sub.adminComment}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>

                            {fileReviewOpen && (
                              <Dialog open={fileReviewOpen !== null} onOpenChange={(val) => !val && setFileReviewOpen(null)}>
                                <DialogContent className="glass-panel border-white/10 sm:max-w-[400px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-sm">Reject File</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Feedback (optional)</label>
                                      <Textarea value={fileComment} onChange={(e) => setFileComment(e.target.value)} placeholder="Enter rejection reason..." className="bg-black/20 border-white/10 resize-none mt-1 text-xs" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button variant="outline" onClick={() => setFileReviewOpen(null)} className="flex-1 text-xs h-8">Cancel</Button>
                                      <Button variant="destructive" onClick={async () => {
                                        try {
                                          await reviewFile({ fileId: fileReviewOpen, data: { approvalStatus: 'REJECTED', adminComment: fileComment } });
                                          toast({ title: "File rejected successfully" });
                                          setFileReviewOpen(null);
                                          setFileComment("");
                                        } catch (error: any) {
                                          toast({ variant: "destructive", title: "Error", description: error.message });
                                        }
                                      }} disabled={reviewingFile} className="flex-1 text-xs h-8">
                                        {reviewingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : ""} Reject
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </Dialog>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {tasks?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No tasks created yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
