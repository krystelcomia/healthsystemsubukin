import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Stethoscope, ClipboardList, Activity, Bug, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [residents, workers, onlineWorkers, consultations, families, philpen, dengue] = await Promise.all([
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
        totalWorkers: workers.count || 0,
        onlineWorkers: onlineWorkers.count || 0,
        consultations: consultations.count || 0,
        familyRecords: families.count || 0,
        philpenRecords: philpen.count || 0,
        dengueRecords: dengue.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Residents", value: stats.totalResidents, icon: Users, desc: "Registered residents" },
    { label: "BHW Workers", value: `${stats.onlineWorkers} / ${stats.totalWorkers}`, icon: Shield, desc: "Online / Total workers" },
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
        <p className="text-muted-foreground mt-1">Overview of all barangay health system data.</p>
      </div>

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
    </div>
  );
};

export default AdminDashboard;
