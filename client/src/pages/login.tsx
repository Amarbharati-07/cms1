import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (user) {
    setLocation(user.role === 'ADMIN' ? "/admin/dashboard" : "/candidate/profile");
    return null;
  }

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const data = await login(values);
      toast({ title: "Welcome back!" });
      setLocation(data.role === 'ADMIN' ? "/admin/dashboard" : "/candidate/profile");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Login failed", 
        description: error.message 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] opacity-50 pointer-events-none" />

      <Card className="w-full max-w-md glass-panel shadow-2xl shadow-black/50 border-white/10 relative z-10">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/25 mb-2">
            <span className="text-white font-bold text-2xl font-display">F</span>
          </div>
          <CardTitle className="text-3xl font-bold font-display text-gradient">Welcome to FieldTrack</CardTitle>
          <CardDescription className="text-base">Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@company.com" 
                        className="bg-black/20 border-white/10 focus-visible:ring-primary h-12" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-black/20 border-white/10 focus-visible:ring-primary h-12" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
