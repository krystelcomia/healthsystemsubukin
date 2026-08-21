import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Upload, DatabaseBackup, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";

const AdminSettings = () => {
  const [generating, setGenerating] = useState(false);
  const { darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      toast.info("Generating comprehensive report...");
      const [residents, consultations, familyData, dengue, philpen] = await Promise.all([
        supabase.from("residents").select("*"),
        supabase.from("consultations").select("*, residents(full_name)"),
        supabase.from("family_data").select("*, residents(full_name)"),
        supabase.from("dengue_prevention").select("*, residents(full_name)"),
        supabase.from("philpen_health").select("*, residents(full_name)"),
      ]);

      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_residents: (residents.data || []).length,
          total_consultations: (consultations.data || []).length,
          total_family_records: (familyData.data || []).length,
          total_dengue_records: (dengue.data || []).length,
          total_philpen_records: (philpen.data || []).length,
        },
        residents: residents.data || [],
        consultations: consultations.data || [],
        family_data: familyData.data || [],
        dengue_prevention: dengue.data || [],
        philpen_health: philpen.data || [],
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhw-full-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report generated and downloaded!");
    } catch {
      toast.error("Failed to generate report.");
    }
    setGenerating(false);
  };

  const handleExport = async () => {
    try {
      toast.info("Exporting data...");
      const [residents, consultations, familyData, dengue, philpen] = await Promise.all([
        supabase.from("residents").select("*"),
        supabase.from("consultations").select("*"),
        supabase.from("family_data").select("*"),
        supabase.from("dengue_prevention").select("*"),
        supabase.from("philpen_health").select("*"),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        residents: residents.data || [],
        consultations: consultations.data || [],
        family_data: familyData.data || [],
        dengue_prevention: dengue.data || [],
        philpen_health: philpen.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhw-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch {
      toast.error("Failed to export data.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.residents || !data.exported_at) {
        toast.error("Invalid backup file.");
        return;
      }

      toast.info("Restoring data...");
      const tables = ["residents", "consultations", "family_data", "dengue_prevention", "philpen_health"] as const;
      for (const table of tables) {
        const rows = data[table];
        if (rows && rows.length > 0) {
          const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
          if (error) {
            console.error(`Error restoring ${table}:`, error);
            toast.error(`Error restoring ${table}: ${error.message}`);
            return;
          }
        }
      }
      toast.success("Data restored successfully!");
    } catch {
      toast.error("Failed to read backup file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("common.english")}</SelectItem>
                <SelectItem value="tl">{t("common.tagalog")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Color Palette</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Choose a color theme for the system.</p>
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
          <Button className="w-full gap-2" onClick={handleGenerateReport} disabled={generating}>
            <Download className="h-4 w-4" />
            {generating ? t("settings.generating") : t("settings.generateFullReport")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" />
            Security &amp; Data — Backup &amp; Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage system backups, configure automatic backup schedules, and restore data from previous backups.
            All backup and restore activities are recorded in the Activity Logs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 p-3 bg-muted/20 flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Backup History</p>
                <p className="text-xs text-muted-foreground">View &amp; download past backups</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/50 p-3 bg-muted/20 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Auto Schedule</p>
                <p className="text-xs text-muted-foreground">Daily, Weekly, or Monthly</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/50 p-3 bg-muted/20 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-violet-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Restore &amp; Recovery</p>
                <p className="text-xs text-muted-foreground">Restore from any backup file</p>
              </div>
            </div>
          </div>

          <Button
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            onClick={() => navigate("/admin/settings/backup")}
          >
            <DatabaseBackup className="h-4 w-4" />
            Open Backup &amp; Recovery Center
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
