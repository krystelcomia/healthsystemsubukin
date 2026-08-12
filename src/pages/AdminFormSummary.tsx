import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  ClipboardList,
  Activity,
  Bug,
  HeartPulse,
  Baby,
  Syringe,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  FileText,
  Clock,
  Hash,
  ArrowUpRight,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";

interface FormConfig {
  table: string;
  title: string;
  icon: LucideIcon;
  gradient: string;
  badgeColor: string;
  accentColor: string;
  columns: string[];
  nameColumn: string;
}

const FORM_CONFIGS: Record<string, FormConfig> = {
  consultations: {
    table: "consultations",
    title: "Consultation Records",
    icon: Stethoscope,
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    columns: ["consultation_date", "consultation_cause", "temperature", "pulse_rate", "weight", "height"],
    nameColumn: "consultation_cause",
  },
  family_data: {
    table: "family_data",
    title: "Family Data Records",
    icon: ClipboardList,
    gradient: "from-purple-600 via-violet-600 to-indigo-700",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    accentColor: "text-purple-600 dark:text-purple-400",
    columns: ["family_number", "father_name", "mother_name", "num_males", "num_females", "total_members"],
    nameColumn: "father_name",
  },
  philpen_health: {
    table: "philpen_health",
    title: "PhilPen Health Records",
    icon: Activity,
    gradient: "from-rose-600 via-pink-600 to-fuchsia-700",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    accentColor: "text-rose-600 dark:text-rose-400",
    columns: ["record_date", "bp", "bmi", "weight", "height", "smokes", "drinks_alcohol"],
    nameColumn: "bp",
  },
  dengue_prevention: {
    table: "dengue_prevention",
    title: "Dengue Prevention Records",
    icon: Bug,
    gradient: "from-teal-600 via-emerald-600 to-green-700",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    accentColor: "text-teal-600 dark:text-teal-400",
    columns: ["household_name", "container_type", "has_larvae", "action_plan"],
    nameColumn: "household_name",
  },
  maternal_care: {
    table: "maternal_care",
    title: "Maternal Care Records",
    icon: HeartPulse,
    gradient: "from-pink-600 via-rose-600 to-red-700",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    accentColor: "text-pink-600 dark:text-pink-400",
    columns: ["created_at"],
    nameColumn: "created_at",
  },
  child_health: {
    table: "child_health",
    title: "Child Health Records",
    icon: Baby,
    gradient: "from-sky-600 via-blue-600 to-indigo-700",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    accentColor: "text-sky-600 dark:text-sky-400",
    columns: ["created_at"],
    nameColumn: "created_at",
  },
  family_planning: {
    table: "family_planning",
    title: "Family Planning Records",
    icon: Syringe,
    gradient: "from-amber-600 via-orange-600 to-red-700",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    accentColor: "text-amber-600 dark:text-amber-400",
    columns: ["method", "start_date", "remarks"],
    nameColumn: "method",
  },
};

interface AdminFormSummaryProps {
  formType: string;
}

interface RecordRow {
  id: string;
  created_at: string;
  updated_at?: string;
  residents?: { full_name: string } | null;
  [key: string]: any;
}

const AdminFormSummary = ({ formType }: AdminFormSummaryProps) => {
  const { t } = useSettings();
  const config = FORM_CONFIGS[formType];
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [weeklyRecords, setWeeklyRecords] = useState<RecordRow[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<RecordRow[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [latestDate, setLatestDate] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Total count
      const { count } = await (supabase.from as any)(config.table)
        .select("id", { count: "exact", head: true });
      setTotalRecords(count || 0);

      // Get the date 7 days ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      // Weekly records (created in last 7 days)
      const { data: weekData } = await (supabase.from as any)(config.table)
        .select("*, residents(full_name)")
        .gte("created_at", weekAgoStr)
        .order("created_at", { ascending: false });
      setWeeklyRecords(weekData || []);
      setWeeklyCount((weekData || []).length);

      // Recently updated/created records (last 10)
      const { data: recentData } = await (supabase.from as any)(config.table)
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentlyUpdated(recentData || []);

      // Latest date
      if (recentData && recentData.length > 0) {
        const latest = recentData[0].updated_at || recentData[0].created_at;
        setLatestDate(latest);
      } else {
        setLatestDate(null);
      }
    } catch (err) {
      console.error("Error fetching admin form summary:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [formType]);

  const FormIcon = config.icon;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) return "Just now";
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
    } catch {
      return "—";
    }
  };

  const handlePrintWeekly = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const rows = weeklyRecords.map((r, i) => {
      const resName = r.residents?.full_name || "—";
      const date = formatDate(r.created_at);
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${resName}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${date}</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><title>Weekly Report - ${config.title}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; padding:40px; color:#1a1a1a; font-size:13px; }
        .header { text-align:center; margin-bottom:28px; padding-bottom:16px; border-bottom:3px solid #6366f1; }
        .header h1 { font-size:22px; color:#4f46e5; margin-bottom:4px; }
        .header p { color:#6b7280; font-size:12px; }
        .stats { display:flex; gap:20px; margin-bottom:24px; justify-content:center; }
        .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 24px; text-align:center; }
        .stat .val { font-size:24px; font-weight:700; color:#4f46e5; }
        .stat .label { font-size:11px; color:#6b7280; margin-top:2px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th { background:#eef2ff; color:#4338ca; padding:10px 12px; text-align:left; font-size:11px; font-weight:600; border:1px solid #e5e7eb; text-transform:uppercase; letter-spacing:0.05em; }
        td { font-size:12px; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { text-align:right; font-size:10px; color:#9ca3af; margin-top:24px; padding-top:12px; border-top:1px solid #e5e7eb; }
      </style>
    </head><body>
      <div class="header">
        <h1>Barangay Subukin Health System</h1>
        <p>Weekly Report — ${config.title}</p>
        <p style="margin-top:4px;font-size:11px;color:#9ca3af;">Report generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="stats">
        <div class="stat"><div class="val">${totalRecords}</div><div class="label">Total Records</div></div>
        <div class="stat"><div class="val">${weeklyCount}</div><div class="label">This Week</div></div>
      </div>
      <h3 style="font-size:14px;margin-bottom:8px;color:#374151;">Records Added This Week</h3>
      <table>
        <thead><tr><th>#</th><th>Resident Name</th><th>Date Created</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="text-align:center;padding:20px;color:#9ca3af;">No records this week</td></tr>'}</tbody>
      </table>
      <div class="footer">Barangay Health Worker System &mdash; Admin Report</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Hero Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.gradient} p-6 md:p-8 text-white shadow-xl`}>
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${config.badgeColor}`}>
              <FormIcon className="h-3.5 w-3.5" />
              Admin Summary View
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              {config.title}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Overview of all {config.title.toLowerCase()} — total entries, recent updates, and this week's activity report.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="text-white/80 hover:text-white hover:bg-white/15 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handlePrintWeekly}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold gap-1.5 text-xs backdrop-blur-sm border border-white/20"
            >
              <Printer className="h-3.5 w-3.5" /> Print Weekly Report
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Records */}
        <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Records
            </CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shadow-xs">
              <Hash className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-tight">
              {loading ? "..." : totalRecords.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
              <FileText className="h-3 w-3 text-indigo-500" />
              All time entries in database
            </div>
          </CardContent>
        </Card>

        {/* Updated This Week */}
        <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Updated This Week
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shadow-xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-tight">
              {loading ? "..." : weeklyCount.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              Records in last 7 days
            </div>
          </CardContent>
        </Card>

        {/* Latest Update */}
        <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Latest Update
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shadow-xs">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-xl font-heading font-extrabold text-foreground tracking-tight">
              {loading ? "..." : latestDate ? formatDate(latestDate) : "No records"}
            </div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              {latestDate ? formatTimeAgo(latestDate) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Report */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
              <CalendarDays className={`h-5 w-5 ${config.accentColor}`} />
              Weekly Report
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Records created or updated in the last 7 days</p>
          </div>
          <Badge variant="outline" className={`text-xs gap-1 font-semibold ${config.accentColor} border-current/30 bg-current/5`}>
            <TrendingUp className="h-3 w-3" />
            {weeklyCount} record{weeklyCount !== 1 ? "s" : ""} this week
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-12">#</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs">Resident</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs">Date Created</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                      Loading weekly report...
                    </td>
                  </tr>
                ) : weeklyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs italic">
                      No records found in the last 7 days
                    </td>
                  </tr>
                ) : (
                  weeklyRecords.map((record, i) => (
                    <tr key={record.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground text-xs font-mono">{i + 1}</td>
                      <td className="p-3 font-medium text-foreground text-xs">
                        {record.residents?.full_name || "—"}
                      </td>
                      <td className="p-3 text-foreground text-xs">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(record.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recently Updated Records */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
              <RefreshCw className={`h-5 w-5 ${config.accentColor}`} />
              Recently Updated Records
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Last 10 records updated or created — showing update timestamps</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                Loading recent updates...
              </div>
            ) : recentlyUpdated.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                No records found
              </div>
            ) : (
              recentlyUpdated.map((record) => {
                const updateDate = record.updated_at || record.created_at;
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/10 ${config.accentColor}`}>
                        <FormIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {record.residents?.full_name || "Unlinked Record"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          Created: {formatDateTime(record.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold border-border/60">
                        {formatTimeAgo(updateDate)}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(updateDate)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFormSummary;
