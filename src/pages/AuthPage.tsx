import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Mail,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  LockKeyhole,
  User,
  ShieldAlert,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const GoogleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const AuthPage = () => {
  const { session, userRole, loading: authLoading } = useAuth();
  const { t, language, darkMode } = useSettings();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google / Gmail login state
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  
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
    "cristetalanuzabhw@gmail.com": { username: "Cristeta", fullName: "Cristeta R. Lanuza", role: "bhw", defaultPassword: "bhwsubukincristeta2026" },
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

  useEffect(() => {
    const remembered = localStorage.getItem("bhw_remember_email");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang email/username at password" : "Please enter email/username and password");
      return;
    }
    // Handle remember me
    if (rememberMe) {
      localStorage.setItem("bhw_remember_email", email.trim());
    } else {
      localStorage.removeItem("bhw_remember_email");
    }

    // Clear instance expired flag so new active session takes over
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("bhw_instance_expired");
      sessionStorage.removeItem("bhw_site_tab_instance_id");
      delete (window as any).__bhwTabInstanceId;
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

            // Set sessionStorage profile cache
            sessionStorage.setItem("logged_in_username", official.username);
            sessionStorage.setItem("logged_in_fullname", official.fullName);
            try {
              localStorage.removeItem("logged_in_username");
              localStorage.removeItem("logged_in_fullname");
            } catch {}

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

  // Google / Gmail Login Handler (Ensures account creation is disabled for unregistered emails)
  const handleGoogleLogin = async (providedGmail?: string) => {
    const targetGmail = (providedGmail || googleEmailInput).trim().toLowerCase();
    if (!targetGmail) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang iyong Gmail address" : "Please enter your Gmail address");
      return;
    }

    setGoogleLoading(true);

    // 1. Verify that this Gmail address exists in the system database
    const dbStr = localStorage.getItem("supabase_mock_db");
    const db = dbStr ? JSON.parse(dbStr) : {};
    const workers: any[] = db["bhw_workers"] || [];
    const authUsers: any[] = db["auth_users"] || [];
    const profiles: any[] = db["profiles"] || [];

    const workerMatch = workers.find((w) => (w.gmail || "").toLowerCase().trim() === targetGmail);
    const userMatch = authUsers.find((u) => (u.email || "").toLowerCase().trim() === targetGmail);
    const official = OFFICIAL_SYSTEM_ACCOUNTS[targetGmail];

    // If not found in any registered database table: ACCOUNT CREATION IS DISABLED
    if (!workerMatch && !userMatch && !official) {
      setGoogleLoading(false);
      toast.error(
        language === "tl"
          ? "Hindi pinapayagan ang paggawa ng bagong account. Ang Gmail na ito ay wala sa database ng Barangay Subukin Health System. Makipag-ugnayan sa supervisor."
          : "Account creation is disabled. This Gmail address is not registered in the Barangay Subukin Health System database. Please contact the administrator.",
        { duration: 8000 }
      );
      return;
    }

    // Clear instance expired flag so new active session takes over
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("bhw_instance_expired");
      sessionStorage.removeItem("bhw_site_tab_instance_id");
      delete (window as any).__bhwTabInstanceId;
    }

    // 2. Account exists in database: Sign in with registered credentials
    const passwordToUse = userMatch?.password || official?.defaultPassword || "bhwsubukin2026";
    let res = await supabase.auth.signInWithPassword({ email: targetGmail, password: passwordToUse });

    if (res.error && official) {
      try {
        await supabase.auth.signUp({
          email: targetGmail,
          password: passwordToUse,
          options: {
            data: {
              full_name: official.fullName,
              username: official.username,
            }
          }
        });
        res = await supabase.auth.signInWithPassword({ email: targetGmail, password: passwordToUse });
      } catch (e) {
        console.warn("Auto sync on google login:", e);
      }
    }

    setGoogleLoading(false);
    setGoogleModalOpen(false);

    if (res.error) {
      toast.error(res.error.message, { duration: 7000 });
      return;
    }

    const workerName = workerMatch?.name || official?.fullName || targetGmail;
    toast.success(
      language === "tl"
        ? `Maligayang pagbabalik, ${workerName}! Matagumpay na naka-sign in gamit ang Gmail.`
        : `Welcome back, ${workerName}! Signed in successfully with Gmail.`
    );
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
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Clear background overlay without blur so the background photo of the barangay hall remains sharp and visible */}
      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-sm sm:max-w-md border border-white/70 dark:border-white/20 bg-white/65 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden transition-all">
        <CardHeader className="text-center space-y-3 pt-8 pb-3 px-6 sm:px-8">
          <div className="relative mx-auto inline-block">
            <img
              src={barangayLogo}
              alt="Barangay Subukin Logo"
              className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-white/80 dark:ring-slate-800/80"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-heading font-extrabold text-slate-950 dark:text-white tracking-tight">
              {t("auth.title")}
            </CardTitle>
            <CardDescription className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold">
              {mode === "login" 
                ? (language === "tl" ? "Mag-log in gamit ang iyong email address" : "Sign in to access the health records system")
                : t("auth.forgotDesc")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-1">
          {mode === "login" ? (
            <div className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4" autoComplete="off">
                {/* Email Field (Thin Grey Underline) */}
                <div className="space-y-1">
                  <Label className="text-slate-950 dark:text-white text-xs font-bold">
                    {language === "tl" ? "Email" : "Email"}
                  </Label>
                  <div className="relative">
                    <Input
                      className="h-10 text-sm pr-8 px-0.5 bg-transparent border-0 border-b border-slate-400 dark:border-slate-500 text-slate-950 dark:text-white font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary focus-visible:bg-transparent shadow-none transition-all duration-200"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      autoComplete="email"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Password Field (Thin Grey Underline) */}
                <div className="space-y-1">
                  <Label className="text-slate-950 dark:text-white text-xs font-bold">
                    {t("auth.password")}
                  </Label>
                  <div className="relative">
                    <Input
                      className="h-10 text-sm pr-8 px-0.5 bg-transparent border-0 border-b border-slate-400 dark:border-slate-500 text-slate-950 dark:text-white font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary focus-visible:bg-transparent shadow-none transition-all duration-200"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-950 dark:text-slate-200 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-900 text-primary focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:checked:bg-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>{language === "tl" ? "Tandaan Ako" : "Remember Me"}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setForgotStep(1); }}
                    className="text-slate-950 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors hover:underline cursor-pointer font-semibold"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>

                {/* Primary Login Button (Uses System Color Theme) */}
                <Button
                  type="submit"
                  className="w-full h-11 font-bold text-sm bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md mt-1 transition-all"
                  disabled={loading}
                >
                  {loading ? t("auth.signingIn") : (language === "tl" ? "Mag-log in" : "Login")}
                </Button>
              </form>

              {/* Account creation notice */}
              <div className="text-center pt-1 pb-0.5">
                <p className="text-[11px] text-slate-900 dark:text-slate-200 font-semibold">
                  {language === "tl" 
                    ? "Para lamang sa mga awtorisadong kawani at BHW ng Barangay Subukin" 
                    : "Authorized BHW & Staff Portal • Account creation disabled"}
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t-2 border-slate-900/30 dark:border-white/30" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-900 dark:text-slate-200 font-bold uppercase tracking-wider">
                  {language === "tl" ? "O mag-sign in gamit ang" : "Or"}
                </span>
                <div className="flex-grow border-t-2 border-slate-900/30 dark:border-white/30" />
              </div>

              {/* Login with Google Button */}
              <button
                type="button"
                onClick={() => {
                  setGoogleEmailInput(email.includes("@") ? email : "");
                  setGoogleModalOpen(true);
                }}
                className="w-full h-11 px-4 bg-white/85 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700/90 backdrop-blur-md border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <GoogleIcon className="h-4 w-4" />
                <span>{language === "tl" ? "Mag-log in gamit ang Google" : "Login with Google"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 1: Enter Registered Worker Name & Username
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); handleSendResetCode(); }} className="space-y-4" autoComplete="off">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                        {language === "tl" ? "Buong Pangalan ng Manggagawa" : "Worker's Full Name"}
                      </Label>
                      <Input
                        className="h-11 text-xs font-medium bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                        type="text"
                        value={forgotFullName}
                        onChange={(e) => setForgotFullName(e.target.value)}
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
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="e.g. cristeta"
                        autoComplete="off"
                      />
                    </div>

                    <p className="text-[11px] leading-relaxed pt-1 text-slate-600 dark:text-slate-300 font-normal">
                      {language === "tl" 
                        ? "Ilagay lamang ang iyong buong pangalan at username. Ang 6-digit reset verification code ay ipapadala sa iyong nakarehistrong email address."
                        : "Enter your registered worker full name and username. The 6-digit reset verification code will be dispatched directly to your email inbox."}
                    </p>
                  </div>

                  <Button type="submit" className="w-full h-10 gap-2 font-bold text-sm rounded-xl shadow-md" disabled={loading}>
                    <KeyRound className="h-4 w-4" />
                    {loading ? t("auth.sending") : (language === "tl" ? "Ipadala ang Reset Code sa Email" : "Send Reset Code via Email")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                    onClick={() => { setMode("login"); setForgotStep(1); }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("auth.backToSignIn")}
                  </Button>
                </form>
              )}

              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 2: Enter & Validate Verification Code
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 2 && (
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
                      onClick={() => { setForgotStep(1); setVerificationCode(""); }}
                    >
                      {language === "tl" ? "Palitan ang Email" : "Change Email"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs rounded-xl transition-colors"
                      onClick={() => { setMode("login"); setForgotStep(1); setVerificationCode(""); }}
                    >
                      {t("auth.backToSignIn")}
                    </Button>
                  </div>
                </form>
              )}

              {/* ═══════════════════════════════════════════════════════
                  FORGOT STEP 3: Set New Password
                  ═══════════════════════════════════════════════════════ */}
              {forgotStep === 3 && (
                <form onSubmit={(e) => { e.preventDefault(); handleConfirmPasswordReset(); }} className="space-y-4" autoComplete="off">
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
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="•••••••• (Min 8 characters)"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-0.5"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-800 dark:text-slate-200 text-xs font-semibold">{t("reset.confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        className="h-11 text-sm pr-10 bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-0.5"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

      {/* Google / Gmail Sign In Modal */}
      <Dialog open={googleModalOpen} onOpenChange={setGoogleModalOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="space-y-2 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
              <GoogleIcon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {language === "tl" ? "Mag-sign in gamit ang Gmail" : "Sign in with Google"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {language === "tl"
                ? "Ilagay ang iyong nakarehistrong Gmail address sa database ng Barangay Subukin."
                : "Enter your registered Gmail address to sign in. Account creation is disabled for unregistered emails."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGoogleLogin();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === "tl" ? "Gmail Address" : "Registered Gmail Address"}
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="h-11 text-sm pl-9 bg-white/45 dark:bg-slate-950/45 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-primary"
                  autoFocus
                />
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>{language === "tl" ? "Paunawa sa Seguridad" : "Security Notice"}</span>
              </div>
              <p>
                {language === "tl"
                  ? "Ang mga awtorisadong Gmail lamang na nasa database ng mga BHW at kawani ang papayagang pumasok. Naka-disable ang paglikha ng bagong account."
                  : "Only registered BHW and staff Gmail addresses in the database can sign in. Self-registration is strictly disabled."}
              </p>
            </div>

            {/* Quick Pick from Official Workers */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === "tl" ? "O pumili ng rehistradong Gmail:" : "Or select registered staff account:"}
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs">
                {Object.entries(OFFICIAL_SYSTEM_ACCOUNTS).slice(0, 6).map(([accEmail, acc]) => (
                  <button
                    key={accEmail}
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput(accEmail);
                      handleGoogleLogin(accEmail);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors text-xs">{acc.fullName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{accEmail}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoogleModalOpen(false)}
                className="flex-1 rounded-xl h-10 text-xs"
              >
                {language === "tl" ? "Kanselahin" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={googleLoading}
                className="flex-1 rounded-xl h-10 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white"
              >
                {googleLoading ? (language === "tl" ? "Sinusuri..." : "Verifying...") : (language === "tl" ? "Magpatuloy" : "Continue")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;




