import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";
import { generateFullReportFolder } from "@/lib/fullReportGenerator";

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

      {/* EmailJS & Verification Email Service Configuration */}
      <EmailJsSettingsCard />
    </div>
  );
};

const EmailJsSettingsCard = () => {
  const { language } = useSettings();
  const [config, setConfig] = useState(() => {
    const raw = localStorage.getItem("bhw_emailjs_config");
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return {
      serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
      templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "",
      publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ""
    };
  });
  const [testEmail, setTestEmail] = useState("amelitasayatbhw@gmail.com");
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    localStorage.setItem("bhw_emailjs_config", JSON.stringify(config));
    toast.success(
      language === "tl"
        ? "Nai-save ang EmailJS configuration! Gagamitin na ito sa pagpapadala ng verification code sa Gmail."
        : "EmailJS configuration saved successfully! It will be used to send reset codes to Gmail."
    );
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error(
        language === "tl"
          ? "Mangyaring maglagay ng email address para sa pagsubok"
          : "Please enter a test email address"
      );
      return;
    }
    setTesting(true);
    toast.info(
      language === "tl"
        ? `Ipinapadala ang test verification email sa ${testEmail}...`
        : `Sending test verification email to ${testEmail}...`
    );
    try {
      const { sendVerificationCodeEmail } = await import("@/lib/emailService");
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await sendVerificationCodeEmail(testEmail, testCode, "Administrator Test");

      if (res.success) {
        if (res.deliveredVia === "emailjs") {
          toast.success(
            language === "tl"
              ? `Matagumpay na naipadala ang test verification code sa ${testEmail} gamit ang EmailJS! Pakisuri ang iyong inbox.`
              : `Verification code successfully sent to ${testEmail} via EmailJS! Check your Gmail inbox.`
          );
        } else if (res.deliveredVia === "formsubmit" || res.deliveredVia === "web3forms") {
          toast.success(
            language === "tl"
              ? `Matagumpay na naipadala ang verification code sa ${testEmail}! Pakisuri ang iyong Gmail inbox.`
              : `Verification code successfully sent to ${testEmail}! Check your Gmail inbox.`
          );
        } else if (res.deliveredVia === "simulation") {
          toast.success(
            language === "tl"
              ? `Matagumpay na naproseso ang verification code para sa ${testEmail}.`
              : `Verification code successfully processed for ${testEmail}.`
          );
          toast.info(
            language === "tl"
              ? "Paalala: Ilagay ang iyong EmailJS credentials sa itaas upang magpadala ng live na email sa Gmail."
              : "Tip: Provide your active EmailJS credentials above to deliver live emails directly to Gmail inboxes.",
            { duration: 8000 }
          );
        } else {
          toast.success(res.message || `Verification code sent to ${testEmail}.`);
        }
      } else {
        toast.error(
          language === "tl"
            ? `Hindi naipadala ang email: ${res.error || res.message || "Nagkaroon ng problema"}`
            : `Email delivery failed: ${res.error || res.message || "Unknown error"}`
        );
      }
    } catch (e: any) {
      toast.error(
        language === "tl"
          ? `Error sa pagpapadala ng test email: ${e?.message || e}`
          : `Error sending test email: ${e?.message || e}`
      );
    }
    setTesting(false);
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <span>{language === "tl" ? "EmailJS Configuration (Gmail Verification Codes)" : "EmailJS Configuration (Gmail Verification Codes)"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {language === "tl"
            ? "I-konekta ang iyong EmailJS account upang ang 6-digit verification code para sa forgot password ay direktang maipadala sa Gmail inbox ng user o administrator."
            : "Connect your EmailJS account so that 6-digit password reset verification codes are dispatched directly to the user's or administrator's Gmail inbox."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Service ID</Label>
            <input
              type="text"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              placeholder="e.g. service_bhw123"
              value={config.serviceId}
              onChange={(e) => setConfig({ ...config, serviceId: e.target.value.trim() })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Template ID</Label>
            <input
              type="text"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              placeholder="e.g. template_reset_code"
              value={config.templateId}
              onChange={(e) => setConfig({ ...config, templateId: e.target.value.trim() })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Public Key (User ID)</Label>
            <input
              type="text"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              placeholder="e.g. public_key_abc123"
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value.trim() })}
            />
          </div>
        </div>

        <div className="bg-muted/40 p-3 rounded-lg border border-border text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Template Variables Required in EmailJS:</p>
          <p className="font-mono text-[10px] text-primary">to_email, to_name, verification_code, subject, message</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button size="sm" onClick={handleSave} className="flex-1">
            {language === "tl" ? "I-save ang Configuration" : "Save Configuration"}
          </Button>
          <div className="flex gap-1.5 flex-1">
            <input
              type="email"
              placeholder="recipient@gmail.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
            />
            <Button size="sm" variant="secondary" onClick={handleTestEmail} disabled={testing} className="text-xs">
              {testing ? "Sending..." : (language === "tl" ? "Subukang Magpadala" : "Send Test Email")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSettings;
