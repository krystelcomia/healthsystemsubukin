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
import { OfficialHeader } from "@/components/OfficialHeader";

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

interface PrintState {
  reportTitle: string;
  subtitle: string;
  records: RecordRow[];
}

const AdminFormSummary = ({ formType }: AdminFormSummaryProps) => {
  const { t } = useSettings();
  const config = FORM_CONFIGS[formType] || {
    table: formType,
    title: "Health Records",
    icon: FileText,
    columns: ["created_at"],
    nameColumn: "created_at",
  };
  
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

  // Active print state
  const [printState, setPrintState] = useState<PrintState | null>(null);

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
    const subtitle = `Barangay Subukin Health Center • ${config.title} • Total: ${recordsToPrint.length} Record(s) • Generated: ${new Date().toLocaleDateString()}`;
    setPrintState({
      reportTitle,
      subtitle,
      records: recordsToPrint,
    });

    document.body.classList.add("printing-admin-summary");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-admin-summary");
      }, 500);
    }, 150);
  };

  const toggleWeekExpanded = (weekKey: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  // Render form-specific table headers for printing
  const renderPrintTableHeaders = () => {
    switch (formType) {
      case "consultations":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Patient Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "80px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "70px" }}>Age / Temp</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "75px" }}>Pulse / Resp</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "70px" }}>Ht / Wt</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Clinical Diagnosis / Complaint</th>
          </tr>
        );
      case "family_data":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "95px" }}>Family No.</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Head / Father</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Mother Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "90px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "55px" }}>Males</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "55px" }}>Females</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "55px" }}>Total</th>
          </tr>
        );
      case "philpen_health":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Resident Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "80px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "75px" }}>BP / BMI</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "70px" }}>Ht / Wt</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Health Risk Profile / Habits</th>
          </tr>
        );
      case "dengue_prevention":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Household Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "80px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Container Types Inspected</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "80px" }}>Larvae (+/-)</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Action Plan / Remarks</th>
          </tr>
        );
      case "maternal_care":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date / EDC</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Patient Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "75px" }}>Family #</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "45px" }}>Age</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "80px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "85px" }}>Obstetric / FPAL</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Clinical Remarks</th>
          </tr>
        );
      case "child_health":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Child Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Mother / Caregiver</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "80px" }}>Sitio</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "65px" }}>Age / Sex</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "55px" }}>Weight</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Program / Remarks</th>
          </tr>
        );
      case "family_planning":
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Client Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>FP Number</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "110px" }}>Method</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Remarks / Notes</th>
          </tr>
        );
      default:
        return (
          <tr style={{ backgroundColor: "#f1f5f9" }}>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Resident Name</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "120px" }}>Date Created</th>
            <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Details</th>
          </tr>
        );
    }
  };

  // Render form-specific table row for printing
  const renderPrintTableRow = (rec: RecordRow, index: number) => {
    const resName = rec.residents?.full_name || rec.patient_name || rec.household_name || rec.father_name || "—";
    const dateStr = rec.consultation_date || rec.record_date || rec.edc || (rec.created_at ? formatDate(rec.created_at) : "—");

    switch (formType) {
      case "consultations":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.age ? `${rec.age}y` : "—"}{rec.temperature ? ` / ${rec.temperature}°C` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.pulse_rate ? `${rec.pulse_rate}bpm` : "—"}{rec.respiration_rate ? ` / ${rec.respiration_rate}` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.height ? `${rec.height}cm` : "—"}{rec.weight ? ` / ${rec.weight}kg` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.consultation_cause || "—"}</td>
          </tr>
        );
      case "family_data":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{rec.family_number || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.father_name || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.mother_name || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{rec.num_males ?? "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{rec.num_females ?? "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center", fontWeight: "bold" }}>{rec.total_members ?? "—"}</td>
          </tr>
        );
      case "philpen_health": {
        const habits = [];
        if (rec.smokes) habits.push("Smoker");
        if (rec.drinks_alcohol) habits.push("Alcohol");
        if (rec.high_blood_pressure) habits.push("High BP");
        if (rec.diabetes_symptoms) habits.push("Diabetes");
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.address_sitio || rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.bp || "—"}{rec.bmi ? ` (${rec.bmi})` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.height ? `${rec.height}cm` : "—"}{rec.weight ? ` / ${rec.weight}kg` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>
              {habits.length > 0 ? habits.join(", ") : "No high risk habits flagged"}
            </td>
          </tr>
        );
      }
      case "dengue_prevention":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.container_type || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center", fontWeight: rec.has_larvae ? "bold" : "normal" }}>
              {rec.has_larvae ? "POSITIVE (+)" : "Negative (-)"}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.action_plan || "—"}</td>
          </tr>
        );
      case "maternal_care":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.family_number || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{rec.age ? `${rec.age}y` : "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.obstetric_score || "—"}{rec.fpal ? ` (${rec.fpal})` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || "—"}</td>
          </tr>
        );
      case "child_health":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.mother_caregiver || rec.mother_name || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
              {rec.age || "—"}{rec.sex ? ` / ${rec.sex}` : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{rec.weight ? `${rec.weight}kg` : "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || rec.diagnosis || "—"}</td>
          </tr>
        );
      case "family_planning":
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.fp_number || rec.family_number || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.method || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || "—"}</td>
          </tr>
        );
      default:
        return (
          <tr key={rec.id || index}>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{resName}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{formatDateTime(rec.created_at)}</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || rec[config.nameColumn] || "—"}</td>
          </tr>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          body.printing-admin-summary #admin-form-summary-print-area,
          body.printing-admin-summary #admin-form-summary-print-area * {
            visibility: visible !important;
            color: #000000 !important;
          }
          body.printing-admin-summary #admin-form-summary-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 15px !important;
            margin: 0 !important;
            display: block !important;
          }
          body.printing-admin-summary #admin-form-summary-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          body.printing-admin-summary #admin-form-summary-print-area th,
          body.printing-admin-summary #admin-form-summary-print-area td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 10px !important;
            color: #000000 !important;
          }
          body.printing-admin-summary #admin-form-summary-print-area th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .header-seal img {
            height: 95px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>

      {/* Dynamic Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #admin-form-summary-print-area,
          #admin-form-summary-print-area * {
            visibility: visible !important;
            color: #000000 !important;
          }
          #admin-form-summary-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 10px 15px !important;
            margin: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          #admin-form-summary-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #admin-form-summary-print-area th,
          #admin-form-summary-print-area td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 10px !important;
            color: #000000 !important;
          }
          #admin-form-summary-print-area th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      {/* Week Navigation Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-sidebar-background p-6 md:p-8 text-white shadow-xl no-print">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md bg-white/10 text-white border-white/20">
              <FormIcon className="h-3.5 w-3.5" />
              Admin Summary &amp; History View
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              {config.title}
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Overview of all {config.title.toLowerCase()} — print weekly reports, view active weekly records, or explore previous history archives.
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
              onClick={() => handlePrintReport(currentWeekRecords, `Active Weekly ${config.title} Report`)}
              className="bg-white/25 hover:bg-white/35 text-white font-semibold gap-1.5 text-xs backdrop-blur-sm border border-white/30 shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print Active Week
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
        <div className="space-y-6 no-print">
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
                  Latest Entry
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-xs">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-xl font-heading font-bold text-foreground truncate mt-1">
                  {loading ? "..." : latestDate ? formatTimeAgo(latestDate) : "No entries"}
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground font-medium gap-1 truncate">
                  <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{latestDate ? formatDateTime(latestDate) : "—"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Week Records Table */}
          <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Active Week Records
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Records submitted during the current active calendar week
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintReport(currentWeekRecords, `Active Week - ${config.title}`)}
                disabled={currentWeekRecords.length === 0}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Week Table ({currentWeekRecords.length})
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/30">
                      <th className="p-3 text-left w-12">#</th>
                      <th className="p-3 text-left">Resident / Entity</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Timestamp</th>
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
                            {record.residents?.full_name || record.patient_name || record.household_name || record.father_name || "—"}
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
                              {record.residents?.full_name || record.patient_name || record.household_name || record.father_name || "Unlinked Record"}
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
        <div className="space-y-4 no-print">
          <Card className="border-border/60 shadow-sm bg-card p-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-primary" />
              Historical Weekly Archives
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Whenever a week passes, its health worker logs are automatically archived here. You can expand any past week to inspect details or generate printed reports with the official barangay header for auditing and archiving.
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
                        onClick={() => handlePrintReport(group.records, `${group.label} — ${config.title}`)}
                        className="text-xs h-8 gap-1 font-semibold"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Week Report
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
                              <th className="p-2.5 text-left">Resident / Entity</th>
                              <th className="p-2.5 text-left">Date Created</th>
                              <th className="p-2.5 text-left">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.records.map((r, i) => (
                              <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                <td className="p-2.5 text-muted-foreground font-mono">{i + 1}</td>
                                <td className="p-2.5 font-medium text-foreground">
                                  {r.residents?.full_name || r.patient_name || r.household_name || r.father_name || "—"}
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

      {/* ================= IN-SYSTEM PRINTABLE REPORT CONTAINER ================= */}
      {printState && (
        <div id="admin-form-summary-print-area" className="hidden print:block text-black bg-white">
          <OfficialHeader
            title={printState.reportTitle}
            subtitle={printState.subtitle}
            showDoubleBorder={true}
            logoHeight="95px"
          />

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
            <thead>
              {renderPrintTableHeaders()}
            </thead>
            <tbody>
              {printState.records.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ border: "1px solid #000", padding: "18px", textAlign: "center", fontStyle: "italic", fontSize: "11px" }}>
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                printState.records.map((rec, i) => renderPrintTableRow(rec, i))
              )}
            </tbody>
          </table>

          {/* Official Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "35px", marginTop: "25px", borderTop: "1px solid #cbd5e1" }}>
            <div>
              Certified Correct: ___________________________<br />
              <span style={{ fontSize: "10px", color: "#4b5563" }}>Attending Barangay Health Worker</span>
            </div>
            <div>
              Approved By: ___________________________<br />
              <span style={{ fontSize: "10px", color: "#4b5563" }}>Barangay Health Supervisor / Midwife</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFormSummary;
