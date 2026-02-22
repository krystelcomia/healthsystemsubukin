import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Heart, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (role: string) => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success(`Signed in as ${role.toUpperCase()}`);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent to your email");
      setForgotMode(false);
    }
    setLoading(false);
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading">Forgot Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">Barangay Health System</CardTitle>
          <CardDescription>Sign in to access the health records system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bhw" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="bhw" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" /> BHW
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Supervisor
              </TabsTrigger>
            </TabsList>

            {["bhw", "supervisor"].map((role) => (
              <TabsContent key={role} value={role} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleLogin(role)} disabled={loading}>
                  {loading ? "Signing in..." : `Sign in as ${role === "bhw" ? "BHW" : "Supervisor"}`}
                </Button>
                <Button variant="link" className="w-full text-sm" onClick={() => setForgotMode(true)}>
                  Forgot Password?
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
