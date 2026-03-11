import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminCandidates, useAdminTasks } from "@/hooks/use-admin";
import { Loader2, ArrowLeft, Download, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminCandidateProfile() {
  const [location, setLocation] = useLocation();
  const candidateId = parseInt(location.split('/').pop() || '0');
  const { data: candidates, isLoading: loadingCandidates } = useAdminCandidates();
  const { data: tasks, isLoading: loadingTasks } = useAdminTasks();
  const [exporting, setExporting] = useState(false);

  const candidate = candidates?.find((c: any) => c.id === candidateId);
  
  if (loadingCandidates || loadingTasks) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!candidate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Candidate not found</p>
          <Button onClick={() => setLocation('/admin/candidates')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
      </Layout>
    );
  }

  // Calculate performance metrics
  const assignedTasks = tasks?.filter((t: any) => 
    t.submissions?.some((s: any) => s.candidateId === candidateId)
  ) || [];

  const completedTasks = assignedTasks.filter((t: any) =>
    t.submissions?.some((s: any) => s.candidateId === candidateId && s.approvalStatus === 'APPROVED')
  );

  const rejectedTasks = assignedTasks.filter((t: any) =>
    t.submissions?.some((s: any) => s.candidateId === candidateId && s.approvalStatus === 'REJECTED')
  );

  const missedTasks = assignedTasks.filter((t: any) =>
    t.submissions?.some((s: any) => s.candidateId === candidateId && s.approvalStatus === 'MISSED')
  );

  const completionRate = assignedTasks.length > 0 
    ? Math.round((completedTasks.length / assignedTasks.length) * 100)
    : 0;

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ['Field', 'Value'];
      const rows = [
        ['Candidate Name', candidate.profile?.fullName || 'N/A'],
        ['Email', candidate.email],
        ['Phone', candidate.profile?.phone || 'N/A'],
        ['State', candidate.profile?.state || 'N/A'],
        ['Age', candidate.profile?.age || 'N/A'],
        ['Education', candidate.profile?.education || 'N/A'],
        ['Address', candidate.profile?.address || 'N/A'],
        ['Bio', candidate.profile?.bio || 'N/A'],
        ['', ''],
        ['Performance Metrics', ''],
        ['Total Tasks Assigned', assignedTasks.length],
        ['Tasks Completed', completedTasks.length],
        ['Tasks Rejected', rejectedTasks.length],
        ['Tasks Missed', missedTasks.length],
        ['Completion Rate', `${completionRate}%`],
        ['', ''],
        ['Task History', ''],
      ];

      assignedTasks.forEach((task: any, idx: number) => {
        const submission = task.submissions?.find((s: any) => s.candidateId === candidateId);
        rows.push([
          `Task ${idx + 1}: ${task.title}`,
          submission?.approvalStatus || 'PENDING'
        ]);
      });

      const csv = [headers, ...rows]
        .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate_${candidateId}_report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation('/admin/candidates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
          <Button onClick={handleExportCSV} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Report (CSV)'}
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">{candidate.profile?.fullName || 'Unnamed Candidate'}</CardTitle>
            <p className="text-muted-foreground">{candidate.email}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{candidate.profile?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State:</span>
                    <span>{candidate.profile?.state || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right">{candidate.profile?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3">Profile Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span>{candidate.profile?.age || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Education:</span>
                    <span className="text-right">{candidate.profile?.education || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Created:</span>
                    <span>{format(new Date(candidate.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {candidate.profile?.bio && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground">{candidate.profile.bio}</p>
              </div>
            )}

            {candidate.profile?.achievements && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Achievements</h3>
                <p className="text-sm text-muted-foreground">{candidate.profile.achievements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-400">{assignedTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Assigned</p>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-400">{missedTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Missed</p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{rejectedTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Rejected</p>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task History */}
        {assignedTasks.length > 0 && (
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle>Task History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedTasks.map((task: any) => {
                  const submission = task.submissions?.find((s: any) => s.candidateId === candidateId);
                  const status = submission?.approvalStatus || 'PENDING';
                  
                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(task.deadline), 'PPp')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'APPROVED' && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {status === 'REJECTED' && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {status === 'MISSED' && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Missed
                          </Badge>
                        )}
                        {status === 'SUBMITTED' && (
                          <Badge variant="outline">Pending Review</Badge>
                        )}
                        {status === 'PENDING' && (
                          <Badge variant="outline">Not Submitted</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {assignedTasks.length === 0 && (
          <Card className="glass-panel border-white/10">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No tasks assigned to this candidate yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
