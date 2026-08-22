import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowLeft, KeyRound, Mail } from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AuthPage = () => {
  const { session, userRole, loading: authLoading } = useAuth();
  const { t } = useSettings();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success("Signed in successfully"); setLoading(false);
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setResetSent(true);
    toast.success(`Password reset link sent to ${cleanEmail}`);
    setLoading(false);
  };

  if (authLoading) return (<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">{t("common.loading")}</p></div>);
  if (session) { return <Navigate to={userRole === "supervisor" ? "/admin" : "/"} replace />; }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <Card className="w-full max-w-md border border-white/20 bg-background/10 backdrop-blur-sm shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <CardTitle className="text-2xl font-heading text-white">
            {mode === "login" ? t("auth.title") : t("auth.forgotTitle")}
          </CardTitle>
          <CardDescription className="text-white/80">
            {mode === "login" ? t("auth.desc") : t("auth.forgotDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label className="text-white">{t("auth.email")}</Label>
                <Input
                  className="bg-background/70 border-border/60 text-slate-900"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    className="bg-background/70 border-border/60 text-slate-900"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setResetSent(false); }}
                    className="text-xs text-white/80 hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4" autoComplete="off">
              {resetSent ? (
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-3 text-xs text-center text-white space-y-1">
                  <Mail className="h-6 w-6 mx-auto text-emerald-300 mb-1" />
                  <p className="font-semibold text-sm">Reset Link Sent</p>
                  <p className="text-white/80">
                    We have sent a password reset link to <strong className="text-white">{email}</strong>. Please check your email inbox.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-white">{t("auth.email")}</Label>
                  <Input
                    className="bg-background/70 border-border/60 text-slate-900"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="off"
                  />
                </div>
              )}

              {!resetSent ? (
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <KeyRound className="h-4 w-4" />
                  {loading ? t("auth.sending") : t("auth.sendResetLink")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => setResetSent(false)}
                >
                  Resend Link
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/90 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                onClick={() => { setMode("login"); setResetSent(false); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.backToSignIn")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
