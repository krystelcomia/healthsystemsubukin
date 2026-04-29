import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AuthPage = () => {
  const { session, userRole, loading: authLoading } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success("Signed in successfully"); setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { toast.error("Please enter your email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { toast.error(error.message); } else { toast.success("Password reset link sent"); setForgotMode(false); }
    setLoading(false);
  };

  if (authLoading) return (<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">{t("common.loading")}</p></div>);
  if (session) { return <Navigate to={userRole === "supervisor" ? "/admin" : "/"} replace />; }

  if (forgotMode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <Card className="w-full max-w-md border-0 bg-transparent shadow-none text-foreground">
          <CardHeader className="text-center space-y-2">
            <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-20 w-20 rounded-full object-cover" />
            <CardTitle className="text-xl font-heading">{t("auth.forgotTitle")}</CardTitle>
            <CardDescription>{t("auth.forgotDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>{t("auth.email")}</Label><Input className="bg-background/20 border-border/30 backdrop-blur-sm" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@email.com" /></div>
            <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>{loading ? t("auth.sending") : t("auth.sendResetLink")}</Button>
            <Button variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>{t("auth.backToSignIn")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <Card className="w-full max-w-md border-0 bg-transparent shadow-none text-foreground">
        <CardHeader className="text-center space-y-2">
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <CardTitle className="text-2xl font-heading">{t("auth.title")}</CardTitle>
          <CardDescription>{t("auth.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>{t("auth.email")}</Label><Input className="bg-background/20 border-border/30 backdrop-blur-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" /></div>
          <div className="space-y-2"><Label>{t("auth.password")}</Label><div className="relative"><Input className="bg-background/20 border-border/30 backdrop-blur-sm" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <Button className="w-full" onClick={handleLogin} disabled={loading}>{loading ? t("auth.signingIn") : t("auth.signIn")}</Button>
          <Button variant="link" className="w-full text-sm" onClick={() => setForgotMode(true)}>{t("auth.forgotPassword")}</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
