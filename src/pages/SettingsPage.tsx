import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Settings as SettingsIcon, 
  DatabaseBackup, 
  Lock, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  RotateCcw, 
  CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";

const SettingsPage = () => {
  const { darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t } = useSettings();

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("settings.description")}</p>
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

      {/* Security & Data Backup & Recovery - Immediately Visible to all users with Admin Access Notice */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  {t("settings.backupAndRecovery")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.backupDesc")}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-semibold self-start sm:self-auto py-1 px-2.5">
              <Lock className="h-3 w-3" />
              {t("settings.restrictedAdmin")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Admin Restriction Notice Callout */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{t("settings.restrictedAdmin")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.restrictedAdminDesc")}
            </p>
          </div>

          {/* System Protection Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Automated Snapshots</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Scheduled background database archives & local storage protection.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Encrypted Patient Data</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Protected resident clinical records and family census directories.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Supervisory Control</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Data restores and snapshot exports require supervisor credentials.
              </p>
            </div>
          </div>

          {/* Action Buttons with Informative Toast Trigger */}
          <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Database Backup Engine: <strong className="text-foreground font-semibold">Active & Protected</strong>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info("Administrator Privilege Required", {
                  description: "Only authorized supervisors can export database backups. Please contact your Midwife Supervisor or Midwife Administrator."
                })}
                className="gap-1.5 text-xs font-medium border-border/80 hover:bg-muted/50"
              >
                <Download className="h-3.5 w-3.5" />
                {t("settings.export")}
                <Lock className="h-3 w-3 ml-1 text-amber-500" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info("Administrator Privilege Required", {
                  description: "System restoration is restricted to supervisory accounts to preserve system data integrity."
                })}
                className="gap-1.5 text-xs font-medium border-border/80 hover:bg-muted/50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("settings.restore")}
                <Lock className="h-3 w-3 ml-1 text-amber-500" />
              </Button>
            </div>
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
    </div>
  );
};

export default SettingsPage;
