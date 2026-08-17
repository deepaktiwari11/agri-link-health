import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or Register — KrishiSetu" },
      {
        name: "description",
        content: "Create a farmer or merchant account to list crops, contact sellers and scan plant leaves.",
      },
      { property: "og:title", content: "Sign in or Register — KrishiSetu" },
      { property: "og:description", content: "Join KrishiSetu as a farmer or a merchant." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  phone: z.string().trim().max(20).optional(),
  location: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("farmer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      password: fd.get("password"),
      phone: fd.get("phone") || undefined,
      location: fd.get("location") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.fullName,
          role,
          phone: parsed.data.phone ?? null,
          location: parsed.data.location ?? null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Welcome to KrishiSetu!");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try email instead.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome to KrishiSetu</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Farmers list crops at their own rate. Merchants find and buy them direct.
      </p>

      <div className="card-surface mt-8 p-6">
        <Tabs defaultValue="signup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Register</TabsTrigger>
            <TabsTrigger value="signin">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label>I am a</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["farmer", "merchant"] as AppRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                        role === r
                          ? "border-primary bg-secondary font-medium text-secondary-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required maxLength={80} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" name="email" type="email" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" name="password" type="password" required minLength={6} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" maxLength={20} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="location">Village / City</Label>
                  <Input id="location" name="location" maxLength={120} className="mt-1.5" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : `Register as ${role}`}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" name="email" type="email" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="si-password">Password</Label>
                <Input id="si-password" name="password" type="password" required className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
