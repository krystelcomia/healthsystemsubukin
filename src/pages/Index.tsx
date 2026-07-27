import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  Stethoscope,
  Activity,
  TrendingUp,
  Baby,
  Heart,
  HeartPulse,
  HeartHandshake,
  Syringe,
  Bug,
  Sparkles,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  FileText,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Index = () => {
  const { t, colorTheme } = useSettings();

  const [stats, setStats] = useState({
    totalResidents: 0,
    consultations: 0,
    familyRecords: 0,
    childVaccinations: 0,
    dengueAudits: 0,
    philpenScreenings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    { name: string; action: string; time: string; type: string }[]
  >([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const THEME_STYLES: Record<string, {
    heroGradient: string;
    heroBorder: string;
    badgeStyle: string;
    btnStyle: string;
    accentText: string;
    chartColors: string[];
  }> = {
    emerald: {
      heroGradient: "from-emerald-950 via-teal-900 to-slate-950",
      heroBorder: "border-emerald-700/40",
      badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      btnStyle: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold",
      accentText: "text-emerald-300",
      chartColors: ["#059669", "#0284c7", "#7c3aed", "#d97706", "#e11d48", "#2563eb", "#db2777"],
    },
    ocean: {
      heroGradient: "from-blue-950 via-sky-900 to-slate-950",
      heroBorder: "border-sky-700/40",
      badgeStyle: "bg-sky-500/20 text-sky-300 border-sky-400/30",
      btnStyle: "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold",
      accentText: "text-sky-300",
      chartColors: ["#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb", "#db2777"],
    },
    purple: {
      heroGradient: "from-purple-950 via-indigo-900 to-slate-950",
      heroBorder: "border-purple-700/40",
      badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-400/30",
      btnStyle: "bg-purple-500 hover:bg-purple-400 text-white font-bold",
      accentText: "text-purple-300",
      chartColors: ["#7c3aed", "#0284c7", "#059669", "#d97706", "#e11d48", "#2563eb", "#db2777"],
    },
    rose: {
      heroGradient: "from-rose-950 via-pink-950 to-slate-950",
      heroBorder: "border-rose-700/40",
      badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-400/30",
      btnStyle: "bg-rose-500 hover:bg-rose-400 text-white font-bold",
      accentText: "text-rose-300",
      chartColors: ["#e11d48", "#db2777", "#7c3aed", "#0284c7", "#059669", "#d97706", "#2563eb"],
    },
    maroon: {
      heroGradient: "from-rose-950 via-red-950 to-slate-950",
      heroBorder: "border-rose-800/40",
      badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-400/30",
      btnStyle: "bg-rose-600 hover:bg-rose-500 text-white font-bold",
      accentText: "text-rose-300",
      chartColors: ["#be123c", "#e11d48", "#7c3aed", "#0284c7", "#059669", "#d97706", "#db2777"],
    },
    amber: {
      heroGradient: "from-amber-950 via-orange-950 to-slate-950",
      heroBorder: "border-amber-700/40",
      badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-400/30",
      btnStyle: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold",
      accentText: "text-amber-300",
      chartColors: ["#d97706", "#059669", "#0284c7", "#7c3aed", "#e11d48", "#2563eb", "#db2777"],
    },
    slate: {
      heroGradient: "from-slate-900 via-zinc-900 to-stone-950",
      heroBorder: "border-slate-700/40",
      badgeStyle: "bg-slate-500/20 text-slate-300 border-slate-400/30",
      btnStyle: "bg-slate-700 hover:bg-slate-600 text-white font-bold",
      accentText: "text-slate-300",
      chartColors: ["#475569", "#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb"],
    },
  };

  const currentStyle = THEME_STYLES[colorTheme] || THEME_STYLES.emerald;
  const CHART_COLORS = currentStyle.chartColors;

  useEffect(() => {
    const fetchStats = async () => {
      const [residents, consultations, families, children, dengue, philpen] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("consultations").select("id", { count: "exact", head: true }),
        supabase.from("family_data").select("id", { count: "exact", head: true }),
        supabase.from("residents").select("id", { count: "exact", head: true }).lte("age", 12),
        supabase.from("dengue_prevention").select("id", { count: "exact", head: true }),
        supabase.from("philpen_health").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalResidents: residents.count || 0,
        consultations: consultations.count || 0,
        familyRecords: families.count || 0,
        childVaccinations: children.count || 0,
        dengueAudits: dengue.count || 0,
        philpenScreenings: philpen.count || 0,
      });

      // Fetch all form data for chart
      const [consData, famData, philData, dengData, matData, childData, fpData] = await Promise.all([
        supabase.from("consultations").select("created_at"),
        supabase.from("family_data").select("created_at"),
        supabase.from("philpen_health").select("created_at"),
        supabase.from("dengue_prevention").select("created_at"),
        supabase.from("maternal_care" as any).select("created_at"),
        supabase.from("child_health" as any).select("created_at"),
        supabase.from("family_planning").select("created_at"),
      ]);

      const monthlyData = buildMonthlyChart({
        [t("nav.consultation")]: consData.data || [],
        [t("nav.familyData")]: famData.data || [],
        [t("nav.philpenHealth")]: philData.data || [],
        [t("nav.denguePrevention")]: dengData.data || [],
        [t("nav.maternalCare")]: (matData.data as any[]) || [],
        [t("nav.childHealth")]: (childData.data as any[]) || [],
        [t("nav.familyPlanning")]: fpData.data || [],
      });
      setChartData(monthlyData);

      // Fetch recent activity
      const { data: recentConsultations } = await supabase
        .from("consultations")
        .select("consultation_date, consultation_cause, created_at, residents(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentConsultations) {
        const activities = recentConsultations.map((c: any) => ({
          name: c.residents?.full_name || "Resident",
          action: c.consultation_cause || "Consultation recorded",
          time: formatTimeAgo(new Date(c.created_at)),
          type: "Consultation",
        }));
        setRecentActivity(activities);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  const buildMonthlyChart = (formData: Record<string, { created_at: string }[]>) => {
    const months: Record<string, Record<string, any>> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = { monthStr: label };
      Object.keys(formData).forEach((form) => { months[key][form] = 0; });
    }

    Object.entries(formData).forEach(([formName, records]) => {
      if (!Array.isArray(records)) return;
      records.forEach((r) => {
        if (!r || !r.created_at) return;
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (months[key]) months[key][formName] = (months[key][formName] || 0) + 1;
      });
    });

    return Object.entries(months).map(([, val]) => {
      const { monthStr, ...rest } = val;
      return { month: monthStr, ...rest };
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const quickForms = [
    { title: t("nav.consultation"), href: "/forms/consultation", icon: Stethoscope, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50", desc: "Log illness, vitals & diagnosis" },
    { title: t("nav.familyData"), href: "/forms/family-data", icon: ClipboardList, color: "from-sky-500/20 to-sky-600/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:border-sky-500/50", desc: "Household profiles & members" },
    { title: t("nav.philpenHealth"), href: "/forms/philpen-health", icon: Activity, color: "from-rose-500/20 to-rose-600/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500/50", desc: "NCD risk screening & BP" },
    { title: t("nav.childHealth"), href: "/forms/child-health", icon: Baby, color: "from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:border-amber-500/50", desc: "Sick child, Vit A & SIA list" },
    { title: t("nav.maternalCare"), href: "/forms/maternal-care", icon: HeartPulse, color: "from-pink-500/20 to-pink-600/10 text-pink-600 dark:text-pink-400 border-pink-500/20 hover:border-pink-500/50", desc: "Prenatal & pregnant records" },
    { title: t("nav.denguePrevention"), href: "/forms/dengue-prevention", icon: Bug, color: "from-teal-500/20 to-teal-600/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:border-teal-500/50", desc: "Household larvae inspection" },
    { title: t("nav.familyPlanning"), href: "/forms/family-planning", icon: HeartHandshake, color: "from-indigo-500/20 to-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50", desc: "Contraceptive method tracking" },
    { title: t("nav.residents"), href: "/residents", icon: Users, color: "from-purple-500/20 to-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:border-purple-500/50", desc: "Browse resident database" },
  ];

  const statCards = [
    { label: t("dashboard.totalResidents"), value: stats.totalResidents, icon: Users, desc: t("dashboard.registeredResidents"), color: "from-sky-500/10 via-sky-500/5 to-transparent text-sky-600 dark:text-sky-400 border-sky-500/30", badgeColor: "bg-sky-500/10 text-sky-600" },
    { label: t("dashboard.consultations"), value: stats.consultations, icon: Stethoscope, desc: t("dashboard.totalConsultations"), color: "from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/30", badgeColor: "bg-emerald-500/10 text-emerald-600" },
    { label: t("dashboard.familyRecords"), value: stats.familyRecords, icon: ClipboardList, desc: t("dashboard.familiesRegistered"), color: "from-purple-500/10 via-purple-500/5 to-transparent text-purple-600 dark:text-purple-400 border-purple-500/30", badgeColor: "bg-purple-500/10 text-purple-600" },
    { label: t("dashboard.children"), value: stats.childVaccinations, icon: Baby, desc: t("dashboard.registeredChildren"), color: "from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400 border-amber-500/30", badgeColor: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="space-y-6 w-full max-w-full">
      
      {/* Dynamic Theme Hero Banner Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentStyle.heroGradient} p-6 md:p-8 text-white shadow-xl border ${currentStyle.heroBorder}`}>
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${currentStyle.badgeStyle}`}>
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              Barangay Subukin Health Center Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              {t("dashboard.welcome")} Complete health care monitoring, resident registry, and form services.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center text-xs space-y-0.5">
              <div className={`font-semibold flex items-center justify-center gap-1.5 ${currentStyle.accentText}`}>
                <Calendar className="h-3.5 w-3.5" />
                {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="font-mono text-xs font-bold text-white tracking-widest">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>

            <Button asChild size="sm" className={`${currentStyle.btnStyle} shadow-lg gap-2 text-xs`}>
              <Link to="/residents">
                <Search className="h-3.5 w-3.5" />
                Search Resident
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Vibrant Intuitive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.label} 
            className={`relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br ${stat.color}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-xl ${stat.badgeColor} shadow-xs`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-heading font-extrabold text-foreground tracking-tight">
                {loading ? "..." : stat.value.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {stat.desc}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/60">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid Section: Health Form Launchpad + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Health Form Launchpad (2 Columns wide) */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm bg-card">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                Health Form Services Launchpad
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quick access to complete barangay health records & forms
              </p>
            </div>
            <Badge variant="secondary" className="text-xs gap-1 font-semibold bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3" /> 8 Services
            </Badge>
          </CardHeader>

          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickForms.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className={`group relative p-3.5 rounded-xl border bg-gradient-to-r ${item.color} transition-all duration-200 hover:shadow-md flex items-start gap-3`}
                >
                  <div className="p-2.5 rounded-lg bg-background/80 dark:bg-slate-900/80 shadow-xs group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-border/60 shadow-sm bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-sky-600" />
              {t("dashboard.recentActivity")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Latest recorded consultation events</p>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2 py-4 text-center">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2 mx-auto" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <UserCheck className="h-8 w-8 mx-auto opacity-30 text-primary" />
                  <p className="text-xs">{t("dashboard.noActivity")}</p>
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {item.action}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Forms Overview Analytics Chart */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              {t("dashboard.formsOverview")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.formsOverviewDesc")}</p>
          </div>
          <Badge variant="outline" className="text-xs gap-1 font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
            <Sparkles className="h-3 w-3" /> Monthly Activity Trends
          </Badge>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
              Loading analytics chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {CHART_COLORS.map((color, idx) => (
                    <linearGradient key={idx} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    borderColor: "hsl(var(--border))", 
                    borderRadius: 12, 
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontSize: 12,
                    color: "hsl(var(--foreground))"
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                {chartData.length > 0 &&
                  Object.keys(chartData[0])
                    .filter((k) => k !== "month")
                    .map((key, i) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={1}
                        fill={`url(#gradient-${i % CHART_COLORS.length})`}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;