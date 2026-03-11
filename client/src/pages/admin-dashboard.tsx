import { useRef } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminCandidates, useAdminTasks, useTodayActivity } from "@/hooks/use-admin";
import { Users, CheckSquare, Clock, ArrowUpRight, ChevronLeft, ChevronRight, User, Calendar, ExternalLink } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { useLocation } from "wouter";

const chartData = [
  { name: 'Mon', active: 40, completed: 24 },
  { name: 'Tue', active: 30, completed: 13 },
  { name: 'Wed', active: 20, completed: 48 },
  { name: 'Thu', active: 27, completed: 39 },
  { name: 'Fri', active: 18, completed: 48 },
  { name: 'Sat', active: 23, completed: 38 },
  { name: 'Sun', active: 34, completed: 43 },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  APPROVED:  { label: "Approved",  className: "bg-green-500/20 text-green-300 border-green-500/30" },
  REJECTED:  { label: "Rejected",  className: "bg-red-500/20 text-red-300 border-red-500/30" },
  MISSED:    { label: "Missed",    className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function AdminDashboard() {
  const { data: candidates } = useAdminCandidates();
  const { data: tasks } = useAdminTasks();
  const { data: todayActivity, isLoading: activityLoading } = useTodayActivity();
  const [, navigate] = useLocation();
  const sliderRef = useRef<HTMLDivElement>(null);

  const totalCandidates = candidates?.length || 0;
  const totalTasks = tasks?.length || 0;
  const pendingTasks = tasks?.filter((t: any) => t.status === 'SUBMITTED').length || 0;

  const scrollSlider = (dir: 'left' | 'right') => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient mb-2">Overview</h1>
          <p className="text-muted-foreground text-lg">Here's what's happening with your field team today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-panel border-white/5 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Candidates</CardTitle>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{totalCandidates}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-green-400" />
                <span className="text-green-400">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <CheckSquare className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-green-400" />
                <span className="text-green-400">+5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-400">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Needs your attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Task Activity Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-display" data-testid="text-today-activity-title">Today's Task Activity</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activityLoading ? "Loading..." : `${todayActivity?.length || 0} assignment${(todayActivity?.length || 0) !== 1 ? 's' : ''} made today`}
              </p>
            </div>
            {(todayActivity?.length || 0) > 2 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => scrollSlider('left')}
                  data-testid="button-slider-left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => scrollSlider('right')}
                  data-testid="button-slider-right"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {activityLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-72 h-44 rounded-xl bg-card border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : !todayActivity || todayActivity.length === 0 ? (
            <Card className="glass-panel border-white/5">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <CheckSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No tasks assigned today yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tasks assigned today will appear here automatically.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div
                ref={sliderRef}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                data-testid="slider-today-activity"
              >
                {todayActivity.map((item: any) => {
                  const status = statusConfig[item.status] || statusConfig['PENDING'];
                  return (
                    <div
                      key={item.assignmentId}
                      className="flex-shrink-0 w-72 glass-panel border border-white/5 rounded-xl p-4 space-y-3 hover-elevate"
                      data-testid={`card-activity-${item.assignmentId}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <p className="font-semibold text-sm truncate" data-testid={`text-candidate-name-${item.assignmentId}`}>
                            {item.candidateName}
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 border ${status.className}`} data-testid={`status-task-${item.assignmentId}`}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-snug" data-testid={`text-task-title-${item.assignmentId}`}>
                          {item.taskTitle}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span data-testid={`text-assigned-at-${item.assignmentId}`}>
                            Assigned: {item.assignedAt ? format(new Date(item.assignedAt), 'pp') : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          <span>Due: {format(new Date(item.taskDeadline), 'PPp')}</span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs h-8 bg-white/5 hover:bg-white/10 border border-white/10"
                        onClick={() => navigate('/admin/tasks')}
                        data-testid={`button-view-details-${item.assignmentId}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" />
                        View Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="active" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
