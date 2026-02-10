import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  Stethoscope,
  Activity,
  TrendingUp,
  Baby,
} from "lucide-react";

const stats = [
  { label: "Total Residents", value: "1,248", icon: Users, change: "+12 this month" },
  { label: "Consultations", value: "86", icon: Stethoscope, change: "This month" },
  { label: "Family Records", value: "312", icon: ClipboardList, change: "Families registered" },
  { label: "Child Vaccinations", value: "45", icon: Baby, change: "Pending follow-ups" },
];

const recentActivity = [
  { name: "Maria Santos", action: "Consultation recorded", time: "2 hours ago" },
  { name: "Juan Dela Cruz", action: "Family data updated", time: "4 hours ago" },
  { name: "Ana Reyes", action: "PhilPen screening completed", time: "Yesterday" },
  { name: "Pedro Garcia", action: "Dengue prevention inspection", time: "Yesterday" },
  { name: "Rosa Mendoza", action: "Maternal care visit", time: "2 days ago" },
];

const Index = () => {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your barangay health data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold text-foreground">{stat.value}</div>
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
              {recentActivity.map((item, i) => (
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
