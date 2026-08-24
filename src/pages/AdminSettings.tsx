import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";
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
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("admin.settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("admin.settings.description")}</p>
      </div>

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
    </div>
  );
};

export default AdminSettings;
