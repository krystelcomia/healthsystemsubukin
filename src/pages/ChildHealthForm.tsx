import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Baby, 
  Stethoscope, 
  Pill, 
  Syringe, 
  Save, 
  Printer, 
  Plus, 
  Trash, 
  RefreshCw, 
  Search, 
  Eye, 
  UserCheck,
  Check,
  AlertCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ensureResidentExists, getFamilyOnlyResidents } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";
import { OfficialHeader } from "@/components/OfficialHeader";
import {
  allowOnlyLetters,
  allowOnlyNumbers,
  allowNumbersAndDecimal,
  sanitizeLetters,
  sanitizeNumbers,
  sanitizeNumbersAndDecimal,
} from "@/lib/inputValidation";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-7 text-xs";

export interface SickChildFormFull {
  // Header / Demographics
  fn_number: string;
  first_name: string;
  middle_name: string;
  surname: string;
  dob: string;
  age_months: string;
  sex: string;
  address: string;
  philhealth_number: string;
  mother_name: string;
  father_name: string;
  contact_number: string;
  weight_kg: string;
  height_cm: string;
  temp_c: string;
  pulse_rate: string;
  respiratory_rate: string;
  examiner_name: string;
  date_examined: string;
  chief_complaint: string;
  consultation_type: string; // Unang konsulta / Follow-up

  // 1. General Danger Signs
  unable_to_drink: boolean | null;
  vomits_everything: boolean | null;
  has_convulsions: boolean | null;
  lethargic_unconscious: boolean | null;
  classification_danger: string;

  // 2. Ubo / Nahihirapang Huminga
  has_cough: boolean | null;
  cough_days: string;
  respiratory_rate_val: string;
  fast_breathing: boolean | null;
  chest_indrawing: boolean | null;
  stridor: boolean | null;
  classification_cough: string;

  // 3. Pagtatae (Diarrhea)
  has_diarrhea: boolean | null;
  diarrhea_days: string;
  blood_in_stool: boolean | null;
  eye_condition: string; // masigla / irritable / tutulog-tulog / hindi lubog / lubog
  skin_pinch: string; // mabilis / mabagal / napakabagal
  drinking_ability: string; // normal / sabik / di makainom
  classification_diarrhea: string;

  // 4. Nilalagnat (Fever)
  has_fever: boolean | null;
  fever_history: boolean | null;
  fever_days: string;
  fever_everyday_7days: boolean | null;
  stiff_neck: boolean | null;
  classification_fever: string;

  // 5. Tigdas (Measles)
  measles_past_3months: boolean | null;
  measles_rash: boolean | null;
  measles_cough_runny_red_eyes: boolean | null;
  mouth_sores: string;
  eye_pus_clouding: string;
  classification_measles: string;

  // 6. Dengue
  dengue_bleeding: boolean | null;
  dengue_dark_vomit_stool: boolean | null;
  dengue_abdominal_pain: boolean | null;
  dengue_persistent_vomiting: boolean | null;
  dengue_petechiae: boolean | null;
  dengue_cold_extremities: boolean | null;
  capillary_refill_sec: string;
  tourniquet_test_positive: boolean | null;
  classification_dengue: string;

  // 7. Problema sa Tenga (Ear Problem)
  has_ear_problem: boolean | null;
  ear_pain: boolean | null;
  ear_discharge: boolean | null;
  ear_discharge_days: string;
  ear_swelling_behind: boolean | null;
  classification_ear: string;

  // PAGE 2:
  // 8. Bakuna
  vaccines_given: string[];
  vaccines_needed_today: string;
  return_date_vaccine: string;

  // 9. Vitamin A
  vit_a_past_6months: boolean | null;
  vit_a_needed_today: boolean | null;

  // 10. Malnutrisyon at Anemia
  very_low_weight: boolean | null;
  severe_wasting: boolean | null;
  edema_both_feet: boolean | null;
  muac_cm: string;
  classification_malnutrition: string;
  palmar_pallor_some: boolean | null;
  palmar_pallor_severe: boolean | null;
  classification_anemia: string;

  // 11. Pagpapakain
  breastfeeding: boolean | null;
  breastfeed_times: string;
  other_food_drinks: boolean | null;
  other_food_details: string;
  other_food_times: string;
  feeding_utensils: string;
  food_amount: string;
  own_plate: boolean | null;
  person_feeding: string;
  how_fed: string;
  feeding_changed_during_illness: boolean | null;
  feeding_change_details: string;

  // 12. Pag-aaruga & Iba Pang Problema
  how_plays: string;
  how_talks: string;
  other_problems: string;

  // 13. Doktor & Paggamot Summary
  doctor_see: boolean | null;
  treatment_notes: string;
  advice_notes: string;
  urgent_return_advice: string;
  feeding_advice: string;
  return_health_center_date: string;
}

export interface VitaminARow {
  id: string;
  child_name: string;
  dob: string;
  v6m_1st: string;
  v12_23_v1: string;
  v12_23_v2: string;
  v12_23_d1: string;
  v12_23_d2: string;
  v24_35_v1: string;
  v24_35_v2: string;
  v24_35_d1: string;
  v24_35_d2: string;
  v36_47_v1: string;
  v36_47_v2: string;
  v36_47_d1: string;
  v36_47_d2: string;
  v48_59_v1: string;
  v48_59_v2: string;
  v48_59_d1: string;
  v48_59_d2: string;
}

export interface SIARow {
  id: string;
  child_family_name: string;
  child_given_name: string;
  child_middle_name: string;
  dob: string;
  age_months: string;
  gender: string;
  barangay: string;
  purok_sitio_street: string;
  mother_family_name: string;
  mother_given_name: string;
  mother_middle_name: string;
  vaccine_given: string;
  vaccination_date: string;
  vaccinator_family_name: string;
  vaccinator_given_name: string;
  vaccinator_middle_name: string;
}

const BHW_FULL_NAMES: Record<string, string> = {
  "cristeta": "Cristeta R. Lanuza",
  "evelyn": "Evelyn T. Ilao",
  "cecilia": "Cecilia G. Benosa",
  "merlita": "Merlita R. Alonzo",
  "suzette": "Suzette B. Lopez",
  "amelita": "Amelita R. Sayat",
  "wilma": "Wilma D. Tanyag",
  "nenita": "Nenita M. Dimaculangan",
  "mercy": "Mercy O. Abanilla",
  "renchie": "Renchie V. Ilao",
  "renalyn": "Renalyn D. Laurente",
  "maribel": "Maribel M. Abayon",
  "krystel": "Krystel Comia",
};

const resolveBhwFullName = (rawName: string): string => {
  if (!rawName) return "";
  const lower = rawName.toLowerCase().trim();
  for (const [key, fullName] of Object.entries(BHW_FULL_NAMES)) {
    if (lower === key || lower.includes(key)) {
      return fullName;
    }
  }
  return rawName;
};

const initialSickForm: SickChildFormFull = {
  fn_number: "",
  first_name: "",
  middle_name: "",
  surname: "",
  dob: "",
  age_months: "",
  sex: "Male",
  address: "Subukin",
  philhealth_number: "",
  mother_name: "",
  father_name: "",
  contact_number: "",
  weight_kg: "",
  height_cm: "",
  temp_c: "",
  pulse_rate: "",
  respiratory_rate: "",
  examiner_name: "",
  date_examined: new Date().toISOString().split("T")[0],
  chief_complaint: "",
  consultation_type: "",

  unable_to_drink: null,
  vomits_everything: null,
  has_convulsions: null,
  lethargic_unconscious: null,
  classification_danger: "",

  has_cough: null,
  cough_days: "",
  respiratory_rate_val: "",
  fast_breathing: null,
  chest_indrawing: null,
  stridor: null,
  classification_cough: "",

  has_diarrhea: null,
  diarrhea_days: "",
  blood_in_stool: null,
  eye_condition: "",
  skin_pinch: "",
  drinking_ability: "",
  classification_diarrhea: "",

  has_fever: null,
  fever_history: null,
  fever_days: "",
  fever_everyday_7days: null,
  stiff_neck: null,
  classification_fever: "",

  measles_past_3months: null,
  measles_rash: null,
  measles_cough_runny_red_eyes: null,
  mouth_sores: "",
  eye_pus_clouding: "",
  classification_measles: "",

  dengue_bleeding: null,
  dengue_dark_vomit_stool: null,
  dengue_abdominal_pain: null,
  dengue_persistent_vomiting: null,
  dengue_petechiae: null,
  dengue_cold_extremities: null,
  capillary_refill_sec: "",
  tourniquet_test_positive: null,
  classification_dengue: "",

  has_ear_problem: null,
  ear_pain: null,
  ear_discharge: null,
  ear_discharge_days: "",
  ear_swelling_behind: null,
  classification_ear: "",

  vaccines_given: [],
  vaccines_needed_today: "",
  return_date_vaccine: "",

  vit_a_past_6months: null,
  vit_a_needed_today: null,

  very_low_weight: null,
  severe_wasting: null,
  edema_both_feet: null,
  muac_cm: "",
  classification_malnutrition: "",

  palmar_pallor_some: null,
  palmar_pallor_severe: null,
  classification_anemia: "",

  breastfeeding: null,
  breastfeed_times: "",
  other_food_drinks: null,
  other_food_details: "",
  other_food_times: "",
  feeding_utensils: "",
  food_amount: "",
  own_plate: null,
  person_feeding: "",
  how_fed: "",
  feeding_changed_during_illness: null,
  feeding_change_details: "",

  how_plays: "",
  how_talks: "",
  other_problems: "",

  doctor_see: null,
  treatment_notes: "",
  advice_notes: "",
  urgent_return_advice: "",
  feeding_advice: "",
  return_health_center_date: "",
};

const ChildHealthForm = () => {
  const { t } = useSettings();
  const { user, fullName, username } = useAuth();
  const [activeTab, setActiveTab] = useState("sick-children");

  const loggedInWorkerName = useMemo(() => {
    const raw = 
      fullName ||
      localStorage.getItem("logged_in_fullname") ||
      localStorage.getItem("active_bhw_worker") ||
      user?.user_metadata?.full_name ||
      username ||
      localStorage.getItem("logged_in_username") ||
      user?.email?.split("@")[0] ||
      "";
    return resolveBhwFullName(raw);
  }, [fullName, username, user]);
  const [residents, setResidents] = useState<any[]>([]);
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);
  const [savedHealthRecords, setSavedHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // History & Modal
  const [historySearch, setHistorySearch] = useState("");
  const [historySitio, setHistorySitio] = useState("all");
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewRecordModalOpen, setViewRecordModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const STORAGE_KEY_VITA_DRAFT = "bhw_child_health_vita_draft";
  const STORAGE_KEY_SIA_DRAFT = "bhw_child_health_sia_draft";

  const createBlankVitARows = (count = 20): VitaminARow[] => {
    const rows: VitaminARow[] = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        id: `vrow-${i + 1}`,
        child_name: "",
        dob: "",
        v6m_1st: "",
        v12_23_v1: "", v12_23_v2: "", v12_23_d1: "", v12_23_d2: "",
        v24_35_v1: "", v24_35_v2: "", v24_35_d1: "", v24_35_d2: "",
        v36_47_v1: "", v36_47_v2: "", v36_47_d1: "", v36_47_d2: "",
        v48_59_v1: "", v48_59_v2: "", v48_59_d1: "", v48_59_d2: "",
      });
    }
    return rows;
  };

  const createBlankSIARows = (count = 20): SIARow[] => {
    const rows: SIARow[] = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        id: `srow-${i + 1}`,
        child_family_name: "",
        child_given_name: "",
        child_middle_name: "",
        dob: "",
        age_months: "",
        gender: "",
        barangay: "Subukin",
        purok_sitio_street: "",
        mother_family_name: "",
        mother_given_name: "",
        mother_middle_name: "",
        vaccine_given: "",
        vaccination_date: "",
        vaccinator_family_name: "",
        vaccinator_given_name: "",
        vaccinator_middle_name: "",
      });
    }
    return rows;
  };

  // FORM 1 State
  const [sickForm, setSickForm] = useState<SickChildFormFull>(() => ({
    ...initialSickForm,
    examiner_name: loggedInWorkerName || "",
  }));
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");

  useEffect(() => {
    if (loggedInWorkerName) {
      setSickForm(prev => {
        if (!prev.examiner_name || prev.examiner_name === "Cristeta R. Lanuza" || prev.examiner_name === "Nag-eksamen") {
          return { ...prev, examiner_name: loggedInWorkerName };
        }
        return prev;
      });
    }
  }, [loggedInWorkerName]);

  // FORM 2 State (Vitamin A & Deworming Master List - RHU2)
  const [vitAInfo, setVitAInfo] = useState({
    sitio: "Subukin",
    year: new Date().getFullYear().toString(),
  });
  const [vitARows, setVitARows] = useState<VitaminARow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VITA_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 20) return parsed;
      }
    } catch {}
    return createBlankVitARows(20);
  });

  // FORM 3 State (Supplemental Immunization Activity - SIA Masterlist)
  const [siaInfo, setSiaInfo] = useState({
    region: "IV-A CALABARZON",
    province: "BATANGAS",
    municipality: "SAN JUAN",
    barangay: "SUBUKIN",
    activity_date: "SEPT 2021 - FEB 2024",
  });
  const [siaRows, setSiaRows] = useState<SIARow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIA_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 20) {
          const hasInput = parsed.some((r: any) =>
            Boolean(
              (r.child_family_name && r.child_family_name.trim()) ||
              (r.child_given_name && r.child_given_name.trim()) ||
              (r.child_middle_name && r.child_middle_name.trim()) ||
              (r.dob && r.dob.trim()) ||
              (r.mother_family_name && r.mother_family_name.trim()) ||
              (r.vaccine_given && r.vaccine_given.trim())
            )
          );
          if (hasInput) return parsed;
        }
      }
    } catch {}
    return createBlankSIARows(20);
  });

  useEffect(() => {
    if (vitARows.length > 0) {
      localStorage.setItem(STORAGE_KEY_VITA_DRAFT, JSON.stringify(vitARows));
    }
  }, [vitARows]);

  useEffect(() => {
    if (siaRows.length > 0) {
      localStorage.setItem(STORAGE_KEY_SIA_DRAFT, JSON.stringify(siaRows));
    }
  }, [siaRows]);

  const fetchResidents = async () => {
    const data = await getFamilyOnlyResidents();
    setResidents(data || []);
  };

  const fetchSavedRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("child_health" as any)
      .select("*")
      .order("created_at", { ascending: false });

    setSavedHealthRecords(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchResidents();
    fetchSavedRecords();
    getDatabaseSitios().then(sits => setSitioOptions(sits));
  }, []);

  const getRecordFormType = (rec: any): "sick-children" | "vitamin-a" | "sia-masterlist" => {
    if (rec.details) {
      try {
        const d = typeof rec.details === "string" ? JSON.parse(rec.details) : rec.details;
        if (d.form_type === "care_for_sick_children_2m_5y") return "sick-children";
        if (d.form_type === "vitamin_a_rhu2_masterlist") return "vitamin-a";
        if (d.form_type === "sia_masterlist_6_59m") return "sia-masterlist";
      } catch {}
    }
    const remarks = (rec.remarks || "").toLowerCase();
    if (remarks.includes("[vitamin a") || remarks.includes("vitamin a & deworming")) {
      return "vitamin-a";
    }
    if (remarks.includes("[sia masterlist") || remarks.includes("sia master list") || remarks.includes("sia masterlist")) {
      return "sia-masterlist";
    }
    return "sick-children";
  };

  const getRecordChildName = (rec: any) => {
    if (rec.residents?.full_name) return rec.residents.full_name;
    if (rec.details) {
      try {
        const d = typeof rec.details === "string" ? JSON.parse(rec.details) : rec.details;
        if (d.first_name || d.surname) {
          const name = `${d.first_name || ""} ${d.middle_name || ""} ${d.surname || ""}`.trim();
          if (name) return name;
        }
        if (d.row_data?.child_name) return d.row_data.child_name;
        if (d.row_data?.child_family_name || d.row_data?.child_given_name) {
          const name = `${d.row_data?.child_given_name || ""} ${d.row_data?.child_middle_name || ""} ${d.row_data?.child_family_name || ""}`.trim();
          if (name) return name;
        }
      } catch {}
    }
    if (rec.remarks) {
      if (rec.remarks.includes("Child:")) {
        const match = rec.remarks.match(/Child:\s*([^,]+)/);
        if (match && match[1]) return match[1].trim();
      }
      const bracketMatch = rec.remarks.match(/\]\s*([^(]+)/);
      if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim();
    }
    return "Child Patient";
  };

  const getRecordSitio = (rec: any) => {
    if (rec.sitio) return rec.sitio;
    if (rec.residents?.sitio) return rec.residents.sitio;
    if (rec.details) {
      try {
        const d = typeof rec.details === "string" ? JSON.parse(rec.details) : rec.details;
        if (d.address) return d.address;
        if (d.header?.sitio) return d.header.sitio;
        if (d.row_data?.purok_sitio_street) return d.row_data.purok_sitio_street;
        if (d.row_data?.barangay) return d.row_data.barangay;
      } catch {}
    }
    return "";
  };

  const sickRecordsCount = savedHealthRecords.filter(r => getRecordFormType(r) === "sick-children").length;
  const vitARecordsCount = savedHealthRecords.filter(r => getRecordFormType(r) === "vitamin-a").length;
  const siaRecordsCount = savedHealthRecords.filter(r => getRecordFormType(r) === "sia-masterlist").length;

  const renderHistoryCard = (formType: "sick-children" | "vitamin-a" | "sia-masterlist") => {
    const formRecords = savedHealthRecords.filter(r => getRecordFormType(r) === formType);
    const term = historySearch.toLowerCase().trim();

    const displayedRecords = formRecords.filter(r => {
      if (historySitio !== "all") {
        const s = getRecordSitio(r).toLowerCase();
        if (!s.includes(historySitio.toLowerCase())) return false;
      }
      if (!term) return true;
      const childName = getRecordChildName(r).toLowerCase();
      const remarks = (r.remarks || "").toLowerCase();
      const checkupDate = (r.checkup_date || "").toLowerCase();
      const detailsStr = typeof r.details === "string" ? r.details.toLowerCase() : JSON.stringify(r.details || {}).toLowerCase();
      return childName.includes(term) || remarks.includes(term) || checkupDate.includes(term) || detailsStr.includes(term);
    });

    const configs = {
      "sick-children": {
        title: "Saved Care for Sick Children Records History",
        subtitle: "Barangay Subukin – Care for Sick Children (2m - 5y) Clinical Database",
        icon: <Stethoscope className="h-5 w-5 text-sky-600" />,
        badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200",
        emptyMsg: "No saved Care for Sick Children records found.",
      },
      "vitamin-a": {
        title: "Saved Vitamin A & Deworming Master List History",
        subtitle: "Barangay Subukin – Vitamin A & Deworming Master List RHU2 Database",
        icon: <Pill className="h-5 w-5 text-amber-600" />,
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
        emptyMsg: "No saved Vitamin A & Deworming master list records found.",
      },
      "sia-masterlist": {
        title: "Saved SIA Master List History",
        subtitle: "Barangay Subukin – Supplemental Immunization Activity (6–59 Months) Database",
        icon: <Syringe className="h-5 w-5 text-emerald-600" />,
        badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
        emptyMsg: "No saved SIA master list records found.",
      },
    };

    const config = configs[formType];

    return (
      <Card className="border border-border/50 shadow-md bg-card text-card-foreground no-print mt-6">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 font-heading">
                  {config.title}
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${config.badgeColor}`}>
                    {formRecords.length} {formRecords.length === 1 ? "record" : "records"}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <div className="relative w-full md:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search child name..." 
                  value={historySearch} 
                  onChange={e => setHistorySearch(e.target.value)} 
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={historySitio} onValueChange={setHistorySitio}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="All Sitios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sitios</SelectItem>
                  {sitioOptions.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintHistory}
                disabled={displayedRecords.length === 0}
                className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 shrink-0"
              >
                <Printer className="h-3.5 w-3.5" />
                Print History
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Loading records...</div>
          ) : displayedRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">{config.emptyMsg}</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  {formType === "sick-children" && (
                    <>
                      <th className="p-3">Checkup Date</th>
                      <th className="p-3">Child's Name</th>
                      <th className="p-3">Age & Sex</th>
                      <th className="p-3">Chief Complaint / Summary</th>
                      <th className="p-3 text-right">Actions</th>
                    </>
                  )}
                  {formType === "vitamin-a" && (
                    <>
                      <th className="p-3">Date Saved</th>
                      <th className="p-3">Child's Name</th>
                      <th className="p-3">Date of Birth</th>
                      <th className="p-3">Sitio</th>
                      <th className="p-3">Dose Records / Remarks</th>
                      <th className="p-3 text-right">Actions</th>
                    </>
                  )}
                  {formType === "sia-masterlist" && (
                    <>
                      <th className="p-3">Vaccination Date</th>
                      <th className="p-3">Child's Name</th>
                      <th className="p-3">Age & Gender</th>
                      <th className="p-3">Vaccine Given</th>
                      <th className="p-3">Sitio / Address</th>
                      <th className="p-3">Vaccinator</th>
                      <th className="p-3 text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedRecords.map(rec => {
                  let detailsObj: any = null;
                  try {
                    if (rec.details) {
                      detailsObj = typeof rec.details === "string" ? JSON.parse(rec.details) : rec.details;
                    }
                  } catch {}

                  const childName = getRecordChildName(rec);

                  return (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      {formType === "sick-children" && (
                        <>
                          <td className="p-3 font-medium text-foreground">{rec.checkup_date || "—"}</td>
                          <td className="p-3 font-bold text-foreground">{childName}</td>
                          <td className="p-3 text-muted-foreground">
                            {detailsObj?.age_months ? `${detailsObj.age_months} mos (${detailsObj.sex || "—"})` : "—"}
                          </td>
                          <td className="p-3 max-w-md truncate text-muted-foreground">
                            {detailsObj?.chief_complaint ? `Complaint: ${detailsObj.chief_complaint}` : rec.remarks || "—"}
                          </td>
                        </>
                      )}
                      {formType === "vitamin-a" && (
                        <>
                          <td className="p-3 font-medium text-foreground">{rec.checkup_date || "—"}</td>
                          <td className="p-3 font-bold text-foreground">{childName}</td>
                          <td className="p-3 text-muted-foreground">{detailsObj?.row_data?.dob || "—"}</td>
                          <td className="p-3 text-muted-foreground">{detailsObj?.header?.sitio || "Subukin"}</td>
                          <td className="p-3 max-w-md truncate text-muted-foreground">{rec.remarks || "—"}</td>
                        </>
                      )}
                      {formType === "sia-masterlist" && (
                        <>
                          <td className="p-3 font-medium text-foreground">
                            {detailsObj?.row_data?.vaccination_date || rec.checkup_date || "—"}
                          </td>
                          <td className="p-3 font-bold text-foreground">{childName}</td>
                          <td className="p-3 text-muted-foreground">
                            {detailsObj?.row_data?.age_months ? `${detailsObj.row_data.age_months} mos (${detailsObj.row_data.gender === "M" ? "Male" : detailsObj.row_data.gender === "F" ? "Female" : detailsObj.row_data.gender || "—"})` : "—"}
                          </td>
                          <td className="p-3 font-medium text-sky-700 dark:text-sky-300">
                            {detailsObj?.row_data?.vaccine_given || "—"}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {detailsObj?.row_data?.purok_sitio_street || detailsObj?.row_data?.barangay || "Subukin"}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {`${detailsObj?.row_data?.vaccinator_given_name || ''} ${detailsObj?.row_data?.vaccinator_family_name || ''}`.trim() || "—"}
                          </td>
                        </>
                      )}
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedRecordForView(rec);
                            setViewRecordModalOpen(true);
                          }} 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="View record details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setDeleteConfirmId(rec.id)} 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete record"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleSelectResidentForSick = (resId: string) => {
    setSelectedResidentId(resId);
    const res = residents.find(r => r.id === resId);
    if (!res) return;

    // Split name
    const parts = (res.full_name || "").trim().split(" ");
    let fName = parts[0] || "";
    let sName = parts.length > 1 ? parts[parts.length - 1] : "";
    let mName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";

    let computedMonths = "";
    if (res.birthday) {
      const birth = new Date(res.birthday);
      const today = new Date();
      const m = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      computedMonths = String(m > 0 ? m : 0);
    } else if (res.age) {
      computedMonths = String(res.age * 12);
    }

    setSickForm(prev => ({
      ...prev,
      fn_number: res.family_number || prev.fn_number,
      first_name: fName,
      middle_name: mName,
      surname: sName,
      dob: res.birthday || prev.dob,
      age_months: computedMonths || prev.age_months,
      sex: res.gender || prev.sex,
      address: res.sitio || prev.address,
      mother_name: res.mother_name || prev.mother_name,
      father_name: res.father_name || prev.father_name,
    }));
  };

  const toggleVaccine = (vaccine: string) => {
    setSickForm(prev => {
      const exists = prev.vaccines_given.includes(vaccine);
      return {
        ...prev,
        vaccines_given: exists ? prev.vaccines_given.filter(v => v !== vaccine) : [...prev.vaccines_given, vaccine]
      };
    });
  };

  const handleResetSickForm = () => {
    setSickForm({
      ...initialSickForm,
      examiner_name: loggedInWorkerName,
    });
    setSelectedResidentId("");
    setResetConfirmOpen(false);
    toast.info("Form reset.");
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const rec = savedHealthRecords.find(r => r.id === id);
      const { error } = await supabase.from("child_health" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Child health record deleted successfully");
      logActivity("delete_child_health", {
        entity_type: "child_health",
        entity_id: id,
        description: `Deleted child health record for ${getRecordChildName(rec)}`
      });
      setDeleteConfirmId(null);
      fetchSavedRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete child health record");
    }
  };

  const handleSaveSickChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${sickForm.first_name} ${sickForm.middle_name} ${sickForm.surname}`.trim();
    if (!fullName) {
      toast.error("Please enter the child's name.");
      return;
    }

    setSaving(true);
    try {
      const targetResId = selectedResidentId || await ensureResidentExists({
        fullName,
        sitio: sickForm.address,
        gender: sickForm.sex,
        birthday: sickForm.dob,
        fatherName: sickForm.father_name,
        motherName: sickForm.mother_name,
      });

      const summaryText = `[Care for Sick Child 2m-5y] ${fullName} (${sickForm.age_months} mos) - Complaint: ${sickForm.chief_complaint || "N/A"}. Classifications: Cough (${sickForm.classification_cough}), Diarrhea (${sickForm.classification_diarrhea}), Fever (${sickForm.classification_fever}), Dengue (${sickForm.classification_dengue})`;

      const payload = {
        resident_id: targetResId,
        checkup_date: sickForm.date_examined || new Date().toISOString().split("T")[0],
        remarks: summaryText,
        details: JSON.stringify({
          form_type: "care_for_sick_children_2m_5y",
          ...sickForm,
        }),
      };

      const { error } = await supabase.from("child_health" as any).insert(payload as any);

      if (error) {
        toast.error("Failed to save record.");
      } else {
        toast.success("Care for Sick Child record saved successfully.");
        logActivity("submit_child_health", {
          entity_type: "child_health",
          description: `Saved Care for Sick Child record for: ${fullName}`,
        });
        setSickForm(initialSickForm);
        setSelectedResidentId("");
        fetchSavedRecords();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving record.");
    } finally {
      setSaving(false);
    }
  };



  const handleSaveVitAMasterlist = async () => {
    const validRows = vitARows.filter(r => r.child_name.trim());
    if (validRows.length === 0) {
      toast.error("Please enter at least one child's name.");
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const row of validRows) {
        const resId = await ensureResidentExists({
          fullName: row.child_name,
          sitio: vitAInfo.sitio,
          birthday: row.dob,
        });

        const remarksText = `[Vitamin A & Deworming Master List RHU2] Child: ${row.child_name}, DOB: ${row.dob || "N/A"}`;

        const payload = {
          resident_id: resId,
          checkup_date: new Date().toISOString().split("T")[0],
          remarks: remarksText,
          details: JSON.stringify({ form_type: "vitamin_a_rhu2_masterlist", header: vitAInfo, row_data: row }),
        };

        const { error } = await supabase.from("child_health" as any).insert(payload as any);
        if (!error) savedCount++;
      }

      toast.success(`Successfully saved ${savedCount} Vitamin A & Deworming entries.`);
      logActivity("submit_child_health", { entity_type: "child_health", description: `Saved ${savedCount} Vitamin A & Deworming records` });
      localStorage.removeItem(STORAGE_KEY_VITA_DRAFT);
      setVitARows(createBlankVitARows(20));
      fetchSavedRecords();
    } catch (err) {
      console.error(err);
      toast.error("Error saving Vitamin A masterlist.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSIAMasterlist = async () => {
    const validRows = siaRows.filter(r => r.child_family_name.trim() || r.child_given_name.trim());
    if (validRows.length === 0) {
      toast.error("Please enter at least one child's name.");
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const row of validRows) {
        const fullChildName = `${row.child_given_name} ${row.child_middle_name} ${row.child_family_name}`.trim();
        const resId = await ensureResidentExists({
          fullName: fullChildName,
          sitio: row.purok_sitio_street || "Subukin",
          gender: row.gender === "M" ? "Male" : "Female",
          birthday: row.dob,
        });

        const remarksText = `[SIA Masterlist (6-59m)] Child: ${fullChildName}, Vaccine: ${row.vaccine_given || "N/A"}, Date: ${row.vaccination_date || "N/A"}`;

        const payload = {
          resident_id: resId,
          checkup_date: row.vaccination_date || new Date().toISOString().split("T")[0],
          remarks: remarksText,
          details: JSON.stringify({ form_type: "sia_masterlist_6_59m", campaign_info: siaInfo, row_data: row }),
        };

        const { error } = await supabase.from("child_health" as any).insert(payload as any);
        if (!error) savedCount++;
      }

      toast.success(`Successfully saved ${savedCount} SIA masterlist entries.`);
      logActivity("submit_child_health", { entity_type: "child_health", description: `Saved ${savedCount} SIA records` });
      localStorage.removeItem(STORAGE_KEY_SIA_DRAFT);
      setSiaRows(createBlankSIARows(20));
      fetchSavedRecords();
    } catch (err) {
      console.error(err);
      toast.error("Error saving SIA masterlist.");
    } finally {
      setSaving(false);
    }
  };


  const handlePrint = () => window.print();

  const handlePrintSummary = () => {
    document.body.classList.add("printing-summary");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-summary");
    }, 1000);
  };

  const handlePrintHistory = () => {
    document.body.classList.add("printing-history");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-history");
    }, 1000);
  };

  const lineInputClass = "w-full text-xs border-0 border-b border-slate-400 dark:border-slate-500 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus:outline-none px-1 h-6";
  const lineInputInlineClass = "inline-block text-xs border-0 border-b border-slate-400 dark:border-slate-500 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus:outline-none px-1 h-5 text-center";

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only {
          display: none !important;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }

          /* Reset Radix Dialog overlay positioning during summary print to remove blank top margin */
          body.printing-summary [role="dialog"],
          body.printing-summary [data-radix-portal],
          body.printing-summary div[data-state="open"] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          
          /* If printing summary modal, hide child-print-area completely */
          body.printing-summary #child-print-area,
          body.printing-summary #child-print-area * {
            display: none !important;
            visibility: hidden !important;
          }
          body.printing-summary #summary-print-area,
          body.printing-summary #summary-print-area * {
            visibility: visible !important;
          }

          /* History Print Mode */
          body.printing-history #child-history-print-area,
          body.printing-history #child-history-print-area *:not(.no-print):not(.no-print *) {
            visibility: visible !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          body.printing-history #child-history-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10px 15px !important;
            margin: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          body.printing-history #child-history-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          body.printing-history #child-history-print-area th,
          body.printing-history #child-history-print-area td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 10px !important;
            color: #000000 !important;
          }
          body.printing-history #child-history-print-area th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }

          /* If printing main form, make child-print-area visible */
          body:not(.printing-summary):not(.printing-history) #child-print-area,
          body:not(.printing-summary):not(.printing-history) #child-print-area * {
            visibility: visible !important;
          }

          #child-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: white !important;
            padding: 2px 4px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: black !important;
          }

          #summary-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 8px !important;
            margin: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            z-index: 99999 !important;
          }

          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
            width: 100% !important;
            flex-direction: column !important;
            align-items: center !important;
          }

          /* Official Printable Header Seal */
          .header-seal {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            border-bottom: 4px double #000000 !important;
            padding-bottom: 10px !important;
            margin-bottom: 10px !important;
            text-align: center !important;
          }
          .header-seal img, .print-only img {
            height: 80px !important;
            max-height: 80px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }

          /* Scaled Font Sizes and Compact Padding for Sick Children Portrait Form */
          #child-print-area form {
            font-size: 7.8px !important;
            line-height: 1.15 !important;
          }

          #child-print-area .border {
            border-color: #cbd5e1 !important;
          }

          #child-print-area .p-3,
          #child-print-area .p-4,
          #child-print-area .p-5,
          #child-print-area .p-6,
          #child-print-area .p-2\.5 {
            padding: 2px 4px !important;
          }

          #child-print-area .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 3px !important;
          }
          #child-print-area .space-y-5 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2.5px !important;
          }
          #child-print-area .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2px !important;
          }
          #child-print-area .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 1.5px !important;
          }
          #child-print-area .space-y-2\.5 > :not([hidden]) ~ :not([hidden]),
          #child-print-area .space-y-2 > :not([hidden]) ~ :not([hidden]),
          #child-print-area .space-y-1\.5 > :not([hidden]) ~ :not([hidden]),
          #child-print-area .space-y-1 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 1px !important;
          }

          #child-print-area label,
          #child-print-area span,
          #child-print-area p,
          #child-print-area div {
            font-size: 7.8px !important;
            line-height: 1.15 !important;
            color: #000000 !important;
          }

          #child-print-area h1 {
            font-size: 10.5px !important;
            font-weight: 800 !important;
            margin: 0 !important;
            padding: 1px 0 !important;
            color: #000000 !important;
          }

          #child-print-area .text-xs,
          #child-print-area .text-\[11px\],
          #child-print-area .text-\[10px\],
          #child-print-area .text-\[9px\] {
            font-size: 7.8px !important;
            line-height: 1.15 !important;
          }

          #child-print-area .bg-slate-800 {
            background-color: #1e293b !important;
            color: #ffffff !important;
            padding: 1px 3px !important;
            font-size: 7.8px !important;
          }
          #child-print-area .bg-slate-800 * {
            color: #ffffff !important;
          }

          #child-print-area input[type="text"],
          #child-print-area input[type="number"],
          #child-print-area input[type="date"] {
            height: 13px !important;
            min-height: 13px !important;
            font-size: 7.8px !important;
            padding: 0 1px !important;
            line-height: 13px !important;
            color: #000000 !important;
          }

          #child-print-area textarea {
            font-size: 7.8px !important;
            line-height: 1.15 !important;
            height: 32px !important;
            min-height: 32px !important;
            padding: 1px 2px !important;
          }

          #child-print-area input[type="radio"],
          #child-print-area input[type="checkbox"] {
            width: 9px !important;
            height: 9px !important;
            margin: 0 1.5px 0 0 !important;
            vertical-align: middle !important;
          }

          #child-print-area .border.rounded-md,
          #child-print-area .border.rounded {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Landscape Table Styles - Wide Masterlists fit cleanly across full sheet width */
          table {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
          }

          thead th {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 2px 2px !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-align: center !important;
          }

          tbody tr {
            height: 6mm !important;
          }

          tbody td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 1px 2px !important;
            font-size: 8.5px !important;
            line-height: 1.1 !important;
            height: 6mm !important;
            vertical-align: middle !important;
            text-align: center !important;
          }

          tbody td input {
            border: none !important;
            font-size: 8.5px !important;
            text-align: inherit !important;
            color: #000000 !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            height: auto !important;
          }

          tbody td span {
            color: #000000 !important;
            font-size: 8.5px !important;
          }

          ::placeholder,
          ::-webkit-input-placeholder,
          ::-moz-placeholder,
          :-ms-input-placeholder,
          input::placeholder,
          textarea::placeholder {
            color: transparent !important;
            opacity: 0 !important;
            -webkit-text-fill-color: transparent !important;
          }
          input[type="date"]:invalid::-webkit-datetime-edit,
          input[type="date"]:not([value])::-webkit-datetime-edit,
          input[type="date"][value=""]::-webkit-datetime-edit,
          .empty-date::-webkit-datetime-edit {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .overflow-x-auto, .overflow-y-auto, .overflow-auto {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          select {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            background: transparent !important;
          }
          @page {
            size: ${activeTab === "sick-children" ? "portrait" : "landscape"};
            margin: 4mm 5mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
          <Baby className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight">
            {t("child.title") || "Child Health & Immunization Registry"}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Comprehensive pediatric clinical management (Care for Sick Children 2m–5y), routine Vitamin A & Deworming distribution, and SIA vaccine masterlisting for Barangay Subukin.
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <Card id="child-print-area" className="border border-border/50 shadow-md bg-card text-card-foreground overflow-visible">
        <CardContent className="p-4 md:p-6 space-y-5 overflow-visible">
          
          {/* Official Seals Header - Printing Only */}
          <div className="print-only w-full" style={{ display: "none", width: "100%" }}>
            <OfficialHeader
              title="Child Health and Development Immunization Record"
              subtitle="Barangay Subukin Health Center • San Juan, Batangas"
              showDoubleBorder={true}
              logoHeight="75px"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            {/* Sticky Header Section (Stays 100% fixed & stationary at top of screen when scrolling page) */}
            <div className="sticky top-[58px] z-20 bg-card/95 backdrop-blur-md pt-3 pb-3 space-y-3 border-b border-border/40 shadow-xs -mx-4 px-4 md:-mx-6 md:px-6 -mt-4 md:-mt-6 no-print">
              
              {/* Action Bar & Barangay note */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
                  BRGY: <strong className="text-foreground">SUBUKIN</strong>
                </span>
              </div>

              {/* Navigation Tabs */}
              <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto p-1 bg-muted/60 rounded-lg">
                <TabsTrigger value="sick-children" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                  <span>Care for Sick Children (2m - 5y)</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold border-sky-200">
                    {sickRecordsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="vitamin-a" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Pill className="h-3.5 w-3.5 text-amber-600" />
                  <span>Vitamin A & RHU2 Master List</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold border-amber-200">
                    {vitARecordsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="sia-masterlist" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Syringe className="h-3.5 w-3.5 text-emerald-600" />
                  <span>SIA Master List (6–59 Months)</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-200">
                    {siaRecordsCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Form Title Banner & Resident Selector for Care for Sick Children */}
              {activeTab === "sick-children" && (
                <div className="space-y-3">
                  <div className="text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 relative w-full">
                    <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                      PANGANGALAGA SA BATANG MAY SAKIT EDAD 2 BUWAN HANGGANG 5 TAON
                    </h1>
                    <div className="absolute right-3 top-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      FN: <Input type="text" value={sickForm.fn_number} onChange={e => setSickForm(p => ({ ...p, fn_number: e.target.value }))} placeholder="FN 242" className="inline-block w-20 h-6 text-xs border-b border-t-0 border-x-0 rounded-none p-0 text-center" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-md border w-full">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" /> Select Registered Resident Child:
                    </span>
                    <Select value={selectedResidentId} onValueChange={handleSelectResidentForSick}>
                      <SelectTrigger className="h-8 text-xs bg-background w-72">
                        <SelectValue placeholder="Pumili ng residente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {residents.map(r => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.full_name} {r.sitio ? `(${r.sitio})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: Care for Sick Children (Aged 2 Months to 5 Years) - Official Form Replica */}
            <TabsContent value="sick-children" className="mt-4 space-y-6 w-full max-w-full">
              
              {/* Form Title Banner for Printout Only */}
              <div className="print-only text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 relative w-full mb-4">
                <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                  PANGANGALAGA SA BATANG MAY SAKIT EDAD 2 BUWAN HANGGANG 5 TAON
                </h1>
                <div className="absolute right-3 top-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  FN: {sickForm.fn_number || "FN 242"}
                </div>
              </div>

              {/* Form Body (Flows naturally with main background page scroll) */}
              <form onSubmit={handleSaveSickChild} className="space-y-6 text-xs">

                {/* Patient Information Box */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-3 bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">First Name:</Label>
                      <Input type="text" value={sickForm.first_name} onKeyDown={allowOnlyLetters} onChange={e => setSickForm(p => ({ ...p, first_name: sanitizeLetters(e.target.value) }))} placeholder="First Name" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Middle Name:</Label>
                      <Input type="text" value={sickForm.middle_name} onKeyDown={allowOnlyLetters} onChange={e => setSickForm(p => ({ ...p, middle_name: sanitizeLetters(e.target.value) }))} placeholder="Middle Name" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Surname:</Label>
                      <Input type="text" value={sickForm.surname} onKeyDown={allowOnlyLetters} onChange={e => setSickForm(p => ({ ...p, surname: sanitizeLetters(e.target.value) }))} placeholder="Surname" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Petsa ng Kapanganakan:</Label>
                      <Input type="date" value={sickForm.dob} onChange={e => setSickForm(p => ({ ...p, dob: e.target.value }))} className={`${lineInputClass} ${!sickForm.dob ? "empty-date" : ""}`} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Edad at Kasarian:</Label>
                      <div className="flex gap-1 items-center">
                        <Input type="text" value={sickForm.age_months} onKeyDown={allowOnlyNumbers} onChange={e => setSickForm(p => ({ ...p, age_months: sanitizeNumbers(e.target.value) }))} placeholder="Edad (mos)" className={lineInputClass} />
                        <Select value={sickForm.sex} onValueChange={v => setSickForm(p => ({ ...p, sex: v }))}>
                          <SelectTrigger className="h-7 text-xs w-16 px-1">
                            <SelectValue placeholder="M/F" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">M</SelectItem>
                            <SelectItem value="Female">F</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Address / Sitio:</Label>
                      <Select value={sickForm.address} onValueChange={v => setSickForm(p => ({ ...p, address: v }))}>
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue placeholder="Sitio" />
                        </SelectTrigger>
                        <SelectContent>
                          {sitioOptions.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">PHILHEALTH NUMBER:</Label>
                      <Input type="text" value={sickForm.philhealth_number} onKeyDown={allowOnlyNumbers} onChange={e => setSickForm(p => ({ ...p, philhealth_number: sanitizeNumbers(e.target.value) }))} placeholder="PhilHealth #" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pangalan ng Ina:</Label>
                      <Input type="text" value={sickForm.mother_name} onKeyDown={allowOnlyLetters} onChange={e => setSickForm(p => ({ ...p, mother_name: sanitizeLetters(e.target.value) }))} placeholder="Pangalan ng Ina" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pangalan ng Ama:</Label>
                      <Input type="text" value={sickForm.father_name} onKeyDown={allowOnlyLetters} onChange={e => setSickForm(p => ({ ...p, father_name: sanitizeLetters(e.target.value) }))} placeholder="Pangalan ng Ama" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Contact Number:</Label>
                      <Input type="text" value={sickForm.contact_number} onKeyDown={allowOnlyNumbers} onChange={e => setSickForm(p => ({ ...p, contact_number: sanitizeNumbers(e.target.value) }))} placeholder="Contact #" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Timbang (kg):</Label>
                      <Input type="text" value={sickForm.weight_kg} onKeyDown={allowNumbersAndDecimal} onChange={e => setSickForm(p => ({ ...p, weight_kg: sanitizeNumbersAndDecimal(e.target.value) }))} placeholder="kg" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Taas (cm):</Label>
                      <Input type="text" value={sickForm.height_cm} onKeyDown={allowNumbersAndDecimal} onChange={e => setSickForm(p => ({ ...p, height_cm: sanitizeNumbersAndDecimal(e.target.value) }))} placeholder="cm" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Temp (°C):</Label>
                      <Input type="text" value={sickForm.temp_c} onKeyDown={allowNumbersAndDecimal} onChange={e => setSickForm(p => ({ ...p, temp_c: sanitizeNumbersAndDecimal(e.target.value) }))} placeholder="°C" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pulse Rate (/min):</Label>
                      <Input type="text" value={sickForm.pulse_rate} onKeyDown={allowOnlyNumbers} onChange={e => setSickForm(p => ({ ...p, pulse_rate: sanitizeNumbers(e.target.value) }))} placeholder="/min" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Respiratory Rate (/min):</Label>
                      <Input type="text" value={sickForm.respiratory_rate} onKeyDown={allowOnlyNumbers} onChange={e => setSickForm(p => ({ ...p, respiratory_rate: sanitizeNumbers(e.target.value) }))} placeholder="/min" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-1">
                    <div className="md:col-span-2">
                      <Label className="text-[11px] font-medium text-slate-500">Pangalan ng nag-eksamen:</Label>
                      <Input type="text" value={sickForm.examiner_name} onChange={e => setSickForm(p => ({ ...p, examiner_name: e.target.value }))} placeholder="Nag-eksamen" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Petsa:</Label>
                      <Input type="date" value={sickForm.date_examined} onChange={e => setSickForm(p => ({ ...p, date_examined: e.target.value }))} className={`${lineInputClass} ${!sickForm.date_examined ? "empty-date" : ""}`} />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex-1 w-full">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Itanong: Ano ang problema ng bata?</Label>
                      <Input type="text" value={sickForm.chief_complaint} onChange={e => setSickForm(p => ({ ...p, chief_complaint: e.target.value }))} placeholder="Hal. ubo, sipon, lagnat" className={lineInputClass} />
                    </div>
                    <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                        <input type="radio" name="consultation_type" checked={sickForm.consultation_type === "Unang konsulta"} onChange={() => setSickForm(p => ({ ...p, consultation_type: "Unang konsulta" }))} />
                        <span>Unang konsulta</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                        <input type="radio" name="consultation_type" checked={sickForm.consultation_type === "Follow-up"} onChange={() => setSickForm(p => ({ ...p, consultation_type: "Follow-up" }))} />
                        <span>Follow-up</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* PAGE 1: MGA DAPAT SURIIN TABLE */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden bg-card">
                  <div className="grid grid-cols-12 bg-slate-200 dark:bg-slate-700 font-bold border-b border-slate-300 dark:border-slate-600 p-2 text-[11px] uppercase tracking-wider">
                    <div className="col-span-8">MGA DAPAT SURIIN</div>
                    <div className="col-span-4 border-l border-slate-300 dark:border-slate-600 pl-2">KLASIPIKASYON</div>
                  </div>

                  {/* 1. GENERAL DANGER SIGNS */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        TANUNGIN KUNG MAY GENERAL DANGER SIGNS
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1 pl-1">
                          {[
                            { key: "unable_to_drink", label: "Walang kakayahang uminom o sumuso" },
                            { key: "vomits_everything", label: "Sinusuka lahat ng pinapasok sa bibig" },
                            { key: "has_convulsions", label: "May kombulsyon" },
                            { key: "lethargic_unconscious", label: "Tulog ng tulog o mahirap gisingin" },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between text-xs">
                              <span>{item.label}</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={item.key} checked={sickForm[item.key as keyof SickChildFormFull] === true} onChange={() => setSickForm(p => ({ ...p, [item.key]: true }))} /> Oo
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={item.key} checked={sickForm[item.key as keyof SickChildFormFull] === false} onChange={() => setSickForm(p => ({ ...p, [item.key]: false }))} /> Hindi
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang General Danger Signs", "May General Danger Signs"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_danger" checked={sickForm.classification_danger === c} onChange={() => setSickForm(p => ({ ...p, classification_danger: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. ANG BATA BA AY INUUBO O NAHIHIRAPANG HUMINGA? */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase flex items-center justify-between">
                        <span>ANG BATA BA AY INUUBO O NAHIHIRAPANG HUMINGA?</span>
                        <div className="flex gap-3 text-xs text-white">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_cough" checked={sickForm.has_cough === true} onChange={() => setSickForm(p => ({ ...p, has_cough: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_cough" checked={sickForm.has_cough === false} onChange={() => setSickForm(p => ({ ...p, has_cough: false }))} /> HINDI</label>
                        </div>
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1.5 pl-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Ilang araw nang inuubo o nahihirapang huminga?</span>
                            <Input type="text" value={sickForm.cough_days} onChange={e => setSickForm(p => ({ ...p, cough_days: e.target.value }))} placeholder="___ araw" className={`w-20 ${lineInputInlineClass}`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Tingnan sa talaan ang respiratory rate: <Input type="text" value={sickForm.respiratory_rate_val} onChange={e => setSickForm(p => ({ ...p, respiratory_rate_val: e.target.value }))} placeholder="/min" className={`w-16 ${lineInputInlineClass}`} /> Mabilis ba ito para sa edad?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fast_breathing" checked={sickForm.fast_breathing === true} onChange={() => setSickForm(p => ({ ...p, fast_breathing: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fast_breathing" checked={sickForm.fast_breathing === false} onChange={() => setSickForm(p => ({ ...p, fast_breathing: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold">Tingnan at ramdamin:</span>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>• Lumalubog ba ang dibdib kapag humihinga?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="chest_indrawing" checked={sickForm.chest_indrawing === true} onChange={() => setSickForm(p => ({ ...p, chest_indrawing: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="chest_indrawing" checked={sickForm.chest_indrawing === false} onChange={() => setSickForm(p => ({ ...p, chest_indrawing: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>• May maingay ba na paghinga o stridor?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stridor" checked={sickForm.stridor === true} onChange={() => setSickForm(p => ({ ...p, stridor: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stridor" checked={sickForm.stridor === false} onChange={() => setSickForm(p => ({ ...p, stridor: false }))} /> Hindi</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Ubo o Sipon", "Simpleng Ubo o Sipon", "Pulmonya", "Malalang Pulmonya"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_cough" checked={sickForm.classification_cough === c} onChange={() => setSickForm(p => ({ ...p, classification_cough: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. ANG BATA BA AY NAGTATAE? */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase flex items-center justify-between">
                        <span>ANG BATA BA AY NAGTATAE?</span>
                        <div className="flex gap-3 text-xs text-white">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_diarrhea" checked={sickForm.has_diarrhea === true} onChange={() => setSickForm(p => ({ ...p, has_diarrhea: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_diarrhea" checked={sickForm.has_diarrhea === false} onChange={() => setSickForm(p => ({ ...p, has_diarrhea: false }))} /> HINDI</label>
                        </div>
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1.5 pl-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Ilang araw nang nagtatae?</span>
                            <Input type="text" value={sickForm.diarrhea_days} onChange={e => setSickForm(p => ({ ...p, diarrhea_days: e.target.value }))} placeholder="___ araw" className={`w-20 ${lineInputInlineClass}`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>May dugo ba sa dumi?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="blood_in_stool" checked={sickForm.blood_in_stool === true} onChange={() => setSickForm(p => ({ ...p, blood_in_stool: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="blood_in_stool" checked={sickForm.blood_in_stool === false} onChange={() => setSickForm(p => ({ ...p, blood_in_stool: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-semibold">Suriin ang bata:</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-2">
                              <div>
                                <Label className="text-[10px] text-slate-500">Mata:</Label>
                                <select value={sickForm.eye_condition} onChange={e => setSickForm(p => ({ ...p, eye_condition: e.target.value }))} className="w-full text-xs border rounded p-1">
                                  <option value="masigla, alerto">masigla, alerto</option>
                                  <option value="irritable, di mapakali">irritable, di mapakali</option>
                                  <option value="tutulog-tulog">tutulog-tulog / mahirap gisingin</option>
                                  <option value="hindi lubog">hindi lubog</option>
                                  <option value="lubog">lubog</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-500">Balat sa tiyan ('pag pinisil):</Label>
                                <select value={sickForm.skin_pinch} onChange={e => setSickForm(p => ({ ...p, skin_pinch: e.target.value }))} className="w-full text-xs border rounded p-1">
                                  <option value="mabilis">mabilis bumalik</option>
                                  <option value="mabagal (<2 sec)">mabagal (&lt;2 sec)</option>
                                  <option value="napakabagal (>2 sec)">napakabagal (&gt;2 sec)</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-500">Pag-inom:</Label>
                                <select value={sickForm.drinking_ability} onChange={e => setSickForm(p => ({ ...p, drinking_ability: e.target.value }))} className="w-full text-xs border rounded p-1">
                                  <option value="normal uminom">normal uminom</option>
                                  <option value="sabik uminom">sabik uminom</option>
                                  <option value="di makainom">di makainom / tamad uminom</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Pagtatae", "Pagtatae na Walang Panunuyo", "Pagtatae na May Panunuyo", "Pagtatae na May Malalang Panunuyo"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_diarrhea" checked={sickForm.classification_diarrhea === c} onChange={() => setSickForm(p => ({ ...p, classification_diarrhea: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. ANG BATA BA AY NILALAGNAT? */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase flex items-center justify-between">
                        <span>ANG BATA BA AY NILALAGNAT?</span>
                        <div className="flex gap-3 text-xs text-white">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_fever" checked={sickForm.has_fever === true} onChange={() => setSickForm(p => ({ ...p, has_fever: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_fever" checked={sickForm.has_fever === false} onChange={() => setSickForm(p => ({ ...p, has_fever: false }))} /> HINDI</label>
                        </div>
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1.5 pl-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Nilalagnat ba ayon sa kwento ng magulang? O mainit kapag hinipo? O ang temperature ay 37.5°C o higit pa?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fever_history" checked={sickForm.fever_history === true} onChange={() => setSickForm(p => ({ ...p, fever_history: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fever_history" checked={sickForm.fever_history === false} onChange={() => setSickForm(p => ({ ...p, fever_history: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ilang araw nang nilalagnat?</span>
                            <Input type="text" value={sickForm.fever_days} onChange={e => setSickForm(p => ({ ...p, fever_days: e.target.value }))} placeholder="___ araw" className="w-20 h-6 text-xs text-center border-b rounded-none" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Kung mahigit na sa 7araw, araw-araw bang nilalagnat ang bata?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fever_everyday_7days" checked={sickForm.fever_everyday_7days === true} onChange={() => setSickForm(p => ({ ...p, fever_everyday_7days: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="fever_everyday_7days" checked={sickForm.fever_everyday_7days === false} onChange={() => setSickForm(p => ({ ...p, fever_everyday_7days: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-semibold">Suriin ang bata:</span>
                            <div className="flex items-center justify-between pl-2">
                              <span>Mayroon bang paninigas ng batok?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stiff_neck" checked={sickForm.stiff_neck === true} onChange={() => setSickForm(p => ({ ...p, stiff_neck: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stiff_neck" checked={sickForm.stiff_neck === false} onChange={() => setSickForm(p => ({ ...p, stiff_neck: false }))} /> Hindi</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang lagnat", "Lagnat", "Malalang Lagnat"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_fever" checked={sickForm.classification_fever === c} onChange={() => setSickForm(p => ({ ...p, classification_fever: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. TIGDAS */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        ALAMIN KUNG MAY SENYALES NG TIGDAS
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1 pl-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Nagkaroon ba ng tigdas nitong nakaraang 3 buwan?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_past_3months" checked={sickForm.measles_past_3months === true} onChange={() => setSickForm(p => ({ ...p, measles_past_3months: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_past_3months" checked={sickForm.measles_past_3months === false} onChange={() => setSickForm(p => ({ ...p, measles_past_3months: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>May rash o butlig-butlig sa buong katawan?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_rash" checked={sickForm.measles_rash === true} onChange={() => setSickForm(p => ({ ...p, measles_rash: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_rash" checked={sickForm.measles_rash === false} onChange={() => setSickForm(p => ({ ...p, measles_rash: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>May ubo? sipon? O pamumula ng mata?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_cough_runny_red_eyes" checked={sickForm.measles_cough_runny_red_eyes === true} onChange={() => setSickForm(p => ({ ...p, measles_cough_runny_red_eyes: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="measles_cough_runny_red_eyes" checked={sickForm.measles_cough_runny_red_eyes === false} onChange={() => setSickForm(p => ({ ...p, measles_cough_runny_red_eyes: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t">
                            <div>
                              <Label className="text-[10px] text-slate-500 font-semibold">Suriin ang bibig:</Label>
                              <select value={sickForm.mouth_sores} onChange={e => setSickForm(p => ({ ...p, mouth_sores: e.target.value }))} className="w-full text-xs border rounded p-1">
                                <option value="walang singaw">walang singaw</option>
                                <option value="kaunti at mababaw na mga singaw">kaunti at mababaw na mga singaw</option>
                                <option value="marami at malalim na mga singaw">marami at malalim na mga singaw</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500 font-semibold">Suriin ang mga mata:</Label>
                              <select value={sickForm.eye_pus_clouding} onChange={e => setSickForm(p => ({ ...p, eye_pus_clouding: e.target.value }))} className="w-full text-xs border rounded p-1">
                                <option value="normal">normal</option>
                                <option value="may tumutulong nana">may tumutulong nana</option>
                                <option value="may pamumuti sa itim na parte ng mata">may pamumuti sa itim na parte ng mata</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Tigdas", "Tigdas", "Tigdas na May Komplikasyon sa Mata o Bibig", "Malalang Komplikadong Tigdas"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_measles" checked={sickForm.classification_measles === c} onChange={() => setSickForm(p => ({ ...p, classification_measles: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. DENGUE */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        ALAMIN KUNG MAY SENYALES NG DENGUE
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1 pl-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span>May pagdurugo sa ilong/ gilagid/ dumi/ suka?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_bleeding" checked={sickForm.dengue_bleeding === true} onChange={() => setSickForm(p => ({ ...p, dengue_bleeding: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_bleeding" checked={sickForm.dengue_bleeding === false} onChange={() => setSickForm(p => ({ ...p, dengue_bleeding: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Maitim ang isinusuka o idinudumi?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_dark_vomit_stool" checked={sickForm.dengue_dark_vomit_stool === true} onChange={() => setSickForm(p => ({ ...p, dengue_dark_vomit_stool: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_dark_vomit_stool" checked={sickForm.dengue_dark_vomit_stool === false} onChange={() => setSickForm(p => ({ ...p, dengue_dark_vomit_stool: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Tuloy-tuloy na sumasakit ang tiyan?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_abdominal_pain" checked={sickForm.dengue_abdominal_pain === true} onChange={() => setSickForm(p => ({ ...p, dengue_abdominal_pain: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_abdominal_pain" checked={sickForm.dengue_abdominal_pain === false} onChange={() => setSickForm(p => ({ ...p, dengue_abdominal_pain: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Tuloy-tuloy na nagsusuka?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_persistent_vomiting" checked={sickForm.dengue_persistent_vomiting === true} onChange={() => setSickForm(p => ({ ...p, dengue_persistent_vomiting: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_persistent_vomiting" checked={sickForm.dengue_persistent_vomiting === false} onChange={() => setSickForm(p => ({ ...p, dengue_persistent_vomiting: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="space-y-1 pt-1 border-t">
                            <span className="font-semibold">Suriin ang bata:</span>
                            <div className="flex items-center justify-between pl-2">
                              <span>May batik-batik na pula sa balat o petechiae?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_petechiae" checked={sickForm.dengue_petechiae === true} onChange={() => setSickForm(p => ({ ...p, dengue_petechiae: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_petechiae" checked={sickForm.dengue_petechiae === false} onChange={() => setSickForm(p => ({ ...p, dengue_petechiae: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-2">
                              <span>Malamig ang kamay at paa?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_cold_extremities" checked={sickForm.dengue_cold_extremities === true} onChange={() => setSickForm(p => ({ ...p, dengue_cold_extremities: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_cold_extremities" checked={sickForm.dengue_cold_extremities === false} onChange={() => setSickForm(p => ({ ...p, dengue_cold_extremities: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-2">
                              <span>Capillary Refill Time:</span>
                              <Input type="text" value={sickForm.capillary_refill_sec} onChange={e => setSickForm(p => ({ ...p, capillary_refill_sec: e.target.value }))} placeholder="___ seconds" className="w-24 h-5 text-xs border-b text-center" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-[10px]">Kung ang bata ay higit sa 6 na buwan AT walang senyales AT mahigit ng 2 araw nilalagnat, gawin ang tourniquet test. Positibo?</span>
                            <div className="flex gap-3 text-xs shrink-0 ml-2">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tourniquet_test_positive" checked={sickForm.tourniquet_test_positive === true} onChange={() => setSickForm(p => ({ ...p, tourniquet_test_positive: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tourniquet_test_positive" checked={sickForm.tourniquet_test_positive === false} onChange={() => setSickForm(p => ({ ...p, tourniquet_test_positive: false }))} /> Hindi</label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Dengue", "Lagnat: Malamang Hindi Dengue Hemorrhagic Fever", "Malalang Dengue Hemorrhagic Fever"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_dengue" checked={sickForm.classification_dengue === c} onChange={() => setSickForm(p => ({ ...p, classification_dengue: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 7. PROBLEMA SA TENGA */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase flex items-center justify-between">
                        <span>ANG BATA BA AY MAY PROBLEMA SA TENGA?</span>
                        <div className="flex gap-3 text-xs text-white">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_ear_problem" checked={sickForm.has_ear_problem === true} onChange={() => setSickForm(p => ({ ...p, has_ear_problem: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_ear_problem" checked={sickForm.has_ear_problem === false} onChange={() => setSickForm(p => ({ ...p, has_ear_problem: false }))} /> HINDI</label>
                        </div>
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="space-y-1.5 pl-1 text-xs">
                          <div>
                            <span className="font-semibold">Tanungin:</span>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>• Masakit ba ang tenga?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_pain" checked={sickForm.ear_pain === true} onChange={() => setSickForm(p => ({ ...p, ear_pain: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_pain" checked={sickForm.ear_pain === false} onChange={() => setSickForm(p => ({ ...p, ear_pain: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>• Mayroon bang tumutulo mula sa tenga (luga)?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_discharge" checked={sickForm.ear_discharge === true} onChange={() => setSickForm(p => ({ ...p, ear_discharge: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_discharge" checked={sickForm.ear_discharge === false} onChange={() => setSickForm(p => ({ ...p, ear_discharge: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>Kung meron, ilang araw na?</span>
                              <Input type="text" value={sickForm.ear_discharge_days} onChange={e => setSickForm(p => ({ ...p, ear_discharge_days: e.target.value }))} placeholder="___ araw" className="w-20 h-5 text-xs text-center border-b" />
                            </div>
                          </div>
                          <div className="pt-0.5">
                            <span className="font-semibold">Suriin:</span>
                            <div className="flex items-center justify-between pl-2 mt-0.5">
                              <span>• May pamamaga o pananakit sa likod ng tenga?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_swelling_behind" checked={sickForm.ear_swelling_behind === true} onChange={() => setSickForm(p => ({ ...p, ear_swelling_behind: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_swelling_behind" checked={sickForm.ear_swelling_behind === false} onChange={() => setSickForm(p => ({ ...p, ear_swelling_behind: false }))} /> Hindi</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Impeksyon sa Tenga", "Bagong Impeksyon sa Tenga", "Matagal na Impeksyon sa Tenga", "Mastoiditis"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_ear" checked={sickForm.classification_ear === c} onChange={() => setSickForm(p => ({ ...p, classification_ear: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* PAGE 2: IMMUNIZATION, VITAMIN A, NUTRITION, FEEDING & TREATMENT */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-4 bg-card">
                  
                  {/* 8. BAKUNA (VACCINES) */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        SURIIN ANG MGA BAKUNA NG BATA
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5 gap-2">
                      <div className="col-span-8 space-y-1 pr-2">
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Lagyan ng check ang mga bakunang naibigay na sa bata.</p>
                        <p className="text-[10px] text-slate-500 italic">Bilugan ang mga bakunang hindi pa naibibigay sa bata.</p>
                        
                        <div className="grid grid-cols-5 gap-1.5 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-semibold underline text-[10px] block">Pagkapanganak</span>
                            <label className="flex items-center space-x-1 cursor-pointer mt-1">
                              <Checkbox checked={sickForm.vaccines_given.includes("BCG")} onCheckedChange={() => toggleVaccine("BCG")} />
                              <span>BCG</span>
                            </label>
                          </div>
                          <div>
                            <span className="font-semibold underline text-[10px] block">6 linggo</span>
                            {["OPV1", "DPT1", "HepB1"].map(vac => (
                              <label key={vac} className="flex items-center space-x-1 cursor-pointer mt-1">
                                <Checkbox checked={sickForm.vaccines_given.includes(vac)} onCheckedChange={() => toggleVaccine(vac)} />
                                <span>{vac}</span>
                              </label>
                            ))}
                          </div>
                          <div>
                            <span className="font-semibold underline text-[10px] block">10 linggo</span>
                            {["OPV2", "DPT2", "HepB2"].map(vac => (
                              <label key={vac} className="flex items-center space-x-1 cursor-pointer mt-1">
                                <Checkbox checked={sickForm.vaccines_given.includes(vac)} onCheckedChange={() => toggleVaccine(vac)} />
                                <span>{vac}</span>
                              </label>
                            ))}
                          </div>
                          <div>
                            <span className="font-semibold underline text-[10px] block">14 linggo</span>
                            {["OPV3", "DPT3", "HepB3"].map(vac => (
                              <label key={vac} className="flex items-center space-x-1 cursor-pointer mt-1">
                                <Checkbox checked={sickForm.vaccines_given.includes(vac)} onCheckedChange={() => toggleVaccine(vac)} />
                                <span>{vac}</span>
                              </label>
                            ))}
                          </div>
                          <div>
                            <span className="font-semibold underline text-[10px] block">9 buwan</span>
                            <label className="flex items-center space-x-1 cursor-pointer mt-1">
                              <Checkbox checked={sickForm.vaccines_given.includes("Measles")} onCheckedChange={() => toggleVaccine("Measles")} />
                              <span>measles</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-2 flex flex-col justify-center">
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Bakuna na maaaring ibigay ngayon:</Label>
                          <Input type="text" value={sickForm.vaccines_needed_today} onChange={e => setSickForm(p => ({ ...p, vaccines_needed_today: e.target.value }))} className={lineInputClass} />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Bumalik para sa bakuna sa:</Label>
                          <Input type="text" value={sickForm.return_date_vaccine} onChange={e => setSickForm(p => ({ ...p, return_date_vaccine: e.target.value }))} className={lineInputClass} />
                          <p className="text-center text-[9px] text-slate-400 mt-0.5">(Petsa)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 9. VITAMIN A */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        SURIIN KUNG NABIGYAN NA NG VITAMIN A
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 p-2.5 gap-2">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <p className="text-[10px] text-slate-500 italic">(Para sa batang 6 na buwang gulang o higit pa)</p>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span>Nabigyan na ba ng Vitamin A nitong nakaraang 6 na buwan?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vit_a_past_6months" checked={sickForm.vit_a_past_6months === true} onChange={() => setSickForm(p => ({ ...p, vit_a_past_6months: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vit_a_past_6months" checked={sickForm.vit_a_past_6months === false} onChange={() => setSickForm(p => ({ ...p, vit_a_past_6months: false }))} /> Hindi</label>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                        <label className="flex items-center space-x-2 cursor-pointer text-xs">
                          <input type="radio" name="vit_a_needed_today" checked={sickForm.vit_a_needed_today === false} onChange={() => setSickForm(p => ({ ...p, vit_a_needed_today: false }))} />
                          <span>Hindi Kailangan ng Vitamin A ngayon</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-xs">
                          <input type="radio" name="vit_a_needed_today" checked={sickForm.vit_a_needed_today === true} onChange={() => setSickForm(p => ({ ...p, vit_a_needed_today: true }))} />
                          <span>Kailangan ng Vitamin A ngayon</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 10. MALNUTRISYON AT ANEMIA */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                        SURIIN KUNG MAY MALNUTRISYON O ANEMIA
                      </div>
                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 bg-transparent"></div>
                    </div>

                    {/* ALAMIN KUNG MAY MALNUTRISYON */}
                    <div className="grid grid-cols-12 p-2.5 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="font-bold text-[11px] uppercase text-slate-800 dark:text-slate-200">ALAMIN KUNG MAY MALNUTRISYON</div>
                        <div className="space-y-1 pl-1 text-xs">
                          <div>
                            <span>Tingnan sa talaan ang timbang:</span>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>Lubhang mababa para sa edad?(<u>very low weight for age</u>)</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="very_low_weight" checked={sickForm.very_low_weight === true} onChange={() => setSickForm(p => ({ ...p, very_low_weight: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="very_low_weight" checked={sickForm.very_low_weight === false} onChange={() => setSickForm(p => ({ ...p, very_low_weight: false }))} /> Hindi</label>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold">Suriin ang bata:</span>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>May malubha bang pangangayayat?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="severe_wasting" checked={sickForm.severe_wasting === true} onChange={() => setSickForm(p => ({ ...p, severe_wasting: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="severe_wasting" checked={sickForm.severe_wasting === false} onChange={() => setSickForm(p => ({ ...p, severe_wasting: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>Manas ba ang mga paa?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edema_both_feet" checked={sickForm.edema_both_feet === true} onChange={() => setSickForm(p => ({ ...p, edema_both_feet: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edema_both_feet" checked={sickForm.edema_both_feet === false} onChange={() => setSickForm(p => ({ ...p, edema_both_feet: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>Mid-upper Arm Circumference (MUAC)</span>
                              <div className="flex items-center gap-1">
                                <Input type="text" value={sickForm.muac_cm} onChange={e => setSickForm(p => ({ ...p, muac_cm: e.target.value }))} className="w-16 h-5 text-xs text-center border-b rounded-none" />
                                <span>cm</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang malnutrisyon", "Napakababang timbang", "Matinding malnutrisyon"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_malnutrition" checked={sickForm.classification_malnutrition === c} onChange={() => setSickForm(p => ({ ...p, classification_malnutrition: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ALAMIN KUNG MAY ANEMIA */}
                    <div className="grid grid-cols-12 p-2.5">
                      <div className="col-span-8 space-y-1.5 pr-2">
                        <div className="font-bold text-[11px] uppercase text-slate-800 dark:text-slate-200">ALAMIN KUNG MAY ANEMIA</div>
                        <div className="space-y-1 pl-1 text-xs">
                          <div>
                            <span className="font-semibold">Suriin ang palad:</span>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>Mayroon konting pamumutla?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="palmar_pallor_some" checked={sickForm.palmar_pallor_some === true} onChange={() => setSickForm(p => ({ ...p, palmar_pallor_some: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="palmar_pallor_some" checked={sickForm.palmar_pallor_some === false} onChange={() => setSickForm(p => ({ ...p, palmar_pallor_some: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-3 mt-0.5">
                              <span>Halos kulay puti ang palad?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="palmar_pallor_severe" checked={sickForm.palmar_pallor_severe === true} onChange={() => setSickForm(p => ({ ...p, palmar_pallor_severe: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="palmar_pallor_severe" checked={sickForm.palmar_pallor_severe === false} onChange={() => setSickForm(p => ({ ...p, palmar_pallor_severe: false }))} /> Hindi</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col text-xs">
                        {["Walang Anemia", "Anemia", "Malalang Anemia"].map(c => (
                          <label key={c} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="classification_anemia" checked={sickForm.classification_anemia === c} onChange={() => setSickForm(p => ({ ...p, classification_anemia: c }))} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 11. SURIIN ANG PAGPAPAKAIN */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                      SURIIN ANG PAGPAPAKAIN
                    </div>
                    <div className="p-2.5 space-y-1.5 text-xs">
                      <p className="text-[10px] text-slate-500 italic">(Para sa batang wala pang 2 buwan o may anemia o lubhang kulang sa timbang )</p>
                      
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center justify-between">
                          <span>Sumususo ba ang bata sa ina?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="breastfeeding" checked={sickForm.breastfeeding === true} onChange={() => setSickForm(p => ({ ...p, breastfeeding: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="breastfeeding" checked={sickForm.breastfeeding === false} onChange={() => setSickForm(p => ({ ...p, breastfeeding: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pl-3">
                          <span>Kung oo, ilang beses sa 24 na oras?</span>
                          <div className="flex items-center gap-1">
                            <Input type="text" value={sickForm.breastfeed_times} onChange={e => setSickForm(p => ({ ...p, breastfeed_times: e.target.value }))} className={`w-20 ${lineInputInlineClass}`} />
                            <span>beses</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                          <span>Mayroon bang ibang kinakain o iniinom ang bata?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="other_food_drinks" checked={sickForm.other_food_drinks === true} onChange={() => setSickForm(p => ({ ...p, other_food_drinks: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="other_food_drinks" checked={sickForm.other_food_drinks === false} onChange={() => setSickForm(p => ({ ...p, other_food_drinks: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="space-y-1 pl-3">
                          <div className="flex items-center justify-between">
                            <span>Kung oo, ano ito?</span>
                            <Input type="text" value={sickForm.other_food_details} onChange={e => setSickForm(p => ({ ...p, other_food_details: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ilang beses sa loob ng 24 na oras?</span>
                            <div className="flex items-center gap-1">
                              <Input type="text" value={sickForm.other_food_times} onChange={e => setSickForm(p => ({ ...p, other_food_times: e.target.value }))} className={`w-16 ${lineInputInlineClass}`} />
                              <span>beses</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ano'ng ginagamit sa pagpapakain sa bata?</span>
                            <Input type="text" value={sickForm.feeding_utensils} onChange={e => setSickForm(p => ({ ...p, feeding_utensils: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                          </div>
                        </div>

                        <div className="pt-1 border-t space-y-1">
                          <span className="font-semibold block">Kung lubhang kulang sa timbang,</span>
                          <div className="space-y-1 pl-3">
                            <div className="flex items-center justify-between">
                              <span>Gaano karami ang pinapakain sa bata?</span>
                              <Input type="text" value={sickForm.food_amount} onChange={e => setSickForm(p => ({ ...p, food_amount: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Mayroon bang sariling pinggan ang bata 'pag kumakain?</span>
                              <div className="flex gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="own_plate" checked={sickForm.own_plate === true} onChange={() => setSickForm(p => ({ ...p, own_plate: true }))} /> Oo</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="own_plate" checked={sickForm.own_plate === false} onChange={() => setSickForm(p => ({ ...p, own_plate: false }))} /> Hindi</label>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Sino ang nagpapakain sa bata?</span>
                              <Input type="text" value={sickForm.person_feeding} onChange={e => setSickForm(p => ({ ...p, person_feeding: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Paano pinapakain ang bata?</span>
                              <Input type="text" value={sickForm.how_fed} onChange={e => setSickForm(p => ({ ...p, how_fed: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                          <span>Habang may sakit ang bata, nagbago ba ang pagpapakain sa kanya?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="feeding_changed_during_illness" checked={sickForm.feeding_changed_during_illness === true} onChange={() => setSickForm(p => ({ ...p, feeding_changed_during_illness: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="feeding_changed_during_illness" checked={sickForm.feeding_changed_during_illness === false} onChange={() => setSickForm(p => ({ ...p, feeding_changed_during_illness: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pl-3">
                          <span>Kung oo, paano?</span>
                          <Input type="text" value={sickForm.feeding_change_details} onChange={e => setSickForm(p => ({ ...p, feeding_change_details: e.target.value }))} className={`w-72 ${lineInputInlineClass} text-left`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 12. SURIIN ANG PAMAMARAAN NG PAG-AARUGA SA BATA */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                      SURIIN ANG PAMAMARAAN NG PAG-AARUGA SA BATA
                    </div>
                    <div className="p-2.5 space-y-2 text-xs">
                      <p className="text-[10px] text-slate-500 italic">Ikumpara ang mga sagot ng magulang sa mga Rekomendasyon ng Pag-aalaga sa bata para sa kanyang edad.</p>
                      <div className="space-y-1.5 pl-1">
                        <div>
                          <span className="font-semibold block">Paano nakikilaro sa bata?</span>
                          <Input type="text" value={sickForm.how_plays} onChange={e => setSickForm(p => ({ ...p, how_plays: e.target.value }))} className={lineInputClass} />
                        </div>
                        <div>
                          <span className="font-semibold block">Paano nakikipag-usap sa bata?</span>
                          <Input type="text" value={sickForm.how_talks} onChange={e => setSickForm(p => ({ ...p, how_talks: e.target.value }))} className={lineInputClass} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 13. ANG BATA BA AY MAY IBA PANG PROBLEMA? */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                    <div className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 uppercase">
                      ANG BATA BA AY MAY IBA PANG PROBLEMA?
                    </div>
                    <div className="p-2.5">
                      <Input type="text" value={sickForm.other_problems} onChange={e => setSickForm(p => ({ ...p, other_problems: e.target.value }))} className={lineInputClass} />
                    </div>
                  </div>

                  {/* 14. DOCTOR EVALUATION & 5-BOX TREATMENT/ADVICE GRID */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-center gap-8 py-1 text-xs">
                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="doctor_see" checked={sickForm.doctor_see === true} onChange={() => setSickForm(p => ({ ...p, doctor_see: true }))} /> ( ) Titingnan ng Doktor
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="doctor_see" checked={sickForm.doctor_see === false} onChange={() => setSickForm(p => ({ ...p, doctor_see: false }))} /> ( ) Hindi titingnan ng Doktor
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Left Column: PAGGAMOT & PAGPAPAYO */}
                      <div className="space-y-3">
                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                          <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 uppercase">
                            PAGGAMOT:
                          </div>
                          <div className="p-1.5 bg-card">
                            <textarea value={sickForm.treatment_notes} onChange={e => setSickForm(p => ({ ...p, treatment_notes: e.target.value }))} placeholder="Isulat ang mga gamot..." className="w-full text-xs resize-none border-b border-t-0 border-x-0 rounded-none border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-slate-800 p-1 h-20" />
                          </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                          <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 uppercase">
                            PAGPAPAYO:
                          </div>
                          <div className="p-1.5 bg-card">
                            <textarea value={sickForm.advice_notes} onChange={e => setSickForm(p => ({ ...p, advice_notes: e.target.value }))} placeholder="Isulat ang mga payo..." className="w-full text-xs resize-none border-b border-t-0 border-x-0 rounded-none border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-slate-800 p-1 h-20" />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: MGA PAYO KUNG KAILAN DAPAT BUMALIK KAAGAD, PAYO SA PAGPAPAKAIN, PETSA NG PAGBALIK */}
                      <div className="space-y-3">
                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                          <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 uppercase">
                            MGA PAYO KUNG KAILAN DAPAT BUMALIK KAAGAD:
                          </div>
                          <div className="p-1.5 bg-card">
                            <textarea value={sickForm.urgent_return_advice} onChange={e => setSickForm(p => ({ ...p, urgent_return_advice: e.target.value }))} placeholder="Kailan dapat bumalik agad..." className="w-full text-xs resize-none border-b border-t-0 border-x-0 rounded-none border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-slate-800 p-1 h-14" />
                          </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                          <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 uppercase">
                            PAYO SA PAGPAPAKAIN:
                          </div>
                          <div className="p-1.5 bg-card">
                            <textarea value={sickForm.feeding_advice} onChange={e => setSickForm(p => ({ ...p, feeding_advice: e.target.value }))} placeholder="Payo sa pagpapakain..." className="w-full text-xs resize-none border-b border-t-0 border-x-0 rounded-none border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-slate-800 p-1 h-14" />
                          </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                          <div className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 uppercase">
                            PETSA NG PAGBALIK SA HEALTH CENTER:
                          </div>
                          <div className="p-1.5 bg-card">
                            <Input type="date" value={sickForm.return_health_center_date} onChange={e => setSickForm(p => ({ ...p, return_health_center_date: e.target.value }))} className={`${lineInputClass} ${!sickForm.return_health_center_date ? "empty-date" : ""}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 no-print pt-2 border-t">
                  <Button type="submit" disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Sick Child Record"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setResetConfirmOpen(true)} 
                    className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-medium"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Reset Form
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrint} 
                    className="gap-1 text-xs border-primary/20 text-primary hover:bg-primary/10 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print
                  </Button>
                </div>

                {renderHistoryCard("sick-children")}
              </form>

            </TabsContent>

            {/* TAB 2: Children's Master List for Vitamin A and RHU2 (Official Paper Form Replica) */}
            <TabsContent value="vitamin-a" className="mt-4 space-y-4 w-full max-w-full">
              
              {/* Header Container (Stationary) */}
              <div className="w-full max-w-full space-y-4 shrink-0 no-print">
                {/* Form Title Banner */}
                <div className="text-center py-2 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-300 dark:border-amber-700/60 relative w-full">
                  <h1 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 font-heading">
                    VITAMIN A AND DEWORMING MASTER LIST - RHU2
                  </h1>
                  <div className="absolute left-3 top-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    BARANGAY: <strong>SUBUKIN</strong>
                  </div>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center justify-between no-print bg-muted/40 p-2.5 rounded-md border w-full">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary">Sitio:</span>
                    <Select value={vitAInfo.sitio} onValueChange={v => setVitAInfo(p => ({ ...p, sitio: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-background w-36">
                        <SelectValue placeholder="Sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        {sitioOptions.map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Masterlist 20-Column Table (Scrolls horizontally on screen, fits cleanly on paper during print without slide function) */}
              <div className="overflow-x-auto print:overflow-visible print:border-0 w-full max-w-full rounded-md border border-slate-300 dark:border-slate-700 shadow-xs">
                <table className="min-w-[1550px] print:min-w-0 print:w-full w-full text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center border-b border-slate-400">
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 w-8">NO.</th>
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[280px] w-[280px]">
                        NAME OF CHILD<br/><span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">(First Name, MI, Last Name)</span>
                      </th>
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[90px]">BIRTH DATE</th>
                      
                      <th colSpan={1} rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200">6 MOS.</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200">12-23 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">24-35 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200">36-47 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200">48-59 MONTHS</th>
                    </tr>
                    
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-[10px] font-bold text-center border-b border-slate-300 dark:border-slate-700">
                      {/* 12-23 mos */}
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">VITAMIN A</th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">DEWORMING</th>
                      {/* 24-35 mos */}
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">VITAMIN A</th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">DEWORMING</th>
                      {/* 36-47 mos */}
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">VITAMIN A</th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">DEWORMING</th>
                      {/* 48-59 mos */}
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">VITAMIN A</th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-0.5">DEWORMING</th>
                    </tr>
                    
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[9px] font-semibold text-center border-b border-slate-300 dark:border-slate-700">
                      {/* 6 mos */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">VITAMIN A<br/>1ST DOSE</th>

                      {/* 12-23 mos */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>

                      {/* 24-35 mos */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>

                      {/* 36-47 mos */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>

                      {/* 48-59 mos */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">1ST DOSE</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">2ND DOSE</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {vitARows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="border border-slate-300 dark:border-slate-700 p-1 text-center font-bold text-slate-500">{idx + 1}</td>
                        
                        {/* Child Name */}
                        <td className="border border-slate-300 dark:border-slate-700 p-1">
                          <input 
                            type="text" 
                            value={row.child_name} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, child_name: val } : r));
                            }} 
                            placeholder="" 
                            className="cell-input w-full bg-transparent border-0 outline-none text-xs px-1 font-medium"
                          />
                        </td>
                        
                        {/* Birth Date */}
                        <td className="border border-slate-300 dark:border-slate-700 p-1">
                          <input 
                            type="text" 
                            value={row.dob} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, dob: val } : r));
                            }} 
                            placeholder="" 
                            className="w-full bg-transparent border-0 outline-none text-[11px] text-center"
                          />
                        </td>

                        {/* 6 mos - Vit A 1st */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5">
                          <input type="text" value={row.v6m_1st} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v6m_1st: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" />
                        </td>

                        {/* 12-23 mos */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v12_23_v1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v12_23_v1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v12_23_v2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v12_23_v2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v12_23_d1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v12_23_d1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v12_23_d2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v12_23_d2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>

                        {/* 24-35 mos */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v24_35_v1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v24_35_v1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v24_35_v2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v24_35_v2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v24_35_d1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v24_35_d1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v24_35_d2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v24_35_d2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>

                        {/* 36-47 mos */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v36_47_v1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v36_47_v1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v36_47_v2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v36_47_v2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v36_47_d1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v36_47_d1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v36_47_d2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v36_47_d2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>

                        {/* 48-59 mos */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v48_59_v1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v48_59_v1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v48_59_v2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v48_59_v2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v48_59_d1} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v48_59_d1: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.v48_59_d2} onChange={e => setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, v48_59_d2: e.target.value } : r))} className="w-full text-center bg-transparent border-0 outline-none text-[11px]" /></td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end no-print pt-2 border-t">
                <Button type="button" onClick={handleSaveVitAMasterlist} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Vitamin A Master List"}
                </Button>
              </div>

              {renderHistoryCard("vitamin-a")}
            </TabsContent>

            {/* TAB 3: Supplemental Immunization Activity (SIA) Master List (Official Paper Form Replica) */}
            <TabsContent value="sia-masterlist" className="mt-4 space-y-4 w-full max-w-full">
              
              {/* Header Container (Stationary) */}
              <div className="w-full max-w-full space-y-4 shrink-0 no-print">
                {/* Title Banner */}
                <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-300 dark:border-emerald-700/60 relative w-full">
                  <h1 className="text-sm font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 font-heading">
                    Supplemental Immunization Activity (SIA)
                  </h1>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Masterlist of Children 6-59 months old
                  </p>
                  <div className="absolute right-3 top-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Date: <Input type="text" value={siaInfo.activity_date} onChange={e => setSiaInfo(p => ({ ...p, activity_date: e.target.value }))} placeholder="SEPT 2021 - FEB 2024" className="inline-block w-36 h-6 text-xs border-b border-t-0 border-x-0 rounded-none p-0 text-center" />
                  </div>
                </div>

                {/* Meta Location Fields Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-2.5 rounded-md border text-xs w-full">
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">Region:</Label>
                    <Input type="text" value={siaInfo.region} onChange={e => setSiaInfo(p => ({ ...p, region: e.target.value }))} className={lineInputClass} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">Province/City:</Label>
                    <Input type="text" value={siaInfo.province} onChange={e => setSiaInfo(p => ({ ...p, province: e.target.value }))} className={lineInputClass} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">Municipality:</Label>
                    <Input type="text" value={siaInfo.municipality} onChange={e => setSiaInfo(p => ({ ...p, municipality: e.target.value }))} className={lineInputClass} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">Barangay:</Label>
                    <Input type="text" value={siaInfo.barangay} onChange={e => setSiaInfo(p => ({ ...p, barangay: e.target.value }))} className={lineInputClass} />
                  </div>
                </div>
              </div>

              {/* SIA Masterlist Table (Scrolls horizontally on screen, fits cleanly on paper during print without slide function) */}
              <div className="overflow-x-auto print:overflow-visible print:border-0 w-full max-w-full rounded-md border border-slate-300 dark:border-slate-700 shadow-xs">
                <table className="min-w-[1550px] print:min-w-0 print:w-full w-full text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center border-b border-slate-400">
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-6">#</th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[320px]">NAME</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[85px]">Date of Birth<br/><span className="text-[9px] font-normal">(YYYY-MM-DD)</span></th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-14">Age in Months</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-12">Gender<br/><span className="text-[9px] font-normal">(M/F)</span></th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[160px]">Address</th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[240px]">Name of Mother</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[90px]">Vaccine Given</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[85px]">Date of Vaccination<br/><span className="text-[9px] font-normal">(YYYY-MM-DD)</span></th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[240px]">Name of Vaccinator</th>
                    </tr>

                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-[10px] font-semibold text-center border-b border-slate-300 dark:border-slate-700">
                      {/* Name of Child */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Family Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Given Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Middle Name</th>

                      {/* Address */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Barangay</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Purok/Sitio/Street</th>

                      {/* Name of Mother */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Family Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Given Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Middle Name</th>

                      {/* Name of Vaccinator */}
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Family Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Given Name</th>
                      <th className="border border-slate-300 dark:border-slate-700 p-0.5">Middle Name</th>
                    </tr>
                  </thead>

                  <tbody>
                    {siaRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="border border-slate-300 dark:border-slate-700 p-1 text-center font-bold text-slate-500">{idx + 1}</td>

                        {/* Child Name */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.child_family_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, child_family_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.child_given_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, child_given_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.child_middle_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, child_middle_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>

                        {/* DOB */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.dob} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, dob: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-[11px] text-center" /></td>

                        {/* Age Months */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.age_months} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, age_months: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-[11px] text-center" /></td>

                        {/* Gender */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5 text-center">
                          <select value={row.gender || ""} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, gender: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-[11px] text-center print:hidden">
                            <option value=""></option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                          <span className="hidden print:inline-block w-full text-center text-[11px] font-medium">
                            {row.gender || ""}
                          </span>
                        </td>

                        {/* Address */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.barangay || ""} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, barangay: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1 text-center" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.purok_sitio_street} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, purok_sitio_street: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>

                        {/* Mother Name */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.mother_family_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, mother_family_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.mother_given_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, mother_given_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.mother_middle_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, mother_middle_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>

                        {/* Vaccine Given */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.vaccine_given} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, vaccine_given: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>

                        {/* Vaccination Date */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.vaccination_date} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, vaccination_date: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-[11px] text-center" /></td>

                        {/* Vaccinator Name */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.vaccinator_family_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, vaccinator_family_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.vaccinator_given_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, vaccinator_given_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.vaccinator_middle_name} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, vaccinator_middle_name: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end no-print pt-2 border-t">
                <Button type="button" onClick={handleSaveSIAMasterlist} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save SIA Master List"}
                </Button>
              </div>

              {renderHistoryCard("sia-masterlist")}
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      {/* VIEW RECORD DETAIL DIALOG */}
      <Dialog open={viewRecordModalOpen} onOpenChange={setViewRecordModalOpen}>
        <DialogContent className="max-w-3xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 shadow-xl">
          {(() => {
            const viewFormType = selectedRecordForView ? getRecordFormType(selectedRecordForView) : "sick-children";
            return (
              <DialogHeader className="border-b pb-3 no-print">
                <DialogTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
                  {viewFormType === "sick-children" && <Stethoscope className="h-5 w-5 text-sky-600" />}
                  {viewFormType === "vitamin-a" && <Pill className="h-5 w-5 text-amber-600" />}
                  {viewFormType === "sia-masterlist" && <Syringe className="h-5 w-5 text-emerald-600" />}
                  {viewFormType === "sick-children" && "Care for Sick Child Record Summary"}
                  {viewFormType === "vitamin-a" && "Vitamin A & Deworming Master List Summary"}
                  {viewFormType === "sia-masterlist" && "SIA Master List Record Summary"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Barangay Subukin Health Center – Official Patient Record
                </DialogDescription>
              </DialogHeader>
            );
          })()}

          {selectedRecordForView && (() => {
            let detailsObj: any = null;
            try {
              if (selectedRecordForView.details) {
                detailsObj = typeof selectedRecordForView.details === "string" 
                  ? JSON.parse(selectedRecordForView.details) 
                  : selectedRecordForView.details;
              }
            } catch (e) {
              detailsObj = null;
            }

            const viewFormType = getRecordFormType(selectedRecordForView);
            const fullName = getRecordChildName(selectedRecordForView);

            return (
              <div id="summary-print-area" className="space-y-4 text-xs py-2 max-h-[70vh] overflow-y-auto pr-1">
                {/* Official 3-Logo Seals Header - Print Only */}
                <div className="hidden print:block">
                  <OfficialHeader
                    title="Summary of Child Health Record • Barangay Subukin"
                    subtitle="Barangay Subukin Health Center • San Juan, Batangas"
                    showDoubleBorder={true}
                    logoHeight="75px"
                  />
                </div>

                <div className="hidden print:block text-center pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                    {viewFormType === "sick-children" && "SUMMARY OF CHILD HEALTH RECORD / BUOD NG REKORD NG KALUSUGAN NG BATA"}
                    {viewFormType === "vitamin-a" && "VITAMIN A AND DEWORMING MASTER LIST - RHU2 SUMMARY"}
                    {viewFormType === "sia-masterlist" && "SUPPLEMENTAL IMMUNIZATION ACTIVITY (SIA) MASTERLIST SUMMARY"}
                  </h2>
                </div>

                {/* FORM 1: SICK CHILDREN VIEW */}
                {viewFormType === "sick-children" && (
                  <>
                    {/* 1. Patient Demographics & Exam Details */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-sky-700 dark:text-sky-400 uppercase text-[11px] flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> Patient Demographics & Examination Details
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Checkup Date: <strong>{selectedRecordForView.checkup_date}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Patient Name:</span>
                          <strong className="text-slate-900 dark:text-slate-100 text-xs">{fullName || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Age & Sex:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {detailsObj?.age_months ? `${detailsObj.age_months} months` : "N/A"} | {detailsObj?.sex || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Date of Birth:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.dob || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Sitio / Address:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.address || "Subukin"}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px] block">Mother's Name:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.mother_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Father's Name:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.father_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Examiner / BHW:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.examiner_name || loggedInWorkerName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Consultation Type:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{detailsObj?.consultation_type || "Unang konsulta"}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Clinical Vitals Grid */}
                    {detailsObj && (
                      <div className="grid grid-cols-5 gap-2 text-center bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="border-r pr-1">
                          <span className="text-[10px] text-slate-500 block">Timbang (Weight)</span>
                          <strong className="text-xs text-slate-900 dark:text-slate-100">{detailsObj.weight_kg ? `${detailsObj.weight_kg} kg` : "—"}</strong>
                        </div>
                        <div className="border-r pr-1">
                          <span className="text-[10px] text-slate-500 block">Taas (Height)</span>
                          <strong className="text-xs text-slate-900 dark:text-slate-100">{detailsObj.height_cm ? `${detailsObj.height_cm} cm` : "—"}</strong>
                        </div>
                        <div className="border-r pr-1">
                          <span className="text-[10px] text-slate-500 block">Temp (°C)</span>
                          <strong className="text-xs text-slate-900 dark:text-slate-100">{detailsObj.temp_c ? `${detailsObj.temp_c} °C` : "—"}</strong>
                        </div>
                        <div className="border-r pr-1">
                          <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                          <strong className="text-xs text-slate-900 dark:text-slate-100">{detailsObj.pulse_rate ? `${detailsObj.pulse_rate} /min` : "—"}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Respiratory Rate</span>
                          <strong className="text-xs text-slate-900 dark:text-slate-100">{detailsObj.respiratory_rate ? `${detailsObj.respiratory_rate} /min` : "—"}</strong>
                        </div>
                      </div>
                    )}

                    {/* Chief Complaint */}
                    {detailsObj?.chief_complaint && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md">
                        <strong className="text-amber-900 dark:text-amber-300 block text-[11px]">Chief Complaint / Problema ng Bata:</strong>
                        <p className="text-amber-800 dark:text-amber-200 text-xs mt-0.5">{detailsObj.chief_complaint}</p>
                      </div>
                    )}

                    {/* 3. Classifications Summary Table */}
                    {detailsObj && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden space-y-0">
                        <div className="bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 uppercase flex items-center justify-between">
                          <span>Clinical Assessment Classifications (Klasipikasyon)</span>
                          <span className="text-[10px] font-normal text-slate-300">Doctor's Review Table</span>
                        </div>
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b text-slate-700 dark:text-slate-300 font-semibold text-[10px] uppercase">
                              <th className="p-2 border-r w-1/2">Health Condition / Assessment Area</th>
                              <th className="p-2 w-1/2">Assigned Classification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            <tr>
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">General Danger Signs</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_danger || "Walang Danger Signs"}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Ubo / Nahihirapang Huminga (Cough/Breathing)</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_cough || "Walang Ubo o Sipon"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Pagtatae (Diarrhea / Dehydration)</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_diarrhea || "Walang Pagtatae"}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Nilalagnat (Fever Assessment)</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_fever || "Walang lagnat"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Tigdas (Measles Signs)</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_measles || "Walang Tigdas"}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Dengue Risk Assessment</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_dengue || "Walang Dengue"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Problema sa Tenga (Ear Problem)</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">{detailsObj.classification_ear || "Walang Impeksyon sa Tenga"}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">Malnutrisyon at Anemia</td>
                              <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                                {detailsObj.classification_malnutrition || "Walang Malnutrisyon"} / {detailsObj.classification_anemia || "Walang Anemia"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 4. Treatment & Doctor Instructions */}
                    {detailsObj && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                          <strong className="text-slate-900 dark:text-slate-100 font-bold uppercase text-[11px] block border-b pb-1">
                            Paggamot & Pagpapayo (Treatment & Advice)
                          </strong>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Paggamot (Treatment):</span>
                            <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{detailsObj.treatment_notes || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Pagpapayo (Advice):</span>
                            <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{detailsObj.advice_notes || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Payo sa Pagpapakain:</span>
                            <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{detailsObj.feeding_advice || "—"}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                          <strong className="text-slate-900 dark:text-slate-100 font-bold uppercase text-[11px] block border-b pb-1">
                            Doctor Referral & Return Schedule
                          </strong>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Doctor Evaluation Status:</span>
                            <strong className="text-xs text-sky-700 dark:text-sky-400">
                              {detailsObj.doctor_see === true ? "( ✓ ) Titingnan ng Doktor" : "(   ) Hindi titingnan ng Doktor"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Kailan Dapat Bumalik Kaagad:</span>
                            <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{detailsObj.urgent_return_advice || "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Petsa ng Pagbalik sa Health Center:</span>
                            <strong className="text-xs text-emerald-700 dark:text-emerald-400">{detailsObj.return_health_center_date || "—"}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* FORM 2: VITAMIN A VIEW */}
                {viewFormType === "vitamin-a" && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-1">
                        <span className="font-bold text-amber-800 dark:text-amber-300 uppercase text-[11px] flex items-center gap-1">
                          <Pill className="h-3.5 w-3.5" /> Vitamin A & Deworming Master List Summary (RHU2)
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Date Saved: <strong>{selectedRecordForView.checkup_date}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Child's Name:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{fullName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Date of Birth:</span>
                          <span className="font-semibold">{detailsObj?.row_data?.dob || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Sitio:</span>
                          <span className="font-semibold">{detailsObj?.header?.sitio || "Subukin"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Target Year:</span>
                          <span className="font-semibold">{detailsObj?.header?.year || new Date().getFullYear()}</span>
                        </div>
                      </div>
                    </div>

                    {detailsObj?.row_data && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
                        <div className="bg-amber-800 text-white font-bold text-[11px] px-3 py-1.5 uppercase">
                          Recorded Supplementation & Deworming Doses
                        </div>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b text-[10px] uppercase text-slate-700 dark:text-slate-300 font-semibold">
                              <th className="p-2 border-r">Age Bracket</th>
                              <th className="p-2 border-r">Vitamin A (1st Dose)</th>
                              <th className="p-2 border-r">Vitamin A (2nd Dose)</th>
                              <th className="p-2 border-r">Deworming (1st Dose)</th>
                              <th className="p-2">Deworming (2nd Dose)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            <tr>
                              <td className="p-2 border-r font-medium">6 Months</td>
                              <td className="p-2 border-r font-bold text-amber-700 dark:text-amber-400">{detailsObj.row_data.v6m_1st || "—"}</td>
                              <td className="p-2 border-r text-slate-400">N/A</td>
                              <td className="p-2 border-r text-slate-400">N/A</td>
                              <td className="p-2 text-slate-400">N/A</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium">12-23 Months</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v12_23_v1 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v12_23_v2 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v12_23_d1 || "—"}</td>
                              <td className="p-2">{detailsObj.row_data.v12_23_d2 || "—"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r font-medium">24-35 Months</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v24_35_v1 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v24_35_v2 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v24_35_d1 || "—"}</td>
                              <td className="p-2">{detailsObj.row_data.v24_35_d2 || "—"}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                              <td className="p-2 border-r font-medium">36-47 Months</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v36_47_v1 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v36_47_v2 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v36_47_d1 || "—"}</td>
                              <td className="p-2">{detailsObj.row_data.v36_47_d2 || "—"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r font-medium">48-59 Months</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v48_59_v1 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v48_59_v2 || "—"}</td>
                              <td className="p-2 border-r">{detailsObj.row_data.v48_59_d1 || "—"}</td>
                              <td className="p-2">{detailsObj.row_data.v48_59_d2 || "—"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* FORM 3: SIA MASTERLIST VIEW */}
                {viewFormType === "sia-masterlist" && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-1">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[11px] flex items-center gap-1">
                          <Syringe className="h-3.5 w-3.5" /> Supplemental Immunization Activity (SIA) Master List Summary
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Vaccination Date: <strong>{detailsObj?.row_data?.vaccination_date || selectedRecordForView.checkup_date}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Child's Full Name:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{fullName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Date of Birth & Age:</span>
                          <span className="font-semibold">{detailsObj?.row_data?.dob || "N/A"} ({detailsObj?.row_data?.age_months || "—"} mos)</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Gender:</span>
                          <span className="font-semibold">{detailsObj?.row_data?.gender === "M" ? "Male" : detailsObj?.row_data?.gender === "F" ? "Female" : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Purok / Sitio / Address:</span>
                          <span className="font-semibold">{detailsObj?.row_data?.purok_sitio_street || detailsObj?.row_data?.barangay || "Subukin"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Mother's Full Name:</span>
                          <span className="font-semibold">
                            {`${detailsObj?.row_data?.mother_given_name || ''} ${detailsObj?.row_data?.mother_middle_name || ''} ${detailsObj?.row_data?.mother_family_name || ''}`.trim() || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Vaccine Given:</span>
                          <strong className="text-emerald-700 dark:text-emerald-300">{detailsObj?.row_data?.vaccine_given || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Vaccinator Name:</span>
                          <span className="font-semibold">
                            {`${detailsObj?.row_data?.vaccinator_given_name || ''} ${detailsObj?.row_data?.vaccinator_middle_name || ''} ${detailsObj?.row_data?.vaccinator_family_name || ''}`.trim() || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Barangay & Municipality:</span>
                          <span className="font-semibold">{detailsObj?.row_data?.barangay || "Subukin"}, {detailsObj?.campaign_info?.municipality || "San Juan"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback for raw remarks string if no detailsObj */}
                {!detailsObj && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                    <strong className="text-slate-900 dark:text-slate-100 font-bold uppercase text-[11px] block border-b pb-1">
                      Summary Remarks
                    </strong>
                    <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap">{selectedRecordForView.remarks}</p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between no-print">
            <span className="text-[10px] text-slate-500 font-medium">Official Health Summary — Barangay Subukin</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setViewRecordModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Child Health Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => deleteConfirmId && handleDeleteRecord(deleteConfirmId)} 
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE CHILD HEALTH HISTORY REPORT */}
      <div id="child-history-print-area" className="hidden print:block" style={{ display: "none" }}>
        {(() => {
          const currentFormType = activeTab as "sick-children" | "vitamin-a" | "sia-masterlist";
          const formRecords = savedHealthRecords.filter(r => getRecordFormType(r) === currentFormType);
          const term = historySearch.toLowerCase().trim();
          const filtered = formRecords.filter(r => {
            if (historySitio !== "all") {
              const s = getRecordSitio(r).toLowerCase();
              if (!s.includes(historySitio.toLowerCase())) return false;
            }
            if (!term) return true;
            const childName = getRecordChildName(r).toLowerCase();
            const remarks = (r.remarks || "").toLowerCase();
            const checkupDate = (r.checkup_date || "").toLowerCase();
            const detailsStr = typeof r.details === "string" ? r.details.toLowerCase() : JSON.stringify(r.details || {}).toLowerCase();
            return childName.includes(term) || remarks.includes(term) || checkupDate.includes(term) || detailsStr.includes(term);
          });

          const reportTitles = {
            "sick-children": "Official Care for Sick Children Records History (2m - 5y)",
            "vitamin-a": "Official Vitamin A & Deworming Master List History (RHU2)",
            "sia-masterlist": "Official SIA Master List History (6–59 Months)",
          };

          return (
            <div>
              <OfficialHeader
                title={reportTitles[currentFormType] || "Official Child Health Records History"}
                subtitle={`Barangay Subukin Health Center • Total: ${filtered.length} Record(s) • Generated: ${new Date().toLocaleDateString()}`}
                showDoubleBorder={true}
                logoHeight="75px"
              />

              <table className="w-full border-collapse" style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
                <thead>
                  {currentFormType === "sick-children" && (
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Checkup Date</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Child's Name</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "95px" }}>Age & Sex</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Chief Complaint / Classifications & Treatment</th>
                    </tr>
                  )}
                  {currentFormType === "vitamin-a" && (
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date Saved</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Child's Name</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "85px" }}>Date of Birth</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "90px" }}>Sitio</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Dose Records / Remarks</th>
                    </tr>
                  )}
                  {currentFormType === "sia-masterlist" && (
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "35px" }}>#</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "85px" }}>Date</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Child's Name</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "center", width: "85px" }}>Age & Gender</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "95px" }}>Vaccine Given</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left", width: "95px" }}>Sitio / Address</th>
                      <th style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "11px", textAlign: "left" }}>Vaccinator / Remarks</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ border: "1px solid #000", padding: "14px", textAlign: "center", fontStyle: "italic", fontSize: "11px" }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((rec, index) => {
                      let detailsObj: any = null;
                      try {
                        if (rec.details) {
                          detailsObj = typeof rec.details === "string" ? JSON.parse(rec.details) : rec.details;
                        }
                      } catch {}
                      const childName = getRecordChildName(rec);

                      if (currentFormType === "sick-children") {
                        return (
                          <tr key={rec.id || index}>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{rec.checkup_date || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{childName}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
                              {detailsObj?.age_months ? `${detailsObj.age_months} mos (${detailsObj.sex || "—"})` : "—"}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>
                              {detailsObj?.chief_complaint ? `Complaint: ${detailsObj.chief_complaint}` : rec.remarks || "—"}
                            </td>
                          </tr>
                        );
                      } else if (currentFormType === "vitamin-a") {
                        return (
                          <tr key={rec.id || index}>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{rec.checkup_date || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{childName}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{detailsObj?.row_data?.dob || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{detailsObj?.header?.sitio || "Subukin"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || "—"}</td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={rec.id || index}>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>
                              {detailsObj?.row_data?.vaccination_date || rec.checkup_date || "—"}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{childName}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
                              {detailsObj?.row_data?.age_months ? `${detailsObj.row_data.age_months} mos (${detailsObj.row_data.gender === "M" ? "Male" : detailsObj.row_data.gender === "F" ? "Female" : detailsObj.row_data.gender || "—"})` : "—"}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{detailsObj?.row_data?.vaccine_given || "—"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{detailsObj?.row_data?.purok_sitio_street || detailsObj?.row_data?.barangay || "Subukin"}</td>
                            <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{detailsObj?.row_data?.vaccinator || rec.remarks || "—"}</td>
                          </tr>
                        );
                      }
                    })
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
          );
        })()}
      </div>

      {/* RESET CONFIRMATION DIALOG */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Reset Child Health Form?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to reset the form? Any unsaved child demographic and clinical entries will be cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setResetConfirmOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleResetSickForm} 
              className="bg-destructive text-white hover:bg-destructive/90 text-xs font-semibold"
            >
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Child Health Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this child health record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} className="text-xs">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => deleteConfirmId && handleDeleteRecord(deleteConfirmId)} 
              className="bg-destructive text-white hover:bg-destructive/90 text-xs font-semibold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChildHealthForm;
