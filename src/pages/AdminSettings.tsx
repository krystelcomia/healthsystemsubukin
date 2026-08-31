import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Clock, KeyRound, Mail, CheckCircle2, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";
import { generateFullReportFolder } from "@/lib/fullReportGenerator";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const { darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t } = useSettings();

  const handleGenerateReport = async () => {
    setGenerating(true);
    setGenerationProgress("Preparing system data and reports...");
    toast.info("Generating comprehensive full reports package...");

    const res = await generateFullReportFolder((msg) => {
      setGenerationProgress(msg);
    });

    if (res.success) {
      if (res.method === "filesystem") {
        toast.success("All printable forms, weekly reports, and updates saved directly into your device folder!");
      } else {
        toast.success("Report files downloaded successfully!");
      }
    } else {
      toast.error(`Report generation: ${res.error || "Failed"}`);
    }

    setGenerating(false);
    setGenerationProgress("");
  };

  return (
    <div className="w-full space-y-6">
      <PageHeaderBanner
        icon={Settings}
        badge={language === "tl" ? "Mga Setting ng Pangangasiwa" : "Supervisory Settings"}
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />

      {/* 1. Display Settings Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("settings.display")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("settings.darkMode")}</Label>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("settings.fontSize")}</Label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t("common.small")}</SelectItem>
                <SelectItem value="medium">{t("common.medium")}</SelectItem>
                <SelectItem value="large">{t("common.large")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("settings.fontStyle")}</Label>
            <Select value={fontStyle} onValueChange={setFontStyle}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="poppins" style={{ fontFamily: "'Poppins', sans-serif" }}>Poppins</SelectItem>
                <SelectItem value="roboto" style={{ fontFamily: "'Roboto', sans-serif" }}>Roboto</SelectItem>
                <SelectItem value="montserrat" style={{ fontFamily: "'Montserrat', sans-serif" }}>Montserrat</SelectItem>
                <SelectItem value="nunito" style={{ fontFamily: "'Nunito', sans-serif" }}>Nunito</SelectItem>
                <SelectItem value="lora" style={{ fontFamily: "'Lora', serif" }}>Lora</SelectItem>
                <SelectItem value="playfair" style={{ fontFamily: "'Playfair Display', serif" }}>Playfair Display</SelectItem>
                <SelectItem value="merriweather" style={{ fontFamily: "'Merriweather', serif" }}>Merriweather</SelectItem>
                <SelectItem value="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>JetBrains Mono</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("settings.language")}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "tl")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tl">{t("common.tagalog")} (Default)</SelectItem>
                <SelectItem value="en">{t("common.english")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 2. Color Palette Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("settings.colorPalette")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t("settings.colorPaletteDesc")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COLOR_THEMES.map((theme) => {
              const active = colorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setColorTheme(theme.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-left ${active ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <span className="h-8 w-8 rounded-full border border-border shadow-sm shrink-0" style={{ background: theme.swatch }} />
                  <span className="text-sm font-medium text-foreground">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Generate Full Reports Package */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("settings.generateReport")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("settings.generateReportDesc")}</p>
          <Button onClick={handleGenerateReport} disabled={generating} className="w-full gap-2 font-semibold">
            <Download className="h-4 w-4" />
            {generating ? (language === "tl" ? "Ginagawa ang mga Ulat..." : "Generating Full Report Package...") : t("settings.generateFullReport")}
          </Button>
          {generationProgress && (
            <p className="text-xs text-primary font-medium animate-pulse">{generationProgress}</p>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Card */}
      <ResetPasswordSettingsCard />
    </div>
  );
};

const ResetPasswordSettingsCard = () => {
  const { language } = useSettings();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [registeredWorkers, setRegisteredWorkers] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  // Revealed fields after code dispatch
  const [codeSent, setCodeSent] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [workerDisplayName, setWorkerDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    try {
      const dbStr = localStorage.getItem("supabase_mock_db");
      if (dbStr) {
        const db = JSON.parse(dbStr);
        const workers = db["bhw_workers"] || [];
        setRegisteredWorkers(workers);
      }
    } catch {}
  }, []);

  const handleSendResetCode = async () => {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();

    if (!cleanFullName) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang buong pangalan ng manggagawa" : "Please enter the worker's Full Name");
      return;
    }
    if (!cleanUsername) {
      toast.error(language === "tl" ? "Mangyaring ilagay ang username" : "Please enter the worker's Username");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await (supabase.auth as any).resetPasswordForEmail({
        fullName: cleanFullName,
        username: cleanUsername,
      });

      if (error) {
        toast.error(error.message, { duration: 6000 });
      } else {
        const resolved = data?.email || "registered Gmail";
        setTargetEmail(resolved);
        setWorkerDisplayName(data?.workerName || cleanFullName);
        setCodeSent(true);
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(
          language === "tl"
            ? `Ang 6-digit verification code ay naipadala sa email (${resolved}) para kay ${cleanFullName}! Ilagay ang code at bagong password sa ibaba.`
            : `6-digit verification reset code sent to (${resolved}) for ${cleanFullName}! Enter the code and set the new password below.`,
          { duration: 8000 }
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reset code");
    }
    setSending(false);
  };

  const handleUpdatePassword = async () => {
    const cleanCode = verificationCode.trim();

    if (!cleanCode) {
      toast.error(
        language === "tl"
          ? "Mangyaring ilagay ang 6-digit verification code na natanggap sa email."
          : "Please enter the 6-digit verification code received via email."
      );
      return;
    }

    if (cleanCode.length !== 6) {
      toast.error(
        language === "tl"
          ? "Ang verification code ay dapat eksaktong 6 na numero."
          : "The verification code must be exactly 6 digits."
      );
      return;
    }

    // Strong password validation: at least 8 characters, at least 1 number, at least 1 uppercase letter
    if (!newPassword || newPassword.length < 8) {
      toast.error(
        language === "tl"
          ? "Ang bagong password ay dapat hindi bababa sa 8 karakter."
          : "The new password must be at least 8 characters long."
      );
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error(
        language === "tl"
          ? "Ang password ay dapat maglaman ng hindi bababa sa isang malaking titik (uppercase letter, A-Z)."
          : "The password must include at least one uppercase letter (A-Z)."
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error(
        language === "tl"
          ? "Ang password ay dapat maglaman ng hindi bababa sa isang numero (0-9)."
          : "The password must include at least one number (0-9)."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        language === "tl"
          ? "Hindi nagtutugma ang bagong password at kumpirmasyon."
          : "The new password and confirm password do not match."
      );
      return;
    }

    setUpdating(true);
    try {
      const { error } = await (supabase.auth as any).resetUserPassword(targetEmail, newPassword, cleanCode);

      if (error) {
        toast.error(error.message, { duration: 6000 });
      } else {
        toast.success(
          language === "tl"
            ? `Matagumpay na nabago ang password para kay ${workerDisplayName || fullName}! Maaari na silang mag-sign in gamit ang bagong password.`
            : `Password successfully updated for ${workerDisplayName || fullName}! The worker can now sign in with their new password.`,
          { duration: 8000 }
        );
        // Reset form to clean state
        setCodeSent(false);
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
        setFullName("");
        setUsername("");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update password");
    }
    setUpdating(false);
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <span>{language === "tl" ? "Reset Password" : "Reset Password"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {language === "tl"
            ? "Ilagay lamang ang buong pangalan at username ng manggagawa. I-click ang button upang maipadala ang 6-digit verification code sa email bago ilagay ang bagong password."
            : "Only the worker's full name and username need to be entered. Click the button to dispatch a 6-digit reset code to their email before setting a new strong password."}
        </p>

        {/* Step 1: Worker Full Name & Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {language === "tl" ? "Buong Pangalan ng Manggagawa" : "Worker's Full Name"}
            </Label>
            <input
              type="text"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              placeholder={language === "tl" ? "hal. Cristeta R. Lanuza" : "e.g. Cristeta R. Lanuza"}
              value={fullName}
              disabled={codeSent}
              onChange={(e) => setFullName(e.target.value)}
              list="admin-workers-list"
            />
            {registeredWorkers.length > 0 && (
              <datalist id="admin-workers-list">
                {registeredWorkers.map((w) => (
                  <option key={w.id} value={w.name}>{w.gmail}</option>
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {language === "tl" ? "Username ng Manggagawa" : "Worker's Username"}
            </Label>
            <input
              type="text"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              placeholder={language === "tl" ? "hal. cristeta" : "e.g. cristeta"}
              value={username}
              disabled={codeSent}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        {/* Send Reset Code Button (Initially visible) */}
        {!codeSent ? (
          <div className="pt-2">
            <Button
              size="sm"
              onClick={handleSendResetCode}
              disabled={sending}
              className="w-full sm:w-auto px-6 h-9 font-semibold gap-2 shadow-xs"
            >
              <KeyRound className="h-4 w-4" />
              {sending
                ? (language === "tl" ? "Ipinapadala ang Reset Code..." : "Sending Reset Code...")
                : (language === "tl" ? "Ipadala ang Reset Code sa Email" : "Send Reset Code via Email")}
            </Button>
          </div>
        ) : (
          /* Step 2: Code & New Password Fields (Appears ONLY after code is sent) */
          <div className="space-y-4 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 text-xs text-foreground flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Mail className="h-4 w-4 shrink-0" />
                <span>
                  {language === "tl" ? "Naipadala ang Code sa:" : "Verification Code Dispatched to:"} {targetEmail}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setCodeSent(false)}
              >
                {language === "tl" ? "Magpalit ng Manggagawa" : "Change Worker"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 6-Digit Code */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === "tl" ? "6-Digit Verification Code" : "6-Digit Verification Code"}
                </Label>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono font-bold tracking-widest text-center shadow-xs focus:ring-1 focus:ring-primary"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                />
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === "tl" ? "Bagong Password" : "New Password"}
                </Label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-10 rounded-md border border-input bg-background pl-3 pr-9 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === "tl" ? "Kumpirmahin ang Bagong Password" : "Confirm New Password"}
                </Label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full h-10 rounded-md border border-input bg-background pl-3 pr-9 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password strength guide */}
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {language === "tl"
                  ? "Dapat hindi bababa sa 8 karakter ang haba at mayroong kahit isang numero at isang malaking titik (uppercase)."
                  : "Password must be at least 8 characters long and include both a number and an uppercase letter."}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleUpdatePassword}
                disabled={updating}
                className="px-6 h-9 font-semibold gap-2 shadow-xs"
              >
                <Lock className="h-4 w-4" />
                {updating
                  ? (language === "tl" ? "Ina-update..." : "Updating Password...")
                  : (language === "tl" ? "I-save ang Bagong Password" : "Save New Password")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCodeSent(false)}
                className="h-9 px-4 text-xs"
              >
                {language === "tl" ? "Kanselahin" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
