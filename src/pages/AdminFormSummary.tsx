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
  ChevronDown,
  ChevronUp,
  History,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

interface FormConfig {
  table: string;
  title: string;
  icon: LucideIcon;
  columns: string[];
  nameColumn: string;
}

const FORM_CONFIGS: Record<string, FormConfig> = {
  consultations: {
    table: "consultations",
    title: "Consultation Records",
    icon: Stethoscope,
    columns: ["consultation_date", "consultation_cause", "temperature", "pulse_rate", "weight", "height"],
    nameColumn: "consultation_cause",
  },
  family_data: {
    table: "family_data",
    title: "Family Data Records",
    icon: ClipboardList,
    columns: ["family_number", "father_name", "mother_name", "num_males", "num_females", "total_members"],
    nameColumn: "father_name",
  },
  philpen_health: {
    table: "philpen_health",
    title: "PhilPen Health Records",
    icon: Activity,
    columns: ["record_date", "bp", "bmi", "weight", "height", "smokes", "drinks_alcohol"],
    nameColumn: "bp",
  },
  dengue_prevention: {
    table: "dengue_prevention",
    title: "Dengue Prevention Records",
    icon: Bug,
    columns: ["household_name", "container_type", "has_larvae", "action_plan"],
    nameColumn: "household_name",
  },
  maternal_care: {
    table: "maternal_care",
    title: "Maternal Care Records",
    icon: HeartPulse,
    columns: ["created_at"],
    nameColumn: "created_at",
  },
  child_health: {
    table: "child_health",
    title: "Child Health Records",
    icon: Baby,
    columns: ["created_at"],
    nameColumn: "created_at",
  },
  family_planning: {
    table: "family_planning",
    title: "Family Planning Records",
    icon: Syringe,
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

interface WeeklyGroup {
  monday: Date;
  sunday: Date;
  label: string;
  records: RecordRow[];
}

const AdminFormSummary = ({ formType }: AdminFormSummaryProps) => {
  const { t } = useSettings();
  const config = FORM_CONFIGS[formType];
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentWeekRecords, setCurrentWeekRecords] = useState<RecordRow[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<RecordRow[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  
  // History tab states
  const [historyGroups, setHistoryGroups] = useState<WeeklyGroup[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const getMondayOfDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getSundayOfDate = (mondayDate: Date) => {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ALL records from the table
      const { data, error } = await (supabase.from as any)(config.table)
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const recordsList: RecordRow[] = data || [];
      setTotalRecords(recordsList.length);

      // 2. Partition into current week and history
      const now = new Date();
      const currentMonday = getMondayOfDate(now);
      
      const currentWeekList = recordsList.filter(r => new Date(r.created_at) >= currentMonday);
      setCurrentWeekRecords(currentWeekList);
      setWeeklyCount(currentWeekList.length);

      const historicalList = recordsList.filter(r => new Date(r.created_at) < currentMonday);

      // Group historical records by week
      const groupsMap: Record<string, WeeklyGroup> = {};
      historicalList.forEach(r => {
        const rDate = new Date(r.created_at);
        const mon = getMondayOfDate(rDate);
        const monStr = mon.toISOString().split("T")[0];
        if (!groupsMap[monStr]) {
          const sun = getSundayOfDate(mon);
          const label = `Week of ${formatDateShort(mon)} to ${formatDateShort(sun)}`;
          groupsMap[monStr] = {
            monday: mon,
            sunday: sun,
            label,
            records: []
          };
        }
        groupsMap[monStr].records.push(r);
      });

      const sortedGroups = Object.keys(groupsMap)
        .sort((a, b) => b.localeCompare(a))
        .map(key => groupsMap[key]);

      setHistoryGroups(sortedGroups);

      // Recently updated/created records (last 10)
      setRecentlyUpdated(recordsList.slice(0, 10));

      // Latest date
      if (recordsList.length > 0) {
        const latest = recordsList[0].updated_at || recordsList[0].created_at;
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

  const handlePrintReport = (recordsToPrint: RecordRow[], reportTitle: string) => {
    const win = window.open("", "_blank");
    if (!win) return;

    let pageSize = "A4 portrait";
    let pageMargin = "5mm";
    if (formType === "child_health") {
      pageSize = "legal landscape";
      pageMargin = "5mm";
    } else if (formType === "family_planning") {
      pageSize = "legal portrait";
      pageMargin = "6mm";
    } else if (formType === "dengue_prevention" || formType === "maternal_care") {
      pageSize = "A4 portrait";
      pageMargin = "4mm";
    }

    const rows = recordsToPrint.map((r, i) => {
      const resName = r.residents?.full_name || "—";
      const date = formatDate(r.created_at);
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${resName}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${date}</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><title>${reportTitle} - ${config.title}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; padding:25px; color:#1a1a1a; font-size:13px; }
        .header-seal { display:flex; align-items:center; justify-content:center; gap:24px; border-bottom:4px double #000; padding-bottom:14px; margin-bottom:20px; text-align:center; }
        .header-seal img { height:75px; width:auto; object-fit:contain; mix-blend-mode:multiply; }
        .report-title { text-align:center; font-size:18px; font-weight:bold; text-transform:uppercase; margin-bottom:16px; color:#111; }
        .stats { display:flex; gap:20px; margin-bottom:24px; justify-content:center; }
        .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 24px; text-align:center; }
        .stat .val { font-size:24px; font-weight:700; color:#4f46e5; }
        .stat .label { font-size:11px; color:#6b7280; margin-top:2px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th { background:#eef2ff; color:#4338ca; padding:10px 12px; text-align:left; font-size:11px; font-weight:600; border:1px solid #e5e7eb; text-transform:uppercase; letter-spacing:0.05em; }
        td { font-size:12px; }
        tr:nth-child(even) td { background:#f9fafb; }
        .footer { text-align:right; font-size:10px; color:#9ca3af; margin-top:24px; padding-top:12px; border-top:1px solid #e5e7eb; }
        @page { size: ${pageSize}; margin: ${pageMargin}; }
      </style>
    </head><body>
      <div class="header-seal">
        <img src="${sanjuanLogo}" alt="San Juan Seal" />
        <img src="${headerTextImg}" alt="Header Text" />
        <img src="${barangayLogo}" alt="Barangay Subukin Logo" />
      </div>
      <div class="report-title">${reportTitle} &mdash; ${config.title}</div>
      <p style="text-align:center;font-size:11px;color:#666;margin-bottom:16px;">Generated: ${new Date().toLocaleString()}</p>
      <div class="stats">
        <div class="stat"><div class="val">${recordsToPrint.length}</div><div class="label">Total Records</div></div>
      </div>
      <h3 style="font-size:14px;margin-bottom:8px;color:#374151;">Record Entries</h3>
      <table>
        <thead><tr><th>#</th><th>Resident Name</th><th>Date Created</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="text-align:center;padding:20px;color:#9ca3af;">No records found</td></tr>'}</tbody>
      </table>
      <div class="footer">Barangay Health Worker System &mdash; Official Admin Report</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const toggleWeekExpanded = (weekKey: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-sidebar-background p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md bg-white/10 text-white border-white/20">
              <FormIcon className="h-3.5 w-3.5" />
              Admin Summary View
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              {config.title}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Overview of all {config.title.toLowerCase()} — print weekly reports, view active weekly records, or explore previous history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
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
              onClick={() => handlePrintReport(currentWeekRecords, "Current Week Report")}
              className="bg-white/25 hover:bg-white/35 text-white font-semibold gap-1.5 text-xs backdrop-blur-sm border border-white/30"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 gap-4 no-print">
        <button
          onClick={() => setActiveTab("current")}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "current"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Active (Current Week)
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          History (Previous Weeks)
        </button>
      </div>

      {activeTab === "current" ? (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Records */}
            <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total Records
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-xs">
                  <Hash className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-tight">
                  {loading ? "..." : totalRecords.toLocaleString()}
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
                  <FileText className="h-3 w-3 text-primary" />
                  All time entries in database
                </div>
              </CardContent>
            </Card>

            {/* Updated This Week */}
            <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Updated This Week
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-xs">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-tight">
                  {loading ? "..." : weeklyCount.toLocaleString()}
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                  Active weekly record lifecycle
                </div>
              </CardContent>
            </Card>

            {/* Latest Update */}
            <Card className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Latest Update
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-xs">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-xl font-heading font-extrabold text-foreground tracking-tight">
                  {loading ? "..." : latestDate ? formatDate(latestDate) : "No records"}
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1">
                  <Clock className="h-3 w-3 text-primary" />
                  {latestDate ? formatTimeAgo(latestDate) : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Weekly Table */}
          <Card className="border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
              <div>
                <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Active Records (This Week)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Records collected in the current calendar week. At the end of the week, they transition to History.</p>
              </div>
              <Badge variant="outline" className="text-xs gap-1 font-semibold text-primary border-primary/20 bg-primary/5">
                <TrendingUp className="h-3 w-3" />
                {weeklyCount} active record{weeklyCount !== 1 ? "s" : ""}
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
                          Loading active records...
                        </td>
                      </tr>
                    ) : currentWeekRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs italic">
                          No active records logged in this week yet
                        </td>
                      </tr>
                    ) : (
                      currentWeekRecords.map((record, i) => (
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
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Recent Updates Log
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Most recent 10 logs processed by system</p>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {loading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                    Loading recent logs...
                  </div>
                ) : recentlyUpdated.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground italic">
                    No logs found
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
                          <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-primary/10 text-primary">
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
      ) : (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm bg-card p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-primary" />
              Historical Weekly Archives
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Whenever a week passes, its health worker logs are automatically archived here. You can expand any past week to inspect details or generate printed reports for reference.
            </p>
          </Card>

          {loading ? (
            <Card className="p-8 text-center text-xs text-muted-foreground border-border/50">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
              Loading history archives...
            </Card>
          ) : historyGroups.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground italic border-border/50">
              No historical weekly records archived yet.
            </Card>
          ) : (
            historyGroups.map((group) => {
              const weekKey = group.monday.toISOString().split("T")[0];
              const isExpanded = !!expandedWeeks[weekKey];
              return (
                <Card key={weekKey} className="border-border/50 shadow-xs hover:border-primary/30 transition-all">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarRange className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{group.label}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {group.records.length} record{group.records.length !== 1 ? "s" : ""} recorded in week
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWeekExpanded(weekKey)}
                        className="text-xs h-8 gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Collapse <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            View Records <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePrintReport(group.records, `${group.label} Report`)}
                        className="text-xs h-8 gap-1"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/60">
                      <div className="overflow-auto max-h-80">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/30">
                              <th className="p-2.5 text-left w-12">#</th>
                              <th className="p-2.5 text-left">Resident</th>
                              <th className="p-2.5 text-left">Date Created</th>
                              <th className="p-2.5 text-left">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.records.map((r, i) => (
                              <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                <td className="p-2.5 text-muted-foreground font-mono">{i + 1}</td>
                                <td className="p-2.5 font-medium text-foreground">
                                  {r.residents?.full_name || "—"}
                                </td>
                                <td className="p-2.5 text-foreground">{formatDate(r.created_at)}</td>
                                <td className="p-2.5 text-muted-foreground">{formatDateTime(r.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFormSummary;
