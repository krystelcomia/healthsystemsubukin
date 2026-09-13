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
  Server,
  Globe,
  Shield
} from "lucide-react";
import { useSettings, COLOR_THEMES } from "@/contexts/SettingsContext";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";

const SettingsPage = () => {
  const { darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t } = useSettings();

  return (
    <div className="w-full space-y-6">
      <PageHeaderBanner
        icon={SettingsIcon}
        badge={language === "tl" ? "Mga Kagustuhan sa Sistema" : "System Preferences"}
        title={t("settings.title")}
        description={t("settings.description")}
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

      {/* 3. Security & Data — Backup & Recovery (Locked with System Color Theme & Red Lock Highlight) */}
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
            <Badge variant="outline" className="gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-semibold self-start sm:self-auto py-1 px-3 shadow-xs">
              <Lock className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              {t("settings.restrictedAdmin")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* System Color Themed Locked Notice with Red Lock Accent */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
              <Lock className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>Locked System Function — Supervisor Administrator Permission Required</span>
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
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium italic text-[11px]">
              <Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
              Access restricted to Supervisor Administrator
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Single Active Browser Session Policy */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">
                {t("settings.singleSessionTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.singleSessionDesc")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span>
                {language === "tl"
                  ? "Patakaran sa Pag-iisa ng Aktibong Sesyon (Single Session Rule)"
                  : "Single Session Enforcement (Facebook-Style Session Architecture)"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {language === "tl"
                ? "Hindi pinahihintulutan ang pagbubukas ng dalawang magkaibang account sa parehong browser instance. Kapag may nag-log in na bagong account sa ibang tab, awtomatikong mag-e-expire o magla-log out ang naunang sesyon pabor sa bagong account upang maiwasan ang cross-account contamination ng mga rekord ng kalusugan."
                : "Opening two separate staff accounts within the same browser instance is prevented by system security. Logging into an account in another tab automatically expires or logs out previous sessions on this browser in favor of the active session (similar to Facebook) to maintain strict clinical data isolation."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-border/60 bg-background space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{language === "tl" ? "Paggamit ng Ibang Browser" : "Use Multiple Browsers"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {language === "tl"
                  ? "Maaaring magbukas ng karagdagang account gamit ang ibang browser (tulad ng Microsoft Edge kasabay ng Google Chrome)."
                  : "Operate a secondary staff account concurrently by launching a distinct browser application (such as Microsoft Edge alongside Google Chrome)."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-background space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{language === "tl" ? "Pribado / Incognito Mode" : "Incognito / InPrivate Mode"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {language === "tl"
                  ? "Bawat Incognito o InPrivate window ay nagtataglay ng sariling hiwalay na imbakan, na may limitasyong isang aktibong account bawat window."
                  : "Private and Incognito windows maintain isolated storage contexts, with each window instance limited to one active session."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
