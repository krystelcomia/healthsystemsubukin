import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DatabaseBackup,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  HardDrive,
  Lock,
  RefreshCw,
  FileJson,
  Info,
  Shield,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLogger";

// ── Types ───────────────────────────────────────────────────────────────────

interface BackupRecord {
  id: string;
  timestamp: string;
  type: "Manual" | "Automatic";
  fileSize: string;
  createdBy: string;
  status: "Success" | "Failed";
  filename: string;
  dataSnapshot?: string;
}

interface BackupSchedule {
  enabled: boolean;
  frequency: "Daily" | "Weekly" | "Monthly";
  lastAutoBackup: string | null;
  nextScheduled: string | null;
}

const BACKUP_HISTORY_KEY = "bhw_backup_history";
const BACKUP_SCHEDULE_KEY = "bhw_backup_schedule";

const TABLE_DEFS = [
  { key: "residents",        label: "Residents",       colorClass: "text-blue-600",    bgClass: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "consultations",    label: "Consultations",   colorClass: "text-violet-600",  bgClass: "bg-violet-50 dark:bg-violet-950/30" },
  { key: "family_data",      label: "Family Data",     colorClass: "text-emerald-600", bgClass: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "dengue_prevention",label: "Dengue",          colorClass: "text-orange-600",  bgClass: "bg-orange-50 dark:bg-orange-950/30" },
  { key: "philpen_health",   label: "PhilPen",         colorClass: "text-cyan-600",    bgClass: "bg-cyan-50 dark:bg-cyan-950/30" },
  { key: "family_planning",  label: "Family Planning", colorClass: "text-pink-600",    bgClass: "bg-pink-50 dark:bg-pink-950/30" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function filenameTimestamp(iso: string): string {
  return iso.replace(/:/g, "-").replace(/\..+/, "");
}

function computeNext(frequency: BackupSchedule["frequency"], lastAuto: string | null): string {
  const base = lastAuto ? new Date(lastAuto) : new Date();
  const next = new Date(base);
  if (frequency === "Daily") next.setDate(next.getDate() + 1);
  else if (frequency === "Weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function loadHistory(): BackupRecord[] {
  try { return JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(history: BackupRecord[]) {
  const slim = history.map(({ dataSnapshot: _ds, ...rest }) => rest);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(slim.slice(-100)));
}

function loadSchedule(): BackupSchedule {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_SCHEDULE_KEY) || "null") ?? {
      enabled: false, frequency: "Daily", lastAutoBackup: null, nextScheduled: null,
    };
  } catch {
    return { enabled: false, frequency: "Daily", lastAutoBackup: null, nextScheduled: null };
  }
}

function saveSchedule(s: BackupSchedule) {
  localStorage.setItem(BACKUP_SCHEDULE_KEY, JSON.stringify(s));
}

// ── Component ─────────────────────────────────────────────────────────────────

const AdminBackupRecovery = () => {
  const { userRole, username, user } = useAuth();

  const [history, setHistory] = useState<BackupRecord[]>(loadHistory);
  const [schedule, setSchedule] = useState<BackupSchedule>(loadSchedule);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [dbSizeStr, setDbSizeStr] = useState("Calculating…");
  const [loadingStats, setLoadingStats] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [redownloadTarget, setRedownloadTarget] = useState<BackupRecord | null>(null);
  const [redownloadDialogOpen, setRedownloadDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const creatorName =
    username ||
    localStorage.getItem("logged_in_fullname") ||
    user?.email?.split("@")[0] ||
    "Administrator";

  // ── Fetch DB stats ──────────────────────────────────────────────────────────
  const fetchDbStats = async () => {
    setLoadingStats(true);
    try {
      const results = await Promise.all(
        TABLE_DEFS.map((t) => supabase.from(t.key as any).select("*", { count: "exact", head: true }))
      );
      const stats: Record<string, number> = {};
      TABLE_DEFS.forEach((t, i) => { stats[t.key] = results[i].count ?? 0; });
      setDbStats(stats);
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      setDbSizeStr(`${formatBytes(total * 850)} (≈${total} records)`);
    } catch {
      setDbSizeStr("Unable to calculate");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchDbStats(); }, []);

  // ── Auto-backup check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!schedule.enabled || userRole !== "supervisor") return;
    const isDue = () => {
      if (!schedule.lastAutoBackup) return true;
      const diffDays = (Date.now() - new Date(schedule.lastAutoBackup).getTime()) / (1000 * 60 * 60 * 24);
      if (schedule.frequency === "Daily") return diffDays >= 1;
      if (schedule.frequency === "Weekly") return diffDays >= 7;
      return diffDays >= 30;
    };
    if (isDue()) performBackup("Automatic");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.enabled]);

  // ── Core backup logic ──────────────────────────────────────────────────────
  const performBackup = async (type: "Manual" | "Automatic") => {
    setBackingUp(true);
    setBackupProgress(5);
    const now = new Date();
    const isoNow = now.toISOString();
    const filename = `bhw-backup-${filenameTimestamp(isoNow)}.json`;

    try {
      setBackupProgress(15);
      const [residents, consultations, familyData, dengue, philpen, familyPlanning] = await Promise.all([
        supabase.from("residents").select("*"),
        supabase.from("consultations").select("*"),
        supabase.from("family_data").select("*"),
        supabase.from("dengue_prevention").select("*"),
        supabase.from("philpen_health").select("*"),
        supabase.from("family_planning").select("*"),
      ]);

      setBackupProgress(60);

      const backupData = {
        exported_at: isoNow,
        backup_type: type,
        created_by: creatorName,
        version: "2.0",
        system: "Barangay Health Information Management System — Subukin",
        residents: residents.data || [],
        consultations: consultations.data || [],
        family_data: familyData.data || [],
        dengue_prevention: dengue.data || [],
        philpen_health: philpen.data || [],
        family_planning: familyPlanning.data || [],
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileSizeBytes = new Blob([jsonStr]).size;

      setBackupProgress(80);

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupProgress(90);

      const newRecord: BackupRecord = {
        id: crypto.randomUUID(),
        timestamp: isoNow,
        type,
        fileSize: formatBytes(fileSizeBytes),
        createdBy: creatorName,
        status: "Success",
        filename,
        dataSnapshot: jsonStr,
      };

      const updated = [newRecord, ...history];
      setHistory(updated);
      saveHistory(updated);

      if (type === "Automatic") {
        const next = computeNext(schedule.frequency, isoNow);
        const updatedSched: BackupSchedule = { ...schedule, lastAutoBackup: isoNow, nextScheduled: next };
        setSchedule(updatedSched);
        saveSchedule(updatedSched);
      }

      await logActivity("backup_created", {
        entity_type: "backup",
        entity_id: newRecord.id,
        description: `${type} backup created: ${filename} (${formatBytes(fileSizeBytes)}) by ${creatorName}`,
      });

      setBackupProgress(100);
      toast.success(`${type} backup created successfully!`, { description: filename });
    } catch (err) {
      const errorRecord: BackupRecord = {
        id: crypto.randomUUID(),
        timestamp: isoNow,
        type,
        fileSize: "—",
        createdBy: creatorName,
        status: "Failed",
        filename,
      };
      const updated = [errorRecord, ...history];
      setHistory(updated);
      saveHistory(updated);

      await logActivity("backup_failed", {
        entity_type: "backup",
        description: `${type} backup failed: ${err} — attempted by ${creatorName}`,
      });
      toast.error("Backup failed. Please try again.");
    } finally {
      setTimeout(() => { setBackupProgress(0); setBackingUp(false); }, 600);
    }
  };

  // ── Download history entry ──────────────────────────────────────────────────
  const handleDownloadHistory = (record: BackupRecord) => {
    if (record.dataSnapshot) {
      const blob = new Blob([record.dataSnapshot], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup file downloaded.", { description: record.filename });
    } else {
      setRedownloadTarget(record);
      setRedownloadDialogOpen(true);
    }
  };

  // ── Restore from history entry ──────────────────────────────────────────────
  const handleRestoreFromHistory = (record: BackupRecord) => {
    setRestoreTarget(record);
    setPendingRestoreData(record.dataSnapshot ?? null);
    setRestoreDialogOpen(true);
  };

  // ── Restore from file upload ────────────────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.exported_at || !parsed.residents) {
        toast.error("Invalid backup file — missing required fields.");
        return;
      }
      setPendingRestoreData(text);
      setRestoreTarget({
        id: "file-upload",
        timestamp: parsed.exported_at,
        type: parsed.backup_type ?? "Manual",
        fileSize: formatBytes(new Blob([text]).size),
        createdBy: parsed.created_by ?? "Unknown",
        status: "Success",
        filename: file.name,
      });
      setRestoreDialogOpen(true);
    } catch {
      toast.error("Could not read backup file. Ensure it is a valid .json backup.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Confirm restore ─────────────────────────────────────────────────────────
  const confirmRestore = async () => {
    if (!restoreTarget || !pendingRestoreData) return;
    setRestoring(true);
    setRestoreProgress(5);
    setRestoreDialogOpen(false);

    try {
      const data = JSON.parse(pendingRestoreData);
      const tables = ["residents", "consultations", "family_data", "dengue_prevention", "philpen_health", "family_planning"] as const;

      let step = 0;
      for (const table of tables) {
        step++;
        setRestoreProgress(Math.round(10 + (step / tables.length) * 80));
        const rows = (data as any)[table];
        if (rows && rows.length > 0) {
          const { error } = await supabase.from(table as any).upsert(rows, { onConflict: "id" });
          if (error) throw new Error(`Failed to restore ${table}: ${error.message}`);
        }
      }

      setRestoreProgress(95);

      await logActivity("backup_restored", {
        entity_type: "backup",
        entity_id: restoreTarget.id,
        description: `System data restored from backup: ${restoreTarget.filename} (created ${formatDateTime(restoreTarget.timestamp)}, by ${restoreTarget.createdBy}) — restored by ${creatorName}`,
      });

      setRestoreProgress(100);
      toast.success("System data restored successfully!", { description: `Restored from: ${restoreTarget.filename}` });
      await fetchDbStats();
    } catch (err: any) {
      await logActivity("backup_restore_failed", {
        entity_type: "backup",
        description: `Restore failed from ${restoreTarget?.filename}: ${err?.message ?? err} — attempted by ${creatorName}`,
      });
      toast.error(`Restore failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setTimeout(() => { setRestoreProgress(0); setRestoring(false); }, 800);
      setRestoreTarget(null);
      setPendingRestoreData(null);
    }
  };

  // ── Delete history entry ────────────────────────────────────────────────────
  const handleDeleteHistory = (record: BackupRecord) => {
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const updated = history.filter((h) => h.id !== deleteTarget.id);
    setHistory(updated);
    saveHistory(updated);
    setDeleteDialogOpen(false);
    await logActivity("backup_deleted", {
      entity_type: "backup",
      entity_id: deleteTarget.id,
      description: `Backup record deleted from history: ${deleteTarget.filename} — deleted by ${creatorName}`,
    });
    toast.success("Backup record removed from history.");
    setDeleteTarget(null);
  };

  // ── Schedule toggle / frequency ─────────────────────────────────────────────
  const handleScheduleToggle = (enabled: boolean) => {
    const next = enabled ? computeNext(schedule.frequency, schedule.lastAutoBackup) : null;
    const updated: BackupSchedule = { ...schedule, enabled, nextScheduled: next };
    setSchedule(updated);
    saveSchedule(updated);
    logActivity("backup_schedule_changed", {
      description: `Automatic backup ${enabled ? "enabled" : "disabled"} (${schedule.frequency}) by ${creatorName}`,
    });
    toast.info(enabled ? `Automatic ${schedule.frequency} backup enabled.` : "Automatic backup disabled.");
  };

  const handleFrequencyChange = (frequency: BackupSchedule["frequency"]) => {
    const next = schedule.enabled ? computeNext(frequency, schedule.lastAutoBackup) : null;
    const updated: BackupSchedule = { ...schedule, frequency, nextScheduled: next };
    setSchedule(updated);
    saveSchedule(updated);
    logActivity("backup_schedule_changed", {
      description: `Automatic backup frequency changed to ${frequency} by ${creatorName}`,
    });
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const lastSuccessfulBackup = history.find((h) => h.status === "Success");
  const successCount = history.filter((h) => h.status === "Success").length;
  const failedCount = history.filter((h) => h.status === "Failed").length;
  const manualCount = history.filter((h) => h.type === "Manual").length;
  const autoCount = history.filter((h) => h.type === "Automatic").length;
  const totalRecords = Object.values(dbStats).reduce((a, b) => a + b, 0);

  // ── Access guard ────────────────────────────────────────────────────────────
  if (userRole !== "supervisor") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-4">
        <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center shadow-inner">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The <strong>Backup &amp; Recovery</strong> feature is exclusively available to authorized system administrators.
            Unauthorized access attempts are logged for security.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 max-w-sm">
          <Shield className="h-4 w-4 shrink-0" />
          <span>Please contact your system administrator if you require access.</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="w-full space-y-6 pb-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Shield className="h-3.5 w-3.5" />
              Settings → Security &amp; Data
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <DatabaseBackup className="h-6 w-6 text-primary" />
              Backup &amp; Data Recovery
            </h1>
            <p className="text-muted-foreground text-sm">
              Create complete database backups, configure automatic schedules, and restore from previous backup files.
              All activities are logged for security and accountability.
            </p>
          </div>
          <Button
            id="btn-backup-now"
            onClick={() => performBackup("Manual")}
            disabled={backingUp || restoring}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md px-5"
          >
            {backingUp ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Creating Backup…</>
            ) : (
              <><DatabaseBackup className="h-4 w-4" /> Backup Now</>
            )}
          </Button>
        </div>

        {/* ── Progress Bars ── */}
        {backingUp && backupProgress > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" /> Creating backup…
              </span>
              <span>{backupProgress}%</span>
            </div>
            <Progress value={backupProgress} className="h-2" />
          </div>
        )}
        {restoring && restoreProgress > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="h-3 w-3 animate-spin text-amber-600" /> Restoring data…
              </span>
              <span>{restoreProgress}%</span>
            </div>
            <Progress value={restoreProgress} className="h-2 [&>div]:bg-amber-500" />
          </div>
        )}

        {/* ── Status Dashboard ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Last Backup */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Backup</p>
                {lastSuccessfulBackup ? (
                  <>
                    <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                      {formatDateTimeShort(lastSuccessfulBackup.timestamp)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lastSuccessfulBackup.type} · {lastSuccessfulBackup.fileSize}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5 italic">No backups yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Backup Status */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${lastSuccessfulBackup ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                {lastSuccessfulBackup
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <AlertTriangle className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Backup Status</p>
                <Badge
                  variant={lastSuccessfulBackup ? "default" : "secondary"}
                  className={`mt-1 ${lastSuccessfulBackup ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" : ""}`}
                >
                  {lastSuccessfulBackup ? "Healthy" : "No Backup"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {successCount} success · {failedCount} failed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Database Size */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <HardDrive className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Database Size</p>
                {loadingStats ? (
                  <div className="flex items-center gap-1 mt-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Calculating…</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-foreground mt-0.5 leading-snug">{dbSizeStr}</p>
                )}
                <button onClick={fetchDbStats} className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Auto Schedule */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${schedule.enabled ? "bg-primary/10" : "bg-muted"}`}>
                <Calendar className={`h-5 w-5 ${schedule.enabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Auto Backup</p>
                <Badge
                  variant={schedule.enabled ? "default" : "secondary"}
                  className={`mt-1 ${schedule.enabled ? "bg-primary/15 text-primary border-primary/30" : ""}`}
                >
                  {schedule.enabled ? schedule.frequency : "Disabled"}
                </Badge>
                {schedule.enabled && schedule.nextScheduled && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Next: {formatDateTimeShort(schedule.nextScheduled)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Backup Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Backups", value: history.length, colorClass: "text-primary" },
            { label: "Manual", value: manualCount, colorClass: "text-violet-600" },
            { label: "Automatic", value: autoCount, colorClass: "text-blue-600" },
            { label: "DB Records", value: totalRecords, colorClass: "text-emerald-600" },
          ].map(({ label, value, colorClass }) => (
            <Card key={label} className="border-border/40">
              <CardContent className="pt-4 pb-3">
                <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Database Record Summary ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Database Record Summary
            </CardTitle>
            <CardDescription>Current record counts across all health data tables included in each backup.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {TABLE_DEFS.map(({ key, label, colorClass, bgClass }) => (
                <div key={key} className={`text-center rounded-lg border border-border/60 p-3 ${bgClass}`}>
                  <p className={`text-2xl font-bold ${colorClass}`}>
                    {loadingStats ? "…" : (dbStats[key] ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Automatic Backup Schedule ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Automatic Backup Schedule
            </CardTitle>
            <CardDescription>
              Configure the system to automatically create and download backups on a recurring schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-4 bg-muted/10">
              <div>
                <Label htmlFor="auto-backup-switch" className="text-sm font-semibold cursor-pointer">
                  Enable Automatic Backup
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically creates &amp; downloads a backup when you visit this page at the scheduled interval.
                </p>
              </div>
              <Switch
                id="auto-backup-switch"
                checked={schedule.enabled}
                onCheckedChange={handleScheduleToggle}
              />
            </div>

            <div className={`flex items-center justify-between rounded-lg border border-border/60 p-4 transition-opacity ${schedule.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div>
                <Label className="text-sm font-semibold">Backup Frequency</Label>
                <p className="text-xs text-muted-foreground mt-0.5">How often the system should automatically create a backup.</p>
                {schedule.enabled && schedule.lastAutoBackup && (
                  <p className="text-xs text-primary mt-1 font-medium">
                    Last: {formatDateTime(schedule.lastAutoBackup)}
                  </p>
                )}
              </div>
              <Select
                value={schedule.frequency}
                onValueChange={(v) => handleFrequencyChange(v as BackupSchedule["frequency"])}
                disabled={!schedule.enabled}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {schedule.enabled && schedule.nextScheduled && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  <span className="font-semibold">Next scheduled backup:</span>{" "}
                  {formatDateTime(schedule.nextScheduled)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Restore from File ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Restore from File
            </CardTitle>
            <CardDescription>
              Upload a previously downloaded <code className="text-xs bg-muted px-1 rounded">.json</code> backup file to restore system data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-border/60 bg-muted/10 p-8 text-center hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FileJson className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Select a backup file to restore</p>
              <p className="text-xs text-muted-foreground mb-4">
                Only <strong>bhw-backup-*.json</strong> files generated by this system are accepted.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring || backingUp}
              >
                <Upload className="h-4 w-4" />
                {restoring ? "Restoring…" : "Choose Backup File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Warning:</strong> Restoring from a backup will <em>merge</em> backup records into the current database using upsert.
                Existing records with matching IDs will be overwritten. Records not present in the backup are preserved.
                This action is recorded in the <strong>Activity Logs</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Backup History ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Backup History
              </CardTitle>
              <CardDescription className="mt-0.5">
                All backup, restore, and deletion activities are recorded for security and accountability.
                Up to 100 recent records are stored.
              </CardDescription>
            </div>
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {history.length} record{history.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <DatabaseBackup className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No backup history yet</p>
                <p className="text-xs mt-1">Click <strong>Backup Now</strong> to create your first backup.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-bold uppercase tracking-wide w-44">Date &amp; Time</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wide w-24">Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wide w-24">File Size</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wide">Created By</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wide w-24">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wide text-right w-36">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs text-foreground font-medium py-3">
                          {formatDateTime(record.timestamp)}
                          <p className="text-[10px] text-muted-foreground font-normal truncate max-w-[170px] mt-0.5">
                            {record.filename}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              record.type === "Automatic"
                                ? "border-blue-400/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                : "border-violet-400/50 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30"
                            }`}
                          >
                            {record.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{record.fileSize}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{record.createdBy}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              record.status === "Success"
                                ? "border-emerald-400/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                : "border-red-400/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                            }`}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {/* Download */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={() => handleDownloadHistory(record)}
                                  disabled={backingUp || restoring}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{record.dataSnapshot ? "Download backup file" : "Re-create & download"}</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Restore */}
                            {record.status === "Success" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                    onClick={() => handleRestoreFromHistory(record)}
                                    disabled={backingUp || restoring}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{record.dataSnapshot ? "Restore this backup" : "Upload file to restore"}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Delete */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteHistory(record)}
                                  disabled={backingUp || restoring}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Delete record from history</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Security Notice ── */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/30 border border-border/40 p-4">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Security &amp; Accountability</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All backup creation, restore operations, and deletion activities are automatically recorded in the{" "}
              <strong>Activity Logs</strong> with timestamps, the administrator's identity, and action details.
              Unauthorized access to this page is blocked. Only users with the{" "}
              <strong>Supervisor / Administrator</strong> role can perform backup, restore, or data deletion operations.
            </p>
          </div>
        </div>

        {/* ── Restore Confirmation Dialog ── */}
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Confirm Data Restore
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>You are about to restore system data from the following backup:</p>
                  {restoreTarget && (
                    <div className="rounded-md bg-muted/60 border border-border/60 p-3 space-y-1 text-xs font-mono">
                      <p><span className="text-muted-foreground">File:</span> {restoreTarget.filename}</p>
                      <p><span className="text-muted-foreground">Created:</span> {formatDateTime(restoreTarget.timestamp)}</p>
                      <p><span className="text-muted-foreground">By:</span> {restoreTarget.createdBy}</p>
                      <p><span className="text-muted-foreground">Size:</span> {restoreTarget.fileSize}</p>
                    </div>
                  )}
                  <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                    <p className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Important Warning
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-red-700 dark:text-red-400">
                      <li>This will <strong>overwrite existing records</strong> that share the same IDs as the backup.</li>
                      <li>Records not present in the backup will <strong>remain unchanged</strong>.</li>
                      <li>This action <strong>cannot be undone</strong> without a newer backup.</li>
                      <li>This restore will be <strong>recorded in the Activity Logs</strong>.</li>
                    </ul>
                  </div>
                  {!pendingRestoreData && restoreTarget?.id !== "file-upload" && (
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-400">
                      <strong>Note:</strong> This backup's data is no longer in memory. Use the{" "}
                      <strong>"Restore from File"</strong> section above to upload the original backup .json file, then confirm.
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setRestoreTarget(null); setPendingRestoreData(null); }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRestore}
                disabled={!pendingRestoreData}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Yes, Restore Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Re-download Dialog ── */}
        <AlertDialog open={redownloadDialogOpen} onOpenChange={setRedownloadDialogOpen}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Re-create Backup?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The original backup file for <strong>{redownloadTarget?.filename}</strong> is no longer in memory.
                Clicking <strong>Create Fresh Backup</strong> will create a new backup of the <em>current</em> database state —
                not the historical state from that date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRedownloadTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setRedownloadDialogOpen(false);
                  setRedownloadTarget(null);
                  performBackup("Manual");
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <DatabaseBackup className="h-4 w-4 mr-1.5" />
                Create Fresh Backup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Delete Confirmation Dialog ── */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Backup Record
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{deleteTarget?.filename}</strong> from backup history?
                This only removes the history entry — it does not delete any downloaded backup file from your device.
                This action will be recorded in the Activity Logs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
};

export default AdminBackupRecovery;
