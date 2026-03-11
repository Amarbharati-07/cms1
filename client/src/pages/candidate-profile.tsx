import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCandidateProfile, useCandidateUpdateProfile } from "@/hooks/use-candidate";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UserCircle, Save, Award, BookOpen, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().min(18).max(100).optional(),
  state: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  education: z.string().optional(),
  achievements: z.string().optional(),
  bio: z.string().optional(),
});

export default function CandidateProfile() {
  const { data: profile, isLoading } = useCandidateProfile();
  const { mutateAsync: updateProfile, isPending } = useCandidateUpdateProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      age: undefined,
      state: "",
      phone: "",
      address: "",
      education: "",
      achievements: "",
      bio: "",
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || "",
        age: profile.age || undefined,
        state: profile.state || "",
        phone: profile.phone || "",
        address: profile.address || "",
        education: profile.education || "",
        achievements: profile.achievements || "",
        bio: profile.bio || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      await updateProfile(values);
      toast({ title: "Profile updated successfully!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    }
  };

  if (isLoading) return <Layout><div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;

  return (
    <Layout>
      <Form {...form}>
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/20 border-2 border-white/10">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold font-display text-gradient mb-1">{profile?.fullName || "Your Profile"}</h1>
                <p className="text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4"/> {profile?.state || "No location set"}</p>
              </div>
            </div>
            <Button onClick={() => form.handleSubmit(onSubmit)()} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 glass-panel border-white/5">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal and contact details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input className="bg-black/20" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="age" render={({ field }) => (
                      <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" className="bg-black/20" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input className="bg-black/20" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State</FormLabel><FormControl><Input className="bg-black/20" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea className="bg-black/20 resize-none h-20" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bio" render={({ field }) => (
                    <FormItem><FormLabel>Bio / About Me</FormLabel><FormControl><Textarea className="bg-black/20 resize-none h-24" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </form>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="glass-panel border-white/5">
                <CardHeader className="pb-4 border-b border-white/5">
                  <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400" /> Education</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <FormField control={form.control} name="education" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea placeholder="Highest degree, university..." className="bg-black/20 resize-none h-24" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardHeader className="pb-4 border-b border-white/5">
                  <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" /> Achievements</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <FormField control={form.control} name="achievements" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea placeholder="Awards, certifications, notable projects..." className="bg-black/20 resize-none h-24" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Form>
    </Layout>
  );
}
