import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Admin pages
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCandidates from "@/pages/admin-candidates";
import AdminCandidateProfile from "@/pages/admin-candidate-profile";
import AdminTasks from "@/pages/admin-tasks";
import AdminAttendance from "@/pages/admin-attendance";

// Candidate pages
import CandidateProfile from "@/pages/candidate-profile";
import CandidateTasks from "@/pages/candidate-tasks";
import CandidateAttendance from "@/pages/candidate-attendance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/candidates/:id" component={AdminCandidateProfile} />
      <Route path="/admin/tasks" component={AdminTasks} />
      <Route path="/admin/attendance" component={AdminAttendance} />
      
      {/* Candidate Routes */}
      <Route path="/candidate/profile" component={CandidateProfile} />
      <Route path="/candidate/tasks" component={CandidateTasks} />
      <Route path="/candidate/attendance" component={CandidateAttendance} />
      {/* Optional progress route maps back to profile or separate stats view. Reusing profile for now */}
      <Route path="/candidate/progress" component={CandidateProfile} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
