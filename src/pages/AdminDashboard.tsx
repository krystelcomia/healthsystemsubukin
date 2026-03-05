import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Stethoscope, ClipboardList, Activity, Bug, UserCheck, UserX, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BHWWorker {
  id: string;
  name: string;
  is_online: boolean;
  last_seen: string | null;
  gmail: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalWorkers: 0,
    onlineWorkers: 0,
    consultations: 0,
    familyRecords: 0,
    philpenRecords: 0,
    dengueRecords: 0,
  });
  const [workers, setWorkers] = useState<BHWWorker[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ name: string; action: string; time: string }[]>([]);
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
        totalResidents: residents.count || 0,
        totalWorkers: workersCount.count || 0,
        onlineWorkers: onlineWorkers.count || 0,
        consultations: consultations.count || 0,
        familyRecords: families.count || 0,
        philpenRecords: philpen.count || 0,
        dengueRecords: dengue.count || 0,
      });

      // Fetch workers list
      const { data: workersData } = await (supabase.from as any)("bhw_workers").select("id, name, is_online, last_seen, gmail").order("name");
      setWorkers(workersData || []);

      // Fetch recent consultations
      const { data: recentConsultations } = await supabase
        .from("consultations")
        .select("consultation_date, consultation_cause, created_at, residents(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentConsultations) {
        setRecentActivity(recentConsultations.map((c: any) => ({
          name: c.residents?.full_name || "Unknown",
          action: c.consultation_cause || "Consultation recorded",
          time: formatTimeAgo(new Date(c.created_at)),
        })));
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

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

  const statCards = [
    { label: "Total Residents", value: stats.totalResidents, icon: Users, desc: "Registered residents" },
    { label: "BHW Workers", value: `${stats.onlineWorkers} / ${stats.totalWorkers}`, icon: Shield, desc: "Online / Total" },
    { label: "Consultations", value: stats.consultations, icon: Stethoscope, desc: "Total consultations" },
    { label: "Family Records", value: stats.familyRecords, icon: ClipboardList, desc: "Families registered" },
    { label: "PhilPen Health", value: stats.philpenRecords, icon: Activity, desc: "Health screenings" },
    { label: "Dengue Prevention", value: stats.dengueRecords, icon: Bug, desc: "Dengue records" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Overview of all barangay health system data and BHW reports.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold text-foreground">
                {loading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BHW Workers Status */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              BHW Workers Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : workers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workers registered yet.</p>
              ) : workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center relative">
                      <span className="text-xs font-semibold text-primary">
                        {w.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${w.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.gmail}</p>
                    </div>
                  </div>
                  <Badge variant={w.is_online ? "default" : "secondary"} className="text-xs">
                    {w.is_online ? <><UserCheck className="h-3 w-3 mr-1" />Online</> : <><UserX className="h-3 w-3 mr-1" />Offline</>}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports/Activity */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
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
    </div>
  );
};

export default AdminDashboard;
