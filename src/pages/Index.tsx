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
  Plus,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { syncFamilyDataToResidents, getFamilyOnlyResidents } from "@/lib/residentLinker";
import { getThemeStyle } from "@/lib/themeStyles";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Index = () => {
  const { userRole, isMidwife } = useAuth();
  const { t, colorTheme, language } = useSettings();
  const currentStyle = getThemeStyle(colorTheme);
  const [stats, setStats] = useState({
    totalResidents: 0,
    consultations: 0,
    familyRecords: 0,
    childVaccinations: 0,
    dengueAudits: 0,
    philpenScreenings: 0,
  });
  const [customForms, setCustomForms] = useState<{ id: string; title: string; description?: string }[]>([]);
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

  // Load deployed custom forms from storage
  useEffect(() => {
    const loadCustom = () => {
      try {
        const stored = localStorage.getItem("bhw_custom_forms");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomForms(parsed);
          }
        }
      } catch (e) {}
    };
    loadCustom();
    window.addEventListener("storage", loadCustom);
    window.addEventListener("custom-forms-updated", loadCustom);
    return () => {
      window.removeEventListener("storage", loadCustom);
      window.removeEventListener("custom-forms-updated", loadCustom);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const [familyOnlyResidents, consultations, families, dengue, philpen] = await Promise.all([
        getFamilyOnlyResidents(),
        supabase.from("consultations").select("id", { count: "exact", head: true }),
        supabase.from("family_data").select("id", { count: "exact", head: true }),
        supabase.from("dengue_prevention").select("id", { count: "exact", head: true }),
        supabase.from("philpen_health").select("id", { count: "exact", head: true }),
      ]);

      const childrenList = familyOnlyResidents.filter((r: any) => (Number(r.age) || 0) <= 12);

      setStats({
        totalResidents: familyOnlyResidents.length,
        consultations: consultations.count || 0,
        familyRecords: families.count || 0,
        childVaccinations: childrenList.length,
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

      // Fetch comprehensive recent activity across all health forms and registry
      const [
        recentConsultations,
        recentDengue,
        recentPhilpen,
        recentMaternal,
        recentChild,
        recentFamilyPlanning,
        recentFamilies,
        recentResidents
      ] = await Promise.all([
        supabase.from("consultations").select("consultation_date, consultation_cause, created_at, residents(full_name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("dengue_prevention").select("household_name, container_type, has_larvae, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("philpen_health").select("full_name, bp, record_date, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("maternal_care" as any).select("patient_name, patient_last_name, patient_first_name, checkup_date, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("child_health" as any).select("child_name, first_name, surname, checkup_date, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("family_planning").select("method, start_date, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("family_data").select("family_number, father_name, mother_name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("residents").select("full_name, sitio, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const rawCustomRecords = JSON.parse(localStorage.getItem("bhw_custom_form_records") || "[]");

      const allEvents: { name: string; action: string; time: string; timestamp: number; type: string }[] = [];

      (recentConsultations.data || []).forEach((c: any) => {
        allEvents.push({
          name: c.residents?.full_name || "Resident",
          action: c.consultation_cause ? `Consultation: ${c.consultation_cause}` : "Consultation recorded",
          time: formatTimeAgo(new Date(c.created_at || c.consultation_date)),
          timestamp: new Date(c.created_at || c.consultation_date).getTime(),
          type: "Consultation",
        });
      });

      (recentDengue.data || []).forEach((d: any) => {
        allEvents.push({
          name: d.household_name || "Household",
          action: d.has_larvae ? "Dengue Larvae Detected (Action taken)" : "Dengue inspection cleared",
          time: formatTimeAgo(new Date(d.created_at)),
          timestamp: new Date(d.created_at).getTime(),
          type: "Dengue",
        });
      });

      (recentPhilpen.data || []).forEach((p: any) => {
        allEvents.push({
          name: p.full_name || "Resident",
          action: p.bp ? `PhilPen NCD checkup (BP: ${p.bp})` : "PhilPen risk screening completed",
          time: formatTimeAgo(new Date(p.created_at || p.record_date)),
          timestamp: new Date(p.created_at || p.record_date).getTime(),
          type: "PhilPen",
        });
      });

      ((recentMaternal.data as any[]) || []).forEach((m: any) => {
        const name = m.patient_name || `${m.patient_first_name || ""} ${m.patient_last_name || ""}`.trim() || "Patient";
        allEvents.push({
          name,
          action: "Maternal & prenatal checkup recorded",
          time: formatTimeAgo(new Date(m.created_at || m.checkup_date)),
          timestamp: new Date(m.created_at || m.checkup_date).getTime(),
          type: "Maternal",
        });
      });

      ((recentChild.data as any[]) || []).forEach((ch: any) => {
        const name = ch.child_name || `${ch.first_name || ""} ${ch.surname || ""}`.trim() || "Child";
        allEvents.push({
          name,
          action: "Child health & immunization check",
          time: formatTimeAgo(new Date(ch.created_at || ch.checkup_date)),
          timestamp: new Date(ch.created_at || ch.checkup_date).getTime(),
          type: "Child Health",
        });
      });

      (recentFamilyPlanning.data || []).forEach((fp: any) => {
        allEvents.push({
          name: "Family Planning Client",
          action: fp.method ? `Method: ${fp.method}` : "Family planning visit recorded",
          time: formatTimeAgo(new Date(fp.created_at || fp.start_date)),
          timestamp: new Date(fp.created_at || fp.start_date).getTime(),
          type: "Family Planning",
        });
      });

      (recentFamilies.data || []).forEach((f: any) => {
        const name = f.father_name || f.mother_name || `Family #${f.family_number || ""}`;
        allEvents.push({
          name,
          action: "Household census profile registered",
          time: formatTimeAgo(new Date(f.created_at)),
          timestamp: new Date(f.created_at).getTime(),
          type: "Family Data",
        });
      });

      (recentResidents.data || []).forEach((r: any) => {
        allEvents.push({
          name: r.full_name,
          action: `Registered in resident registry (${r.sitio || "Subukin"})`,
          time: formatTimeAgo(new Date(r.created_at)),
          timestamp: new Date(r.created_at).getTime(),
          type: "Resident",
        });
      });

      (rawCustomRecords || []).forEach((cf: any) => {
        allEvents.push({
          name: cf.resident_name || "Resident",
          action: `${cf.formTitle || "Custom Form"} record submitted`,
          time: formatTimeAgo(new Date(cf.savedAt || cf.created_at)),
          timestamp: new Date(cf.savedAt || cf.created_at).getTime(),
          type: "Custom Form",
        });
      });

      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivity(allEvents.slice(0, 5));

      setLoading(false);
    };

    fetchStats();
    const handleDbUpdate = () => fetchStats();
    window.addEventListener("storage", handleDbUpdate);
    window.addEventListener("bhw-db-updated", handleDbUpdate);
    return () => {
      window.removeEventListener("storage", handleDbUpdate);
      window.removeEventListener("bhw-db-updated", handleDbUpdate);
    };
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
    if (language === "tl") {
      if (diffHrs < 1) return "Kani-kanina lang";
      if (diffHrs < 24) return `${diffHrs} oras ang nakalipas`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return "Kahapon";
      return `${diffDays} araw ang nakalipas`;
    }
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const CHART_COLORS = currentStyle.chartColors;

  interface LaunchpadItem {
    title: string;
    href: string;
    icon: any;
    color: string;
    desc: string;
    badge?: string;
  }

  const standardForms: LaunchpadItem[] = [
    { 
      title: t("nav.consultation"), 
      href: "/forms/consultation", 
      icon: Stethoscope, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Itala ang sakit, vitals at diagnosis" : "Log illness, vitals & diagnosis" 
    },
    { 
      title: t("nav.familyData"), 
      href: "/forms/family-data", 
      icon: ClipboardList, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Profile ng sambahayan at mga miyembro" : "Household profiles & members" 
    },
    { 
      title: t("nav.philpenHealth"), 
      href: "/forms/philpen-health", 
      icon: Activity, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "NCD risk screening at presyon ng dugo (BP)" : "NCD risk screening & BP" 
    },
    { 
      title: t("nav.childHealth"), 
      href: "/forms/child-health", 
      icon: Baby, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "May sakit na bata, Vit A at talaan ng SIA" : "Sick child, Vit A & SIA list" 
    },
    { 
      title: t("nav.maternalCare"), 
      href: "/forms/maternal-care", 
      icon: HeartPulse, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Talaan ng prenatal at mga buntis" : "Prenatal & pregnant records" 
    },
    { 
      title: t("nav.denguePrevention"), 
      href: "/forms/dengue-prevention", 
      icon: Bug, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Inspeksyon ng kiti-kiti sa sambahayan" : "Household larvae inspection" 
    },
    { 
      title: t("nav.familyPlanning"), 
      href: "/forms/family-planning", 
      icon: Syringe, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Pagsubaybay sa pamamaraan ng contraceptive" : "Contraceptive method tracking" 
    },
    { 
      title: t("nav.residentRecords"), 
      href: "/residents", 
      icon: Users, 
      color: "from-primary/20 to-primary/10 text-primary border-primary/20 hover:border-primary/50", 
      desc: language === "tl" ? "Master direktoryo ng residente at rekord ng kalusugan" : "Master resident directory & health records" 
    },
  ];

  const deployedCustomLaunchpadItems: LaunchpadItem[] = customForms.map((cf) => ({
    title: cf.title,
    href: `/forms/custom/${cf.id}`,
    icon: FileText,
    color: "from-primary/25 via-primary/15 to-primary/5 text-primary border-primary/30 hover:border-primary/60 shadow-xs",
    desc: cf.description || (language === "tl" ? "Naka-deploy na opisyal na form ng kalusugan" : "Deployed official health form"),
    badge: language === "tl" ? "Custom Form" : "Custom Form",
  }));

  const allLaunchpadItems: LaunchpadItem[] = [
    ...standardForms,
    ...deployedCustomLaunchpadItems,
    // Hide "Add New Form" deploy item for midwife (view-only)
    ...(!isMidwife ? [{
      title: language === "tl" ? "Magdagdag ng Bagong Form" : "Add New Form",
      href: "/forms/add-new",
      icon: Plus,
      color: "from-muted/40 to-muted/10 text-muted-foreground border-dashed border-border/80 hover:border-primary/50 hover:text-primary",
      desc: language === "tl" ? "Mag-scan at mag-deploy ng mga bagong digital health form" : "Scan and deploy new digital health forms",
      badge: language === "tl" ? "I-deploy" : "Deploy",
    }] : []),
  ];

  const statCards = [
    { label: t("dashboard.totalResidents"), value: stats.totalResidents, icon: Users, desc: t("dashboard.registeredResidents"), color: "from-primary/10 via-primary/5 to-transparent text-primary border-primary/30", badgeColor: "bg-primary/10 text-primary" },
    { label: t("dashboard.consultations"), value: stats.consultations, icon: Stethoscope, desc: t("dashboard.totalConsultations"), color: "from-primary/10 via-primary/5 to-transparent text-primary border-primary/30", badgeColor: "bg-primary/10 text-primary" },
    { label: t("dashboard.familyRecords"), value: stats.familyRecords, icon: ClipboardList, desc: t("dashboard.familiesRegistered"), color: "from-primary/10 via-primary/5 to-transparent text-primary border-primary/30", badgeColor: "bg-primary/10 text-primary" },
    { label: t("dashboard.children"), value: stats.childVaccinations, icon: Baby, desc: t("dashboard.registeredChildren"), color: "from-primary/10 via-primary/5 to-transparent text-primary border-primary/30", badgeColor: "bg-primary/10 text-primary" },
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
              {language === "tl" ? "Sentro ng Kalusugan ng Barangay Subukin" : "Barangay Subukin Health Center Hub"}
            </div>
            {isMidwife && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/50 bg-amber-500/20 text-amber-200 backdrop-blur-md">
                <Eye className="h-3.5 w-3.5" />
                {language === "tl" ? "View Only — Midwife" : "View Only — Midwife"}
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              {t("dashboard.welcome")} {language === "tl" ? "Kumpletong pagsubaybay sa kalusugan, rehistro ng residente, at mga serbisyo sa form." : "Complete health care monitoring, resident registry, and form services."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center text-xs space-y-0.5">
              <div className={`font-semibold flex items-center justify-center gap-1.5 ${currentStyle.accentText}`}>
                <Calendar className="h-3.5 w-3.5" />
                {currentTime.toLocaleDateString(language === "tl" ? "fil-PH" : "en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="font-mono text-xs font-bold text-white tracking-widest">
                {currentTime.toLocaleTimeString(language === "tl" ? "fil-PH" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>

            <Button asChild size="sm" className={`${currentStyle.btnStyle} shadow-lg gap-2 text-xs`}>
              <Link to="/residents">
                <Search className="h-3.5 w-3.5" />
                {language === "tl" ? "Maghanap ng Residente" : "Search Resident"}
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
                  {language === "tl" ? "Aktibo" : "Active"}
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
                {language === "tl" ? "Pangunahing Sentro ng mga Form ng Kalusugan" : "Health Form Services Launchpad"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === "tl" ? "Mabilis na access sa kumpletong mga talaan at form ng kalusugan ng barangay" : "Quick access to complete barangay health records & forms"}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs gap-1 font-semibold bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3" /> {standardForms.length + customForms.length} {language === "tl" ? "Aktibong Serbisyo" : "Active Services"}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allLaunchpadItems.map((item) => (
                <Link
                  key={item.title + item.href}
                  to={item.href}
                  className={`group relative p-3.5 rounded-xl border bg-gradient-to-r ${item.color} transition-all duration-200 hover:shadow-md flex items-start gap-3`}
                >
                  <div className="p-2.5 rounded-lg bg-background/80 dark:bg-slate-900/80 shadow-xs group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        {isMidwife && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400/40 text-amber-600 dark:text-amber-400 shrink-0">
                            <Eye className="h-2.5 w-2.5 mr-0.5" />
                            View
                          </Badge>
                        )}
                        {!isMidwife && item.badge && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary shrink-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
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
            <p className="text-xs text-muted-foreground">
              {language === "tl" ? "Real-time na mga kaganapan at talaan sa sentro ng kalusugan" : "Real-time health center events & records"}
            </p>
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
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "RC"}
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
            <Sparkles className="h-3 w-3" /> {language === "tl" ? "Buwanang Trend ng Aktibidad" : "Monthly Activity Trends"}
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