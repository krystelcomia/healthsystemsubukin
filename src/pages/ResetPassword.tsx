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
  const { t, language } = useSettings();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
        setStep(2);
      }
    }
  }, [searchParams]);

  // Step 1: Send verification code to user's Gmail via EmailJS
  const handleSendResetCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang iyong email address" : "Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await (supabase.auth as any).resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message, { duration: 6000 });
      setLoading(false);
      return;
    }

    setVerificationCode("");
    setVerifiedCode("");
    setStep(2);
    toast.success(
      language === "tl"
        ? `Ang 6-digit verification code ay ipinadala sa iyong Gmail (${cleanEmail}). Mangyaring tingnan ang iyong inbox.`
        : `A 6-digit verification code has been sent to your Gmail (${cleanEmail}). Please check your inbox.`,
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
    if (password.length < 6) {
      toast.error(language === "tl" ? "Ang password ay dapat hindi bababa sa 6 na karakter" : "Password must be at least 6 characters");
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
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <Card className="w-full max-w-md border border-white/20 bg-background/10 backdrop-blur-sm shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <CardTitle className="text-2xl font-heading text-white">{t("reset.title")}</CardTitle>
          <CardDescription className="text-white/80">{t("reset.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendResetCode(); }} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label className="text-white">{t("auth.email")}</Label>
                <Input
                  className="bg-background/70 border-border/60 text-slate-900"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                  autoFocus
                />
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {language === "tl"
                    ? "Ipasok ang iyong nakatalagang Gmail address. Ang 6-digit verification code ay direktang ipapadala sa iyong inbox gamit ang EmailJS."
                    : "Enter your registered Gmail address. A 6-digit verification code will be sent directly to your inbox via EmailJS."}
                </p>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <KeyRound className="h-4 w-4" />
                {loading ? t("auth.sending") : (language === "tl" ? "Ipadala ang Verification Code" : "Send Verification Code")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/90 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                onClick={() => navigate("/auth")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.backToSignIn")}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-4" autoComplete="off">
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

              {/* Troubleshooting & Security Code Assistant */}
              <div className="border border-white/15 bg-black/20 rounded-lg p-2.5 text-xs text-white/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {language === "tl" ? "Hindi Natanggap ang Email?" : "Didn't Receive the Email?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const tokens = JSON.parse(localStorage.getItem("bhw_password_reset_tokens") || "{}");
                      const token = tokens[email.trim().toLowerCase()];
                      if (token?.code) {
                        setVerificationCode(token.code);
                        toast.info(
                          language === "tl"
                            ? `Code naitala: ${token.code}. I-click ang "I-verify ang Code" upang magpatuloy.`
                            : `Security code retrieved: ${token.code}. Click "Verify Code" to proceed.`
                        );
                      } else {
                        toast.error("No active reset code found. Please click Resend Code.");
                      }
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-200 underline font-medium"
                  >
                    {language === "tl" ? "Security Assistant" : "Security Assistant"}
                  </button>
                </div>
                <p className="text-[10px] text-white/70 leading-relaxed">
                  {language === "tl"
                    ? "Suriin ang iyong Gmail Spam o Promotions tab. Kung hindi pa ito dumarating o nasa offline testing mode, gamitin ang Security Assistant upang kunin ang iyong code."
                    : "Check your Gmail Spam or Promotions folder. If not yet received or in testing mode, click Security Assistant to retrieve your active code."}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs"
                  onClick={() => { setStep(1); setVerificationCode(""); }}
                >
                  {language === "tl" ? "Palitan ang Email" : "Change Email"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 text-white/90 hover:text-white hover:bg-white/10 text-xs"
                  onClick={() => navigate("/auth")}
                >
                  {t("auth.backToSignIn")}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={(e) => { e.preventDefault(); handleReset(); }} className="space-y-4" autoComplete="off">
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

              <div className="space-y-2">
                <Label className="text-white">{t("reset.newPassword")}</Label>
                <div className="relative">
                  <Input
                    className="bg-background/70 border-border/60 text-slate-900"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
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

              <div className="space-y-2">
                <Label className="text-white">{t("reset.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    className="bg-background/70 border-border/60 text-slate-900"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={loading}>
                <LockKeyhole className="h-4 w-4" />
                {loading ? t("reset.updating") : t("reset.updatePassword")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/90 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                onClick={() => navigate("/auth")}
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

export default ResetPassword;
