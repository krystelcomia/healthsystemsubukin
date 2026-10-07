import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, Mail, ExternalLink, LockKeyhole } from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";

const ResetPassword = () => {
  const { t, language, darkMode } = useSettings();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setStep(2);
    } else {
      const lastEmail = localStorage.getItem("bhw_last_reset_email");
      if (lastEmail) {
        setEmail(lastEmail);
      }
    }
  }, [searchParams]);

  // Step 1: Send verification code to user's Gmail via EmailJS by looking up Full Name & Username
  const handleSendResetCode = async () => {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();

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
    setStep(2);
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

    setVerifiedCode(cleanCode);
    setStep(3);
    toast.success(
      language === "tl"
        ? "Matagumpay na na-verify ang code! Maaari mo nang ilagay ang iyong bagong password."
        : "Code verified successfully! You may now enter your new password.",
      { duration: 6000 }
    );
    setLoading(false);
  };

  // Step 3: Commit new password to database after code verification
  const handleReset = async () => {
    const cleanEmail = email.trim();
    const cleanCode = verifiedCode.trim() || verificationCode.trim();

    if (!cleanEmail) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang iyong email address" : "Please enter your email address");
      return;
    }
    if (!cleanCode) {
      toast.error("Verification code missing. Please verify your code first.");
      setStep(2);
      return;
    }
    if (password.length < 8) {
      toast.error(language === "tl" ? "Ang password ay dapat hindi bababa sa 8 karakter" : "Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error(language === "tl" ? "Ang password ay dapat may hindi bababa sa isang malaking titik (A-Z)" : "Password must include at least one uppercase letter (A-Z)");
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error(language === "tl" ? "Ang password ay dapat may hindi bababa sa isang numero (0-9)" : "Password must include at least one number (0-9)");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(language === "tl" ? "Hindi nagtutugma ang mga password" : "Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await (supabase.auth as any).resetUserPassword(cleanEmail, password, cleanCode);
    if (error) {
      toast.error(error.message, { duration: 6000 });
    } else {
      toast.success(
        language === "tl"
          ? "Matagumpay na na-update ang password! Mangyaring mag-sign in."
          : "Password updated successfully! Please sign in with your new password.",
        { duration: 7000 }
      );
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Clear background overlay without blur so the background photo of the barangay hall remains sharp and visible */}
      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-sm sm:max-w-md border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden transition-all">
        <CardHeader className="text-center space-y-3 pt-8 pb-3 px-6 sm:px-8">
          <div className="relative mx-auto inline-block">
            <img
              src={barangayLogo}
              alt="Barangay Subukin Logo"
              className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-white/60 dark:ring-slate-800/80"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-heading font-extrabold text-slate-800 dark:text-white tracking-tight">
              {t("reset.title")}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
              {t("reset.desc")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8 pt-2">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendResetCode(); }} className="space-y-4" autoComplete="off">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                    {language === "tl" ? "Buong Pangalan ng Manggagawa" : "Worker's Full Name"}
                  </Label>
                  <Input
                    className="h-11 text-xs font-medium bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Cristeta R. Lanuza"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                    {language === "tl" ? "Username ng Manggagawa" : "Worker's Username"}
                  </Label>
                  <Input
                    className="h-11 text-xs font-medium bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cristeta"
                    autoComplete="off"
                  />
                </div>

                <p className="text-[11px] leading-relaxed pt-1 text-slate-600 dark:text-slate-300 font-normal">
                  {language === "tl"
                    ? "Ilagay lamang ang iyong buong pangalan at username. Ang 6-digit reset code ay direktang ipapadala sa iyong nakarehistrong email address."
                    : "Enter your registered worker full name and username. The 6-digit reset verification code will be dispatched directly to your email inbox."}
                </p>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 font-bold text-sm rounded-xl shadow-md" disabled={loading}>
                <KeyRound className="h-4 w-4" />
                {loading ? t("auth.sending") : (language === "tl" ? "Ipadala ang Reset Code sa Email" : "Send Reset Code via Email")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                onClick={() => navigate("/auth")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.backToSignIn")}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-4" autoComplete="off">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                  <Mail className="h-4 w-4" />
                  <span>{language === "tl" ? "Naipadala ang Code sa Gmail:" : "Verification Code Sent to Gmail:"}</span>
                </div>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs break-all bg-white dark:bg-slate-900 p-2 rounded-md border border-emerald-200 dark:border-emerald-800">{email}</p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {language === "tl"
                    ? "Ang 6-digit verification code ay ipinadala sa iyong Gmail inbox. Mangyaring buksan ang email sa iyong Primary Inbox o Spam folder, at ilagay ang code sa ibaba."
                    : "The 6-digit verification code has been dispatched to your Gmail. Please check your Primary inbox or Spam folder, retrieve the code, and enter it below."}
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] px-2.5 gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg shadow-xs"
                    onClick={() => window.open("https://mail.google.com/mail/u/0/#inbox", "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {language === "tl" ? "Primary Inbox" : "Primary Inbox"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] px-2.5 gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg shadow-xs"
                    onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email)}`, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {language === "tl" ? "Suriin ang Lahat ng Mail" : "Search All Mail"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                    {language === "tl" ? "6-Digit Verification Code (Galing sa Gmail) *" : "6-Digit Verification Code (From Gmail) *"}
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:text-primary/80 underline font-semibold cursor-pointer"
                    onClick={handleSendResetCode}
                    disabled={loading}
                  >
                    {language === "tl" ? "Muling Ipadala (Resend)" : "Resend Code"}
                  </button>
                </div>
                <Input
                  className="font-mono tracking-widest text-center text-xl font-extrabold h-12 bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••••"
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === "tl"
                    ? "Kailangang ma-verify ang tamang code bago payagang magpalit ng password."
                    : "The correct code must be verified before new password fields are unlocked."}
                </p>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md" disabled={loading}>
                <ShieldCheck className="h-4 w-4" />
                {loading ? (language === "tl" ? "Sinusuri ang Code..." : "Verifying Code...") : (language === "tl" ? "I-verify ang Code" : "Verify Code")}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-9 text-xs rounded-xl transition-colors"
                  onClick={() => { setStep(1); setVerificationCode(""); }}
                >
                  {language === "tl" ? "Palitan ang Email" : "Change Email"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs rounded-xl transition-colors"
                  onClick={() => navigate("/auth")}
                >
                  {t("auth.backToSignIn")}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={(e) => { e.preventDefault(); handleReset(); }} className="space-y-4" autoComplete="off">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === "tl" ? "Code Na-verify Nang Matagumpay!" : "Code Verified Successfully!"}</span>
                </div>
                <p className="font-mono text-slate-900 dark:text-slate-100 text-xs break-all bg-white dark:bg-slate-900 p-1.5 rounded border border-emerald-200 dark:border-emerald-800">{email}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {language === "tl"
                    ? "Maaari mo nang itakda ang iyong bagong password sa ibaba."
                    : "You may now set and confirm your new account password below."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">{t("reset.newPassword")}</Label>
                <div className="relative">
                  <Input
                    className="h-11 text-sm pr-10 bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (Min 8 characters)"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-0.5"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">{t("reset.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    className="h-11 text-sm pr-10 bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-0.5"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md" disabled={loading}>
                <LockKeyhole className="h-4 w-4" />
                {loading ? t("reset.updating") : (language === "tl" ? "I-save ang Bagong Password" : "Save New Password")}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs rounded-xl transition-colors"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("auth.backToSignIn")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
