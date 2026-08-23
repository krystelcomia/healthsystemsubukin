import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  DatabaseBackup, 
  Lock, 
  ShieldCheck, 
  CheckCircle2,
  Server
} from "lucide-react";
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

      {/* 3. Security & Data — Backup & Recovery (Locked with System Color Theme) */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-xs">
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
            <Badge variant="outline" className="gap-1.5 bg-primary/10 text-primary border-primary/30 text-xs font-semibold self-start sm:self-auto py-1 px-3">
              <Lock className="h-3 w-3" />
              {t("settings.restrictedAdmin")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* System Color Themed Locked Notice */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs sm:text-sm">
              <Lock className="h-4 w-4 shrink-0 text-primary" />
              <span>Locked System Function — Administrator Permission Required</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Database backup creation, automated schedules, and data recovery functions are locked for health worker accounts. Full configuration, export, and execution details are exclusively available in the Administrator section.
            </p>
          </div>

          {/* System Protection Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Automated Snapshots</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Scheduled background database archives & local protection managed centrally.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Encrypted Patient Data</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Protected resident clinical records, patient files, and family directories.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Server className="h-3.5 w-3.5 text-primary" />
                <span>Admin Managed</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Full snapshot history, restoration, and schedule options available in Admin Settings.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Database Backup Engine: <strong className="text-foreground font-semibold">Active & Protected</strong>
            </span>
            <span className="italic text-[11px]">
              Access restricted to Midwife Administrator / Supervisor
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
