import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCandidateTasks, useCandidateSubmitTask, useCandidateDeleteSubmission } from "@/hooks/use-candidate";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UploadCloud, Calendar, MapPin, CheckCircle2, CheckSquare, AlertCircle, XCircle, Trash2, FileText, Download, Clock } from "lucide-react";
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

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'Video': ['.mp4'],
  'PDF': ['.pdf'],
  'Word': ['.doc', '.docx'],
  'Excel': ['.xls', '.xlsx'],
  'Text': ['.txt']
};

const ALLOWED_MIMES: Record<string, string[]> = {
  'Video': ['video/mp4'],
  'PDF': ['application/pdf'],
  'Word': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'Excel': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'Text': ['text/plain']
};

export default function CandidateTasks() {
  const { data: tasks, isLoading } = useCandidateTasks();
  const { mutateAsync: submitTask, isPending } = useCandidateSubmitTask();
  const { mutateAsync: deleteSubmission, isPending: isDeleting } = useCandidateDeleteSubmission();
  const { latitude, longitude, address, error: geoError, loading: geoLoading, retry } = useGeolocation();
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const { toast } = useToast();

  const handleDeleteSubmission = async (submissionId: number) => {
    try {
      await deleteSubmission(submissionId);
      toast({ title: "Submission deleted", description: "You can now resubmit the task" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const validateFile = (file: File, format: string): string | null => {
    if (!file) return `Please attach a ${format} file`;

    const fileName = file.name.toLowerCase();
    const fileExt = '.' + fileName.split('.').pop();
    const fileMime = file.type;

    const allowedExts = ALLOWED_EXTENSIONS[format] || [];
    const allowedMimes = ALLOWED_MIMES[format] || [];
    
    if (allowedExts.includes(fileExt) || allowedMimes.includes(fileMime)) {
      return null;
    }

    return `File must be: ${allowedExts.join(', ')}`;
  };

  const onSubmit = async (taskId: number, requiredFormats: string[]) => {
    // Validate all required formats have files
    for (const format of requiredFormats) {
      if (!files[format]) {
        toast({ variant: "destructive", title: "Error", description: `Please upload ${format} file` });
        return;
      }
      const validationError = validateFile(files[format]!, format);
      if (validationError) {
        toast({ variant: "destructive", title: "Invalid file format", description: validationError });
        return;
      }
    }

    if (!latitude || !longitude) {
      toast({ variant: "destructive", title: "Location required", description: geoError || "Please allow location access." });
      return;
    }

    try {
      const formData = new FormData();
      requiredFormats.forEach(format => {
        if (files[format]) {
          formData.append("files", files[format]!);
        }
      });
      formData.append("formats", JSON.stringify(requiredFormats));
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (address) {
        formData.append("locationArea", address.area);
        formData.append("locationCity", address.city);
        formData.append("locationState", address.state);
        formData.append("locationPincode", address.pincode);
        formData.append("locationAddress", address.fullAddress);
      }

      await submitTask({ id: taskId, formData });
      toast({ title: "Task submitted successfully!" });
      setOpenTaskId(null);
      setFiles({});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission failed", description: error.message });
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient mb-2">My Tasks</h1>
          <p className="text-muted-foreground">Complete your assigned field tasks.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-card border border-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-6">
            {tasks?.map((task: any) => (
              <Card key={task.id} className="glass-panel border-white/5 hover-elevate">
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-xl mb-2">{task.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Due: {format(new Date(task.deadline), 'PPp')}
                      </CardDescription>
                    </div>
                    <Badge variant={task.status === 'APPROVED' ? 'default' : task.status === 'REJECTED' ? 'destructive' : task.status === 'SUBMITTED' ? 'secondary' : 'outline'} className="text-sm px-3 py-1">
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4 leading-relaxed">{task.description}</p>
                  {task.requiredFormats && task.requiredFormats.length > 0 && (
                    <div className="mb-6 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-xs font-semibold text-purple-400 mb-2">Required Submission Format:</p>
                      <div className="flex flex-wrap gap-2">
                        {task.requiredFormats.map((fmt: string) => (
                          <Badge key={fmt} variant="secondary" className="bg-purple-500/20 text-purple-300">{fmt}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {task.adminComment && (
                    <div className={`mb-6 p-4 rounded-lg border ${
                      task.status === 'REJECTED' 
                        ? 'bg-red-500/10 border-red-500/20' 
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <p className={`text-xs font-semibold mb-2 ${
                        task.status === 'REJECTED' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {task.status === 'REJECTED' ? 'Rejection Feedback:' : 'Admin Review:'}
                      </p>
                      <p className={`text-sm ${
                        task.status === 'REJECTED' ? 'text-red-100' : 'text-blue-100'
                      }`}>{task.adminComment}</p>
                    </div>
                  )}

                  {task.submissionFiles && task.submissionFiles.length > 0 && (
                    <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-lg space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Uploaded Files
                      </p>
                      {task.submissionFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between gap-3 p-2.5 bg-black/20 rounded-lg border border-white/5" data-testid={`card-uploaded-file-${file.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{fileIcon(file.fileType)}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" data-testid={`text-file-name-${file.id}`}>{file.fileName || file.format}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{file.fileType}</span>
                                {file.uploadedAt && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(file.uploadedAt), 'PPp')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild className="shrink-0 h-8 px-2.5" data-testid={`button-download-file-${file.id}`}>
                            <a href={secureFileUrl(file.fileUrl)} download={file.fileName || undefined} className="flex items-center gap-1.5">
                              <Download className="w-3.5 h-3.5" />
                              <span className="text-xs">Download</span>
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {task.status === 'SUBMITTED' && new Date() < new Date(task.deadline) && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs font-semibold text-amber-400 mb-3">Your submission is under review</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteSubmission(task.submissionId)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete & Resubmit'}
                      </Button>
                    </div>
                  )}

                  {task.status === 'MISSED' && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-400 bg-red-400/10 w-fit px-4 py-2 rounded-lg">
                      <XCircle className="w-4 h-4" />
                      Submission Missed
                    </div>
                  )}
                  
                  {(task.status === 'PENDING' || task.status === 'REJECTED') && new Date() < new Date(task.deadline) ? (
                    <Dialog open={openTaskId === task.id} onOpenChange={(val) => setOpenTaskId(val ? task.id : null)}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                          <UploadCloud className="w-4 h-4 mr-2" /> Submit Work
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] glass-panel border-white/10">
                        <DialogHeader>
                          <DialogTitle className="font-display text-2xl">Submit Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          {task.requiredFormats && task.requiredFormats.length > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-yellow-300">
                                <p className="font-semibold mb-1">Accepted formats: {task.requiredFormats.join(', ')}</p>
                                <p>Make sure your file matches one of these formats</p>
                              </div>
                            </div>
                          )}
                          <div className="space-y-4">
                            {task.requiredFormats && task.requiredFormats.length > 0 ? (
                              <>
                                <p className="text-sm font-medium">Upload Required Files</p>
                                {task.requiredFormats.map((format: string) => (
                                  <div key={format} className="space-y-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <label className="text-sm font-medium text-blue-300">{format} File</label>
                                    <input 
                                      type="file" 
                                      onChange={(e) => setFiles({ ...files, [format]: e.target.files?.[0] || null })}
                                      className="flex h-10 w-full items-center justify-center rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30 focus-visible:outline-none"
                                    />
                                    {files[format] && (
                                      <p className="text-xs text-green-400">✓ Selected: {files[format].name}</p>
                                    )}
                                    {!files[format] && (
                                      <p className="text-xs text-red-400">Required</p>
                                    )}
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Upload File Evidence</label>
                                <input 
                                  type="file" 
                                  onChange={(e) => setFiles({ ...files, 'Default': e.target.files?.[0] || null })}
                                  className="flex h-12 w-full items-center justify-center rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30 focus-visible:outline-none"
                                />
                                {files['Default'] && (
                                  <p className="text-xs text-muted-foreground">Selected: {files['Default'].name}</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" /> Live Location</span>
                              <Button variant="ghost" size="sm" onClick={retry} disabled={geoLoading} className="h-8">Refresh</Button>
                            </div>
                            {geoLoading ? (
                              <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Acquiring your exact location...
                              </p>
                            ) : geoError ? (
                              <p className="text-xs text-red-400">{geoError}</p>
                            ) : (
                              <div className="space-y-2">
                                {address ? (
                                  <div className="text-xs space-y-1">
                                    {address.area && (
                                      <p className="text-green-300 font-medium">{address.area}{address.city ? `, ${address.city}` : ""}</p>
                                    )}
                                    {address.state && (
                                      <p className="text-muted-foreground">{address.state}{address.pincode ? ` - ${address.pincode}` : ""}</p>
                                    )}
                                    <p className="text-muted-foreground/70 text-[11px] leading-relaxed">{address.fullAddress}</p>
                                  </div>
                                ) : null}
                                <p className="text-xs text-green-400/60 font-mono">
                                  {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                                </p>
                              </div>
                            )}
                          </div>

                          <Button 
                            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" 
                            onClick={() => onSubmit(task.id, task.requiredFormats || [])}
                            disabled={isPending || geoLoading || !latitude}
                          >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                            Confirm Submission
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : new Date() >= new Date(task.deadline) && (task.status === 'PENDING' || task.status === 'REJECTED') ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-400 bg-red-400/10 w-fit px-4 py-2 rounded-lg">
                      <XCircle className="w-4 h-4" />
                      Deadline Passed
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-400 bg-green-400/10 w-fit px-4 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      Submission Under Review
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {tasks?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No tasks assigned to you right now.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
