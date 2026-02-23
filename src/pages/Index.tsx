import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  Stethoscope,
  Activity,
  TrendingUp,
  Baby,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [stats, setStats] = useState({
    totalResidents: 0,
    consultations: 0,
    familyRecords: 0,
    childVaccinations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    { name: string; action: string; time: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [residents, consultations, families, children] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("consultations").select("id", { count: "exact", head: true }),
        supabase.from("family_data").select("id", { count: "exact", head: true }),
        supabase.from("residents").select("id", { count: "exact", head: true }).lte("age", 12),
      ]);

      setStats({
        totalResidents: residents.count || 0,
        consultations: consultations.count || 0,
        familyRecords: families.count || 0,
        childVaccinations: children.count || 0,
      });

      // Fetch recent activity from consultations with resident names
      const { data: recentConsultations } = await supabase
        .from("consultations")
        .select("consultation_date, consultation_cause, created_at, residents(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentConsultations) {
        const activities = recentConsultations.map((c: any) => ({
          name: c.residents?.full_name || "Unknown",
          action: c.consultation_cause || "Consultation recorded",
          time: formatTimeAgo(new Date(c.created_at)),
        }));
        setRecentActivity(activities);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const statCards = [
    { label: "Total Residents", value: stats.totalResidents.toLocaleString(), icon: Users, change: "Registered residents" },
    { label: "Consultations", value: stats.consultations.toLocaleString(), icon: Stethoscope, change: "Total consultations" },
    { label: "Family Records", value: stats.familyRecords.toLocaleString(), icon: ClipboardList, change: "Families registered" },
    { label: "Children (≤12)", value: stats.childVaccinations.toLocaleString(), icon: Baby, change: "Registered children" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your barangay health data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Consultation", href: "/forms/consultation", icon: Stethoscope },
                { label: "Family Data", href: "/forms/family-data", icon: ClipboardList },
                { label: "Health Screening", href: "/forms/philpen-health", icon: Activity },
                { label: "View Residents", href: "/residents", icon: Users },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-center group"
                >
                  <action.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-secondary-foreground">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
