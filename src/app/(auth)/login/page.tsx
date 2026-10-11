"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/google-icon";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "magic" | "google" | null>(null);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading("password");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setLoading("magic");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` },
    });
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a sign-in link");
  }

  async function handleGoogleLogin() {
    setLoading("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to keep your streak going.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={loading !== null}
        >
          {loading === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "password" && <Loader2 className="size-4 animate-spin" />}
            Log in
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={handleMagicLink}
          disabled={loading !== null}
        >
          {loading === "magic" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Email me a magic link instead
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
