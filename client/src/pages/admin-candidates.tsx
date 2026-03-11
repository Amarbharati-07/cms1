import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminCandidates, useAdminCreateCandidate } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Search, UserCircle, MapPin, Trash2, Eye, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminDeleteCandidate } from "@/hooks/use-admin";
import { useLocation } from "wouter";

const createCandidateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  profile: z.object({
    fullName: z.string().min(2),
    state: z.string().min(2),
  })
});

export default function AdminCandidates() {
  const [, setLocation] = useLocation();
  const { data: candidates, isLoading } = useAdminCandidates();
  const { mutateAsync: createCandidate, isPending } = useAdminCreateCandidate();
  const { mutateAsync: deleteCandidate, isPending: deleting } = useAdminDeleteCandidate();
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createCandidateSchema>>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: { email: "", password: "", profile: { fullName: "", state: "" } }
  });

  const onSubmit = async (values: z.infer<typeof createCandidateSchema>) => {
    try {
      await createCandidate(values);
      toast({ title: "Candidate created successfully" });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const filtered = candidates?.filter((c: any) => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold font-display text-gradient mb-2">Candidates</h1>
            <p className="text-muted-foreground">Manage your field team members.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" /> Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-panel border-white/10">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create New Candidate</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField control={form.control} name="profile.fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl><Input type="password" className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="profile.state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Region</FormLabel>
                      <FormControl><Input className="bg-black/20 border-white/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full mt-6" disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Candidate"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search candidates by name or email..." 
            className="pl-10 h-12 bg-card border-white/5 text-base w-full max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-card border border-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered?.map((candidate: any) => (
              <Card key={candidate.id} className="glass-panel border-white/5 hover-elevate">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/30 flex items-center justify-center shrink-0">
                      {candidate.profile?.profilePhoto ? (
                        <img src={candidate.profile.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserCircle className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{candidate.profile?.fullName || "Unnamed"}</h3>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-white/5 w-fit px-3 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />
                        {candidate.profile?.state || "Unknown Location"}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setLocation(`/admin/candidates/${candidate.id}`)}
                      className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDeleteOpen(candidate.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {deleteOpen && (
              <Dialog open={deleteOpen !== null} onOpenChange={(val) => !val && setDeleteOpen(null)}>
                <DialogContent className="glass-panel border-white/10 sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Delete Candidate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Are you sure? This will delete all related tasks, submissions, and attendance records.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setDeleteOpen(null)} className="flex-1">Cancel</Button>
                      <Button variant="destructive" onClick={async () => {
                        try {
                          await deleteCandidate(deleteOpen);
                          toast({ title: "Candidate deleted successfully" });
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
            {filtered?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No candidates found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
