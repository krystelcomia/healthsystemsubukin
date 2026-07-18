import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Stethoscope, ClipboardList, Activity, Bug, UserCheck, UserX, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface BHWWorker {
  id: string;
  name: string;
  is_online: boolean;
  last_seen: string | null;
  gmail: string;
}

const AdminDashboard = () => {
  const { t } = useSettings();
  const [stats, setStats] = useState({
    totalResidents: 0, totalWorkers: 0, onlineWorkers: 0, consultations: 0, familyRecords: 0, philpenRecords: 0, dengueRecords: 0,
  });
  const [workers, setWorkers] = useState<BHWWorker[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ name: string; action: string; time: string }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [residents, workersCount, onlineWorkers, consultations, families, philpen, dengue] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("bhw_workers").select("id", { count: "exact", head: true }),
        supabase.from("bhw_workers").select("id", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("consultations").select("id", { count: "exact", head: true }),
        supabase.from("family_data").select("id", { count: "exact", head: true }),
        supabase.from("philpen_health").select("id", { count: "exact", head: true }),
        supabase.from("dengue_prevention").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalResidents: residents.count || 0, totalWorkers: workersCount.count || 0, onlineWorkers: onlineWorkers.count || 0,
        consultations: consultations.count || 0, familyRecords: families.count || 0, philpenRecords: philpen.count || 0, dengueRecords: dengue.count || 0,
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

      const { data: workersData } = await (supabase.from as any)("bhw_workers").select("id, name, is_online, last_seen, gmail").order("name");
      setWorkers(workersData || []);

      const { data: recentConsultations } = await supabase
        .from("consultations").select("consultation_date, consultation_cause, created_at, residents(full_name)")
        .order("created_at", { ascending: false }).limit(5);

      if (recentConsultations) {
        setRecentActivity(recentConsultations.map((c: any) => ({
          name: c.residents?.full_name || "Unknown",
          action: c.consultation_cause || t("dashboard.consultations"),
          time: formatTimeAgo(new Date(c.created_at)),
        })));
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const buildMonthlyChart = (formData: Record<string, { created_at: string }[]>) => {
    const months: Record<string, Record<string, any>> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = { _labelStr: label };
      Object.keys(formData).forEach((form) => { months[key][form] = 0; });
    }
    Object.entries(formData).forEach(([formName, records]) => {
      records.forEach((r) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (months[key]) months[key][formName] = (months[key][formName] || 0) + 1;
      });
    });
    return Object.entries(months).map(([, val]) => {
      const { _labelStr, ...rest } = val;
      return { month: _labelStr, ...rest };
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
    return `${diffDays}d ago`;
  };

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(220, 70%, 55%)",
    "hsl(150, 60%, 45%)",
    "hsl(35, 90%, 55%)",
    "hsl(340, 70%, 55%)",
    "hsl(270, 60%, 55%)",
    "hsl(180, 50%, 45%)",
  ];

  const statCards = [
    { label: t("dashboard.totalResidents"), value: stats.totalResidents, icon: Users, desc: t("dashboard.registeredResidents") },
    { label: t("admin.dashboard.bhwWorkers"), value: `${stats.onlineWorkers} / ${stats.totalWorkers}`, icon: Shield, desc: t("admin.dashboard.onlineTotal") },
    { label: t("dashboard.consultations"), value: stats.consultations, icon: Stethoscope, desc: t("dashboard.totalConsultations") },
    { label: t("dashboard.familyRecords"), value: stats.familyRecords, icon: ClipboardList, desc: t("dashboard.familiesRegistered") },
    { label: t("nav.philpenHealth"), value: stats.philpenRecords, icon: Activity, desc: t("admin.dashboard.healthScreenings") },
    { label: t("nav.denguePrevention"), value: stats.dengueRecords, icon: Bug, desc: t("admin.dashboard.dengueRecords") },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          {t("admin.dashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("admin.dashboard.desc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold text-foreground">{loading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t("admin.dashboard.workersStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : workers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.dashboard.noWorkers")}</p>
              ) : workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center relative">
                      <span className="text-xs font-semibold text-primary">{w.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${w.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.gmail}</p>
                    </div>
                  </div>
                  <Badge variant={w.is_online ? "default" : "secondary"} className="text-xs">
                    {w.is_online ? <><UserCheck className="h-3 w-3 mr-1" />{t("admin.dashboard.online")}</> : <><UserX className="h-3 w-3 mr-1" />{t("admin.dashboard.offline")}</>}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("admin.dashboard.recentReports")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
              ) : recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("dashboard.formsOverview")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("dashboard.formsOverviewDesc")}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {chartData.length > 0 &&
                  Object.keys(chartData[0])
                    .filter((k) => k !== "month")
                    .map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
