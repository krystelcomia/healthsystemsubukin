import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowLeft, KeyRound, Mail, CheckCircle2, ExternalLink, ShieldCheck, LockKeyhole } from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AuthPage = () => {
  const { session, userRole, loading: authLoading } = useAuth();
  const { t, language } = useSettings();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forgot password state
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotFullName, setForgotFullName] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const OFFICIAL_SYSTEM_ACCOUNTS: Record<string, { username: string; fullName: string; role: string; defaultPassword?: string }> = {
    "cristetalanuzaadmin@gmail.com": { username: "Cristeta", fullName: "Cristeta R. Lanuza", role: "supervisor", defaultPassword: "adminsubukincristeta2026" },
    "evelynilaobhw@gmail.com": { username: "Evelyn", fullName: "Evelyn T. Ilao", role: "bhw", defaultPassword: "bhwsubukinevelyn2026" },
    "ceciliabenosabhw@gmail.com": { username: "Cecilia", fullName: "Cecilia G. Benosa", role: "bhw", defaultPassword: "bhwsubukincecilia2026" },
    "merlitaalonzobhw@gmail.com": { username: "Merlita", fullName: "Merlita R. Alonzo", role: "bhw", defaultPassword: "bhwsubukinmerlita2026" },
    "suzettelopezbhw@gmail.com": { username: "Suzette", fullName: "Suzette B. Lopez", role: "bhw", defaultPassword: "bhwsubukinsuzette2026" },
    "amelitasayatbhw@gmail.com": { username: "Amelita", fullName: "Amelita R. Sayat", role: "bhw", defaultPassword: "bhwsubukinamelita2026" },
    "wilmatanyagbhw@gmail.com": { username: "Wilma", fullName: "Wilma D. Tanyag", role: "bhw", defaultPassword: "bhwsubukinwilma2026" },
    "nenitadimaculanganbhw@gmail.com": { username: "Nenita", fullName: "Nenita M. Dimaculangan", role: "bhw", defaultPassword: "bhwsubukinnenita2026" },
    "mercyabanillabhw@gmail.com": { username: "Mercy", fullName: "Mercy O. Abanilla", role: "bhw", defaultPassword: "bhwsubukinmercy2026" },
    "renchieilaobhw@gmail.com": { username: "Renchie", fullName: "Renchie V. Ilao", role: "bhw", defaultPassword: "bhwsubukinrenchie2026" },
    "renalynlaurantebhw@gmail.com": { username: "Renalyn", fullName: "Renalyn D. Laurante", role: "bhw", defaultPassword: "bhwsubukinrenalyn2026" },
    "maribelabayonbns@gmail.com": { username: "Maribel", fullName: "Maribel M. Abayon", role: "bns", defaultPassword: "bnssubukinmaribel2026" },
    "maryjanelandichomidwife@gmail.com": { username: "Mary Jane", fullName: "Mary Jane Landicho", role: "midwife", defaultPassword: "midwifesubukinmaryjane2026" },
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang email at password" : "Please enter email and password");
      return;
    }
    setLoading(true);
    const cleanEmail = email.trim();
    let { data: signInData, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    // If account doesn't exist yet in Supabase Auth, check if it's an official staff account and auto-provision it
    if (error) {
      const emailKey = cleanEmail.toLowerCase();
      const official = OFFICIAL_SYSTEM_ACCOUNTS[emailKey];
      const isNotFoundOrInvalid = 
        error.message.toLowerCase().includes("user not found") || 
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("invalid credentials");

      if (official && isNotFoundOrInvalid) {
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: official.fullName,
                username: official.username,
              }
            }
          });

          if (!signUpError && signUpData.user) {
            const userId = signUpData.user.id;

            // Set localStorage profile cache
            localStorage.setItem("logged_in_username", official.username);
            localStorage.setItem("logged_in_fullname", official.fullName);

            // Upsert role & profile
            try {
              await supabase.from("user_roles").upsert(
                { user_id: userId, role: official.role },
                { onConflict: "user_id" }
              );
              await supabase.from("profiles").upsert(
                { user_id: userId, username: official.username, full_name: official.fullName },
                { onConflict: "user_id" }
              );
              if (official.role !== "midwife") {
                await supabase.from("bhw_workers").update({ user_id: userId }).eq("gmail", cleanEmail);
              }
            } catch (setupErr) {
              console.warn("Role setup error on initial provisioning:", setupErr);
            }

            if (signUpData.session) {
              toast.success(language === "tl" ? "Matagumpay na nakapag-sign in" : "Signed in successfully");
              setLoading(false);
              return;
            }

            // Retry sign in after signup
            const retryRes = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
            if (!retryRes.error) {
              toast.success(language === "tl" ? "Matagumpay na nakapag-sign in" : "Signed in successfully");
              setLoading(false);
              return;
            }
          }
        } catch (autoErr) {
          console.error("Auto provisioning error:", autoErr);
        }
      }

      toast.error(error.message, { duration: 7000 });
      setLoading(false);
      return;
    }

    toast.success(language === "tl" ? "Matagumpay na nakapag-sign in" : "Signed in successfully");
    setLoading(false);
  };

  // Step 1: Send verification code to user's Gmail via EmailJS by looking up Full Name & Username
  const handleSendResetCode = async () => {
    const cleanFullName = forgotFullName.trim();
    const cleanUsername = forgotUsername.trim();

    if (!cleanFullName) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang iyong Buong Pangalan" : "Please enter the worker's Full Name");
      return;
    }
    if (!cleanUsername) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang iyong Username" : "Please enter the worker's Username");
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase.auth as any).resetPasswordForEmail({
      fullName: cleanFullName,
      username: cleanUsername,
      email: email.trim(),
    }, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      toast.error(error.message, { duration: 6000 });
      setLoading(false);
      return;
    }

    const resolvedEmail = data?.email || email.trim();
    setEmail(resolvedEmail);
    setVerificationCode("");
    setVerifiedCode("");
    setForgotStep(2);
    toast.success(
      language === "tl" 
        ? `Ang 6-digit verification code ay ipinadala sa iyong nakarehistrong Gmail inbox (${resolvedEmail}). Mangyaring tingnan ang iyong inbox.`
        : `A 6-digit verification code has been sent to your registered Gmail inbox (${resolvedEmail}). Please check your inbox.`,
      { duration: 8000 }
    );
    setLoading(false);
  };

  // Step 2: Strictly validate verification code before allowing password input
  const handleVerifyCode = async () => {
    const cleanEmail = email.trim();
    const cleanCode = verificationCode.trim();

    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    if (!cleanCode) {
      toast.error(
        language === "tl" 
          ? "Mangyaring ilagay ang 6-digit verification code na natanggap sa iyong Gmail" 
          : "Please enter the 6-digit verification code received in your Gmail"
      );
      return;
    }
    if (cleanCode.length !== 6) {
      toast.error(
        language === "tl" 
          ? "Ang verification code ay dapat 6 na numero" 
          : "The verification code must be exactly 6 digits"
      );
      return;
    }

    setLoading(true);
    const verifyRes = await (supabase.auth as any).verifyResetCode(cleanEmail, cleanCode);
    if (verifyRes?.error) {
      toast.error(
        language === "tl"
          ? "Maling verification code. Mangyaring suriin ang code sa iyong Gmail inbox at subukan muli."
          : "Incorrect verification code. Please check the code sent to your Gmail inbox and try again.",
        { duration: 6000 }
      );
      setLoading(false);
      return;
    }

    // Code is 100% verified! Move to Step 3 (Set New Password)
    setVerifiedCode(cleanCode);
    setForgotStep(3);
    toast.success(
      language === "tl"
        ? "Matagumpay na na-verify ang code! Maaari mo nang ilagay ang iyong bagong password."
        : "Code verified successfully! You may now enter your new password.",
      { duration: 6000 }
    );
    setLoading(false);
  };

  // Step 3: Commit new password to database after code verification
  const handleConfirmPasswordReset = async () => {
    const cleanEmail = email.trim();
    const cleanCode = verifiedCode.trim() || verificationCode.trim();

    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    if (!cleanCode) {
      toast.error("Verification code missing. Please verify your code first.");
      setForgotStep(2);
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error(language === "tl" ? "Ang password ay dapat hindi bababa sa 8 karakter" : "Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error(language === "tl" ? "Ang password ay dapat may hindi bababa sa isang malaking titik (A-Z)" : "Password must include at least one uppercase letter (A-Z)");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error(language === "tl" ? "Ang password ay dapat may hindi bababa sa isang numero (0-9)" : "Password must include at least one number (0-9)");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === "tl" ? "Hindi nagtutugma ang mga password" : "Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await (supabase.auth as any).resetUserPassword(cleanEmail, newPassword, cleanCode);

    if (error) {
      toast.error(error.message, { duration: 6000 });
      setLoading(false);
      return;
    }

    toast.success(
      language === "tl"
        ? "Matagumpay na na-update ang password! Maaari ka nang mag-sign in gamit ang bagong password."
        : "Password reset successful! You can now log in with your new password.",
      { duration: 7000 }
    );

    // Switch back to login with email ready
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setVerifiedCode("");
    setForgotStep(1);
    setMode("login");
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
                    onClick={() => { setMode("forgot"); setForgotStep(1); }}
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
            <div className="space-y-4">
              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 1: Enter Registered Email Address
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); handleSendResetCode(); }} className="space-y-4" autoComplete="off">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-white text-xs font-semibold">{language === "tl" ? "Buong Pangalan ng Manggagawa" : "Worker's Full Name"}</Label>
                      <Input
                        className="bg-background/90 border-border/60 text-foreground h-10 text-xs font-medium"
                        type="text"
                        value={forgotFullName}
                        onChange={(e) => setForgotFullName(e.target.value)}
                        placeholder="e.g. Cristeta R. Lanuza"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-white text-xs font-semibold">{language === "tl" ? "Username ng Manggagawa" : "Worker's Username"}</Label>
                      <Input
                        className="bg-background/90 border-border/60 text-foreground h-10 text-xs font-medium"
                        type="text"
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="e.g. cristeta"
                        autoComplete="off"
                      />
                    </div>

                    <p className="text-[11px] text-white/80 leading-relaxed pt-1">
                      {language === "tl" 
                        ? "Ilagay lamang ang iyong buong pangalan at username. Ang 6-digit reset verification code ay ipapadala sa iyong nakarehistrong email address."
                        : "Enter your registered worker full name and username. The 6-digit reset verification code will be dispatched directly to your email inbox."}
                    </p>
                  </div>

                  <Button type="submit" className="w-full gap-2 font-bold" disabled={loading}>
                    <KeyRound className="h-4 w-4" />
                    {loading ? t("auth.sending") : (language === "tl" ? "Ipadala ang Reset Code sa Email" : "Send Reset Code via Email")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-white/90 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                    onClick={() => { setMode("login"); setForgotStep(1); }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("auth.backToSignIn")}
                  </Button>
                </form>
              )}

              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 2: Enter & Validate Verification Code
                  (Password fields are completely hidden until validated!)
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-4" autoComplete="off">
                  {/* Secure Informational Guidance Box */}
                  <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3.5 text-xs text-white space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <Mail className="h-4 w-4" />
                      <span>{language === "tl" ? "Naipadala ang Code sa Gmail:" : "Verification Code Sent to Gmail:"}</span>
                    </div>
                    <p className="font-mono font-bold text-white text-xs break-all bg-black/20 p-2 rounded-md border border-white/10">{email}</p>
                    <p className="text-[11px] text-white/80 leading-relaxed">
                      {language === "tl" 
                        ? "Ang 6-digit verification code ay ipinadala sa iyong Gmail inbox. Mangyaring buksan ang email sa iyong Primary Inbox o Spam folder, at ilagay ang code sa ibaba."
                        : "The 6-digit verification code has been dispatched to your Gmail. Please check your Primary inbox or Spam folder, retrieve the code, and enter it below."}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11px] px-2.5 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => window.open("https://mail.google.com/mail/u/0/#inbox", "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {language === "tl" ? "Primary Inbox" : "Primary Inbox"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11px] px-2.5 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email)}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {language === "tl" ? "Suriin ang Lahat ng Mail" : "Search All Mail"}
                      </Button>
                    </div>
                  </div>

                  {/* 6-Digit Code Input - MUST BE ENTERED MANUALLY FROM GMAIL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-xs font-semibold">
                        {language === "tl" ? "6-Digit Verification Code (Galing sa Gmail) *" : "6-Digit Verification Code (From Gmail) *"}
                      </Label>
                      <button
                        type="button"
                        className="text-[11px] text-emerald-300 hover:text-emerald-200 underline font-medium cursor-pointer"
                        onClick={handleSendResetCode}
                        disabled={loading}
                      >
                        {language === "tl" ? "Muling Ipadala (Resend)" : "Resend Code"}
                      </button>
                    </div>
                    <Input
                      className="bg-background/70 border-border/60 text-slate-900 font-mono tracking-widest text-center text-lg font-extrabold placeholder:font-normal placeholder:tracking-normal h-11"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="••••••"
                      autoFocus
                    />
                    <p className="text-[10px] text-white/70">
                      {language === "tl" 
                        ? "Kailangang ma-verify ang tamang code bago payagang magpalit ng password."
                        : "The correct code must be verified before new password fields are unlocked."}
                    </p>
                  </div>

                  <Button type="submit" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={loading}>
                    <ShieldCheck className="h-4 w-4" />
                    {loading ? (language === "tl" ? "Sinusuri ang Code..." : "Verifying Code...") : (language === "tl" ? "I-verify ang Code" : "Verify Code")}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs"
                      onClick={() => { setForgotStep(1); setVerificationCode(""); }}
                    >
                      {language === "tl" ? "Palitan ang Email" : "Change Email"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 text-white/90 hover:text-white hover:bg-white/10 text-xs"
                      onClick={() => { setMode("login"); setForgotStep(1); setVerificationCode(""); }}
                    >
                      {t("auth.backToSignIn")}
                    </Button>
                  </div>
                </form>
              )}

              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 3: Set New Password
                  (Only accessible AFTER code is verified!)
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 3 && (
                <form onSubmit={(e) => { e.preventDefault(); handleConfirmPasswordReset(); }} className="space-y-4" autoComplete="off">
                  {/* Verified Confirmation Badge */}
                  <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-xs text-white space-y-1">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{language === "tl" ? "Code Na-verify Nang Matagumpay!" : "Code Verified Successfully!"}</span>
                    </div>
                    <p className="font-mono text-white/90 text-xs break-all">{email}</p>
                    <p className="text-[11px] text-white/80">
                      {language === "tl" 
                        ? "Maaari mo nang itakda ang iyong bagong password sa ibaba."
                        : "You may now set and confirm your new account password below."}
                    </p>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs font-semibold">{t("reset.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        className="bg-background/70 border-border/60 text-slate-900"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="•••••••• (Min 6 characters)"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs font-semibold">{t("reset.confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        className="bg-background/70 border-border/60 text-slate-900"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={loading}>
                    <LockKeyhole className="h-4 w-4" />
                    {loading ? t("reset.updating") : (language === "tl" ? "I-save ang Bagong Password" : "Save New Password")}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-white/90 hover:text-white hover:bg-white/10 text-xs"
                      onClick={() => { setMode("login"); setForgotStep(1); setVerificationCode(""); setVerifiedCode(""); }}
                    >
                      {t("auth.backToSignIn")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;



