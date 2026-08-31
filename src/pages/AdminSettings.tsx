import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Clock, KeyRound, Mail, CheckCircle2 } from "lucide-react";
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
        toast.success("All printable forms, weekly reports, and updates compiled into folder archive and downloaded!");
      }
    } else {
      toast.error(`Failed to generate reports: ${res.error || "Unknown error"}`);
    }

    setGenerating(false);
    setGenerationProgress("");
  };

  return (
    <div className="w-full space-y-6">
      <PageHeaderBanner
        icon={Settings}
        badge="Supervisory Management Settings"
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />

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

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("settings.generateReport")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("settings.generateReportDesc")}
          </p>
          {generating && generationProgress && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin shrink-0" />
              <span>{generationProgress}</span>
            </div>
          )}
          <Button className="w-full gap-2" onClick={handleGenerateReport} disabled={generating}>
            <Download className="h-4 w-4" />
            {generating ? (generationProgress || t("settings.generating")) : t("settings.generateFullReport")}
          </Button>
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
        const targetEmail = data?.email || "registered Gmail";
        toast.success(
          language === "tl"
            ? `Matagumpay na naipadala ang 6-digit verification code sa email (${targetEmail}) para kay ${cleanFullName}!`
            : `6-digit verification reset code successfully sent to email (${targetEmail}) for ${cleanFullName}!`,
          { duration: 9000 }
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reset code");
    }
    setSending(false);
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
            ? "Ilagay lamang ang buong pangalan at username ng manggagawa. Ang 6-digit verification reset code ay awtomatikong ipapadala sa kanyang nakarehistrong email address."
            : "Only the worker's full name and username need to be entered. The 6-digit password reset verification code will be dispatched directly to their registered email inbox."}
        </p>

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
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

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
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
