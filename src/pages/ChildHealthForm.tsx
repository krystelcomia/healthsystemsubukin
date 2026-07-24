import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { ensureResidentExists } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

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
  unable_to_drink: boolean;
  vomits_everything: boolean;
  has_convulsions: boolean;
  lethargic_unconscious: boolean;
  classification_danger: string;

  // 2. Ubo / Nahihirapang Huminga
  has_cough: boolean;
  cough_days: string;
  respiratory_rate_val: string;
  fast_breathing: boolean;
  chest_indrawing: boolean;
  stridor: boolean;
  classification_cough: string;

  // 3. Pagtatae (Diarrhea)
  has_diarrhea: boolean;
  diarrhea_days: string;
  blood_in_stool: boolean;
  eye_condition: string; // masigla / irritable / tutulog-tulog / hindi lubog / lubog
  skin_pinch: string; // mabilis / mabagal / napakabagal
  drinking_ability: string; // normal / sabik / di makainom
  classification_diarrhea: string;

  // 4. Nilalagnat (Fever)
  has_fever: boolean;
  fever_history: boolean;
  fever_days: string;
  fever_everyday_7days: boolean;
  stiff_neck: boolean;
  classification_fever: string;

  // 5. Tigdas (Measles)
  measles_past_3months: boolean;
  measles_rash: boolean;
  measles_cough_runny_red_eyes: boolean;
  mouth_sores: string;
  eye_pus_clouding: string;
  classification_measles: string;

  // 6. Dengue
  dengue_bleeding: boolean;
  dengue_dark_vomit_stool: boolean;
  dengue_abdominal_pain: boolean;
  dengue_persistent_vomiting: boolean;
  dengue_petechiae: boolean;
  dengue_cold_extremities: boolean;
  capillary_refill_sec: string;
  tourniquet_test_positive: boolean;
  classification_dengue: string;

  // 7. Problema sa Tenga (Ear Problem)
  has_ear_problem: boolean;
  ear_pain: boolean;
  ear_discharge: boolean;
  ear_discharge_days: string;
  ear_swelling_behind: boolean;
  classification_ear: string;

  // PAGE 2:
  // 8. Bakuna
  vaccines_given: string[];
  vaccines_needed_today: string;
  return_date_vaccine: string;

  // 9. Vitamin A
  vit_a_past_6months: boolean;
  vit_a_needed_today: boolean;

  // 10. Malnutrisyon at Anemia
  very_low_weight: boolean;
  severe_wasting: boolean;
  edema_both_feet: boolean;
  muac_cm: string;
  classification_malnutrition: string;
  palmar_pallor_some: boolean;
  palmar_pallor_severe: boolean;
  classification_anemia: string;

  // 11. Pagpapakain
  breastfeeding: boolean;
  breastfeed_times: string;
  other_food_drinks: boolean;
  other_food_details: string;
  other_food_times: string;
  feeding_utensils: string;
  food_amount: string;
  own_plate: boolean;
  person_feeding: string;
  how_fed: string;
  feeding_changed_during_illness: boolean;
  feeding_change_details: string;

  // 12. Pag-aaruga & Iba Pang Problema
  how_plays: string;
  how_talks: string;
  other_problems: string;

  // 13. Doktor & Paggamot Summary
  doctor_see: boolean;
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
  consultation_type: "Unang konsulta",

  unable_to_drink: false,
  vomits_everything: false,
  has_convulsions: false,
  lethargic_unconscious: false,
  classification_danger: "Walang General Danger Signs",

  has_cough: false,
  cough_days: "",
  respiratory_rate_val: "",
  fast_breathing: false,
  chest_indrawing: false,
  stridor: false,
  classification_cough: "Walang Ubo o Sipon",

  has_diarrhea: false,
  diarrhea_days: "",
  blood_in_stool: false,
  eye_condition: "masigla, alerto",
  skin_pinch: "mabilis",
  drinking_ability: "normal uminom",
  classification_diarrhea: "Walang Pagtatae",

  has_fever: false,
  fever_history: false,
  fever_days: "",
  fever_everyday_7days: false,
  stiff_neck: false,
  classification_fever: "Walang lagnat",

  measles_past_3months: false,
  measles_rash: false,
  measles_cough_runny_red_eyes: false,
  mouth_sores: "walang singaw",
  eye_pus_clouding: "normal",
  classification_measles: "Walang Tigdas",

  dengue_bleeding: false,
  dengue_dark_vomit_stool: false,
  dengue_abdominal_pain: false,
  dengue_persistent_vomiting: false,
  dengue_petechiae: false,
  dengue_cold_extremities: false,
  capillary_refill_sec: "",
  tourniquet_test_positive: false,
  classification_dengue: "Walang Dengue",

  has_ear_problem: false,
  ear_pain: false,
  ear_discharge: false,
  ear_discharge_days: "",
  ear_swelling_behind: false,
  classification_ear: "Walang Impeksyon sa Tenga",

  vaccines_given: [],
  vaccines_needed_today: "",
  return_date_vaccine: "",

  vit_a_past_6months: false,
  vit_a_needed_today: false,

  very_low_weight: false,
  severe_wasting: false,
  edema_both_feet: false,
  muac_cm: "",
  classification_malnutrition: "Walang malnutrisyon",
  palmar_pallor_some: false,
  palmar_pallor_severe: false,
  classification_anemia: "Walang Anemia",

  breastfeeding: false,
  breastfeed_times: "",
  other_food_drinks: false,
  other_food_details: "",
  other_food_times: "",
  feeding_utensils: "",
  food_amount: "",
  own_plate: false,
  person_feeding: "",
  how_fed: "",
  feeding_changed_during_illness: false,
  feeding_change_details: "",

  how_plays: "",
  how_talks: "",
  other_problems: "",

  doctor_see: false,
  treatment_notes: "",
  advice_notes: "",
  urgent_return_advice: "",
  feeding_advice: "",
  return_health_center_date: "",
};

const ChildHealthForm = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState("sick-children");
  const [residents, setResidents] = useState<any[]>([]);
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);
  const [savedHealthRecords, setSavedHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // History & Modal
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewRecordModalOpen, setViewRecordModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // FORM 1 State
  const [sickForm, setSickForm] = useState<SickChildFormFull>(initialSickForm);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");

  // FORM 2 State (Vitamin A & Deworming Master List - RHU2)
  const [vitAInfo, setVitAInfo] = useState({
    sitio: "Subukin",
    year: new Date().getFullYear().toString(),
  });
  const [vitARows, setVitARows] = useState<VitaminARow[]>([
    {
      id: "vrow-1",
      child_name: "",
      dob: "",
      v6m_1st: "",
      v12_23_v1: "", v12_23_v2: "", v12_23_d1: "", v12_23_d2: "",
      v24_35_v1: "", v24_35_v2: "", v24_35_d1: "", v24_35_d2: "",
      v36_47_v1: "", v36_47_v2: "", v36_47_d1: "", v36_47_d2: "",
      v48_59_v1: "", v48_59_v2: "", v48_59_d1: "", v48_59_d2: "",
    }
  ]);

  // FORM 3 State (Supplemental Immunization Activity - SIA Masterlist)
  const [siaInfo, setSiaInfo] = useState({
    region: "IV-A CALABARZON",
    province: "BATANGAS",
    municipality: "SAN JUAN",
    activity_date: "SEPT 2021 - FEB 2024",
  });
  const [siaRows, setSiaRows] = useState<SIARow[]>([
    {
      id: "srow-1",
      child_family_name: "",
      child_given_name: "",
      child_middle_name: "",
      dob: "",
      age_months: "",
      gender: "M",
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
    }
  ]);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from("residents")
      .select("id, full_name, age, birthday, sitio, gender, family_number, father_name, mother_name")
      .order("full_name");
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
    setSickForm(initialSickForm);
    setSelectedResidentId("");
    toast.info("Form reset.");
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

  // Form 2 & Form 3 logic handlers
  const handleAddVitARow = () => {
    setVitARows(prev => [
      ...prev,
      {
        id: `vrow-${Date.now()}`,
        child_name: "",
        dob: "",
        v6m_1st: "",
        v12_23_v1: "", v12_23_v2: "", v12_23_d1: "", v12_23_d2: "",
        v24_35_v1: "", v24_35_v2: "", v24_35_d1: "", v24_35_d2: "",
        v36_47_v1: "", v36_47_v2: "", v36_47_d1: "", v36_47_d2: "",
        v48_59_v1: "", v48_59_v2: "", v48_59_d1: "", v48_59_d2: "",
      }
    ]);
  };
  const handleRemoveVitARow = (id: string) => setVitARows(prev => prev.filter(r => r.id !== id));

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
      fetchSavedRecords();
    } catch (err) {
      console.error(err);
      toast.error("Error saving Vitamin A masterlist.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSIARow = () => {
    setSiaRows(prev => [
      ...prev,
      {
        id: `srow-${Date.now()}`,
        child_family_name: "",
        child_given_name: "",
        child_middle_name: "",
        dob: "",
        age_months: "",
        gender: "M",
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
      }
    ]);
  };
  const handleRemoveSIARow = (id: string) => setSiaRows(prev => prev.filter(r => r.id !== id));

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
      fetchSavedRecords();
    } catch (err) {
      console.error(err);
      toast.error("Error saving SIA masterlist.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const { error } = await supabase.from("child_health" as any).delete().eq("id", id);
    if (!error) {
      toast.success("Child health record deleted.");
      logActivity("delete_child_health", { entity_type: "child_health", description: `Deleted record ID: ${id}` });
      fetchSavedRecords();
    } else {
      toast.error("Failed to delete record.");
    }
    setDeleteConfirmId(null);
  };

  const handlePrint = () => window.print();

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
          #child-print-area, #child-print-area * {
            visibility: visible !important;
          }
          #child-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          html, body {
            height: 100% !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
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
          input:placeholder-shown {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Main Container Card */}
      <Card id="child-print-area" className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden">
        <CardContent className="p-4 md:p-6 space-y-5">
          
          {/* Official Seals Header - Printing Only */}
          <div className="print-only flex items-center justify-center gap-8 md:gap-12 border-b-[4px] border-double border-slate-900 pb-3 header-border" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-28 object-contain shrink-0 mix-blend-multiply" style={{ height: "105px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-24 md:h-28 object-contain shrink-0 mix-blend-multiply" style={{ height: "105px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Subukin Logo" className="h-24 md:h-28 object-contain shrink-0 mix-blend-multiply" style={{ height: "105px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          {/* Action Bar & Barangay note */}
          <div className="flex items-center justify-between gap-2 no-print pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
              BRGY: <strong className="text-foreground">SUBUKIN</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetSickForm} className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-medium shadow-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Reset Form
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs border-primary/20 text-primary hover:bg-primary/10">
                <Printer className="h-3.5 w-3.5" /> Print Form
              </Button>
            </div>
          </div>

          {/* Child Health Form Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto p-1 bg-muted/60 rounded-lg no-print">
              <TabsTrigger value="sick-children" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                Care for Sick Children (2m - 5y)
              </TabsTrigger>
              <TabsTrigger value="vitamin-a" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Pill className="h-3.5 w-3.5 text-amber-600" />
                Vitamin A & RHU2 Master List
              </TabsTrigger>
              <TabsTrigger value="sia-masterlist" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Syringe className="h-3.5 w-3.5 text-emerald-600" />
                SIA Master List (6–59 Months)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Care for Sick Children (Aged 2 Months to 5 Years) - Official Form Replica */}
            <TabsContent value="sick-children" className="mt-4 space-y-6">
              
              {/* Form Title Banner */}
              <div className="text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 relative">
                <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-heading">
                  PANGANGALAGA SA BATANG MAY SAKIT EDAD 2 BUWAN HANGGANG 5 TAON
                </h1>
                <div className="absolute right-3 top-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  FN: <Input type="text" value={sickForm.fn_number} onChange={e => setSickForm(p => ({ ...p, fn_number: e.target.value }))} placeholder="FN 242" className="inline-block w-20 h-6 text-xs border-b border-t-0 border-x-0 rounded-none p-0 text-center" />
                </div>
              </div>

              <form onSubmit={handleSaveSickChild} className="space-y-6 text-xs">
                
                {/* Select Resident Header Dropdown */}
                <div className="flex items-center justify-between no-print bg-muted/40 p-2.5 rounded-md border">
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

                {/* Patient Information Box */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-3 bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">First Name:</Label>
                      <Input type="text" value={sickForm.first_name} onChange={e => setSickForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First Name" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Middle Name:</Label>
                      <Input type="text" value={sickForm.middle_name} onChange={e => setSickForm(p => ({ ...p, middle_name: e.target.value }))} placeholder="Middle Name" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Surname:</Label>
                      <Input type="text" value={sickForm.surname} onChange={e => setSickForm(p => ({ ...p, surname: e.target.value }))} placeholder="Surname" className={lineInputClass} />
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
                        <Input type="text" value={sickForm.age_months} onChange={e => setSickForm(p => ({ ...p, age_months: e.target.value }))} placeholder="Edad (mos)" className={lineInputClass} />
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
                      <Input type="text" value={sickForm.philhealth_number} onChange={e => setSickForm(p => ({ ...p, philhealth_number: e.target.value }))} placeholder="PhilHealth #" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pangalan ng Ina:</Label>
                      <Input type="text" value={sickForm.mother_name} onChange={e => setSickForm(p => ({ ...p, mother_name: e.target.value }))} placeholder="Pangalan ng Ina" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pangalan ng Ama:</Label>
                      <Input type="text" value={sickForm.father_name} onChange={e => setSickForm(p => ({ ...p, father_name: e.target.value }))} placeholder="Pangalan ng Ama" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Contact Number:</Label>
                      <Input type="text" value={sickForm.contact_number} onChange={e => setSickForm(p => ({ ...p, contact_number: e.target.value }))} placeholder="Contact #" className={lineInputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Timbang (kg):</Label>
                      <Input type="text" value={sickForm.weight_kg} onChange={e => setSickForm(p => ({ ...p, weight_kg: e.target.value }))} placeholder="kg" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Taas (cm):</Label>
                      <Input type="text" value={sickForm.height_cm} onChange={e => setSickForm(p => ({ ...p, height_cm: e.target.value }))} placeholder="cm" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Temp (°C):</Label>
                      <Input type="text" value={sickForm.temp_c} onChange={e => setSickForm(p => ({ ...p, temp_c: e.target.value }))} placeholder="°C" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Pulse Rate (/min):</Label>
                      <Input type="text" value={sickForm.pulse_rate} onChange={e => setSickForm(p => ({ ...p, pulse_rate: e.target.value }))} placeholder="/min" className={lineInputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-500">Respiratory Rate (/min):</Label>
                      <Input type="text" value={sickForm.respiratory_rate} onChange={e => setSickForm(p => ({ ...p, respiratory_rate: e.target.value }))} placeholder="/min" className={lineInputClass} />
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
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">TANUNGIN KUNG MAY GENERAL DANGER SIGNS</div>
                      <div className="space-y-1 pl-1">
                        {[
                          { key: "unable_to_drink", label: "Walang kakayahang uminom o sumuso" },
                          { key: "vomits_everything", label: "Sinusuka lahat ng pinapasok sa bibig" },
                          { key: "has_convulsions", label: "May kombulsyon" },
                          { key: "lethargic_unconscious", label: "Tulog ng tulog o mahirap gisingin" },
                        ].map(item => (
                          <div key={item.key} className="flex items-center justify-between">
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

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang General Danger Signs", "May General Danger Signs"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_danger" checked={sickForm.classification_danger === c} onChange={() => setSickForm(p => ({ ...p, classification_danger: c }))} />
                          <span className={cn(c.includes("May") ? "font-bold text-rose-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. ANG BATA BA AY INUUBO O NAHIHIRAPANG HUMINGA? */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="flex items-center justify-between font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">
                        <span>ANG BATA BA AY INUUBO O NAHIHIRAPANG HUMINGA?</span>
                        <div className="flex gap-3 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_cough" checked={sickForm.has_cough === true} onChange={() => setSickForm(p => ({ ...p, has_cough: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_cough" checked={sickForm.has_cough === false} onChange={() => setSickForm(p => ({ ...p, has_cough: false }))} /> HINDI</label>
                        </div>
                      </div>

                      {sickForm.has_cough && (
                        <div className="space-y-1.5 pl-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span>Ilang araw nang inuubo o nahihirapang huminga?</span>
                            <Input type="text" value={sickForm.cough_days} onChange={e => setSickForm(p => ({ ...p, cough_days: e.target.value }))} placeholder="___ araw" className="w-20 h-6 text-xs text-center border-b rounded-none" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Tingnan sa talaan ang respiratory rate: <Input type="text" value={sickForm.respiratory_rate_val} onChange={e => setSickForm(p => ({ ...p, respiratory_rate_val: e.target.value }))} placeholder="/min" className="w-16 h-5 inline-block text-xs border-b rounded-none text-center" /> Mabilis ba ito para sa edad?</span>
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
                      )}
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang Ubo o Sipon", "Simpleng Ubo o Sipon", "Pulmonya", "Malalang Pulmonya"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_cough" checked={sickForm.classification_cough === c} onChange={() => setSickForm(p => ({ ...p, classification_cough: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : c.includes("Pulmonya") ? "font-semibold text-amber-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 3. ANG BATA BA AY NAGTATAE? */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="flex items-center justify-between font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">
                        <span>ANG BATA BA AY NAGTATAE?</span>
                        <div className="flex gap-3 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_diarrhea" checked={sickForm.has_diarrhea === true} onChange={() => setSickForm(p => ({ ...p, has_diarrhea: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_diarrhea" checked={sickForm.has_diarrhea === false} onChange={() => setSickForm(p => ({ ...p, has_diarrhea: false }))} /> HINDI</label>
                        </div>
                      </div>

                      {sickForm.has_diarrhea && (
                        <div className="space-y-1.5 pl-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span>Ilang araw nang nagtatae?</span>
                            <Input type="text" value={sickForm.diarrhea_days} onChange={e => setSickForm(p => ({ ...p, diarrhea_days: e.target.value }))} placeholder="___ araw" className="w-20 h-6 text-xs text-center border-b rounded-none" />
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
                      )}
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang Pagtatae", "Pagtatae na Walang Panunuyo", "Pagtatae na May Panunuyo", "Pagtatae na May Malalang Panunuyo"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_diarrhea" checked={sickForm.classification_diarrhea === c} onChange={() => setSickForm(p => ({ ...p, classification_diarrhea: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : c.includes("May Panunuyo") ? "font-semibold text-amber-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 4. ANG BATA BA AY NILALAGNAT? */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="flex items-center justify-between font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">
                        <span>ANG BATA BA AY NILALAGNAT?</span>
                        <div className="flex gap-3 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_fever" checked={sickForm.has_fever === true} onChange={() => setSickForm(p => ({ ...p, has_fever: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_fever" checked={sickForm.has_fever === false} onChange={() => setSickForm(p => ({ ...p, has_fever: false }))} /> HINDI</label>
                        </div>
                      </div>

                      {sickForm.has_fever && (
                        <div className="space-y-1.5 pl-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span>Nilalagnat ba ayon sa kwento ng magulang? O mainit kapag hinipo? O temp 37.5°C+?</span>
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
                            <span>Mayroon bang paninigas ng batok?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stiff_neck" checked={sickForm.stiff_neck === true} onChange={() => setSickForm(p => ({ ...p, stiff_neck: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="stiff_neck" checked={sickForm.stiff_neck === false} onChange={() => setSickForm(p => ({ ...p, stiff_neck: false }))} /> Hindi</label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang lagnat", "Lagnat", "Malalang Lagnat"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_fever" checked={sickForm.classification_fever === c} onChange={() => setSickForm(p => ({ ...p, classification_fever: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : c === "Lagnat" ? "font-semibold text-amber-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 5. TIGDAS */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">ALAMIN KUNG MAY SENYALES NG TIGDAS</div>
                      <div className="space-y-1 pl-1">
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
                      </div>
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang Tigdas", "Tigdas", "Tigdas na May Komplikasyon sa Mata o Bibig", "Malalang Komplikadong Tigdas"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_measles" checked={sickForm.classification_measles === c} onChange={() => setSickForm(p => ({ ...p, classification_measles: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : c.includes("Komplikasyon") ? "font-semibold text-amber-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 6. DENGUE */}
                  <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">ALAMIN KUNG MAY SENYALES NG DENGUE</div>
                      <div className="space-y-1 pl-1">
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
                          <span>Tuloy-tuloy na sumasakit ang tiyan / nagsusuka?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_abdominal_pain" checked={sickForm.dengue_abdominal_pain === true} onChange={() => setSickForm(p => ({ ...p, dengue_abdominal_pain: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="dengue_abdominal_pain" checked={sickForm.dengue_abdominal_pain === false} onChange={() => setSickForm(p => ({ ...p, dengue_abdominal_pain: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Capillary Refill Time: <Input type="text" value={sickForm.capillary_refill_sec} onChange={e => setSickForm(p => ({ ...p, capillary_refill_sec: e.target.value }))} placeholder="seconds" className="w-16 h-5 inline-block text-xs border-b rounded-none text-center" /> Positibo ba ang tourniquet test?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tourniquet_test_positive" checked={sickForm.tourniquet_test_positive === true} onChange={() => setSickForm(p => ({ ...p, tourniquet_test_positive: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tourniquet_test_positive" checked={sickForm.tourniquet_test_positive === false} onChange={() => setSickForm(p => ({ ...p, tourniquet_test_positive: false }))} /> Hindi</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang Dengue", "Lagnat: Malamang Hindi Dengue Hemorrhagic Fever", "Malalang Dengue Hemorrhagic Fever"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_dengue" checked={sickForm.classification_dengue === c} onChange={() => setSickForm(p => ({ ...p, classification_dengue: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : c.includes("Malamang") ? "font-medium text-slate-700 dark:text-slate-300" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 7. PROBLEMA SA TENGA */}
                  <div className="grid grid-cols-12 p-2.5 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="flex items-center justify-between font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">
                        <span>ANG BATA BA AY MAY PROBLEMA SA TENGA?</span>
                        <div className="flex gap-3 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_ear_problem" checked={sickForm.has_ear_problem === true} onChange={() => setSickForm(p => ({ ...p, has_ear_problem: true }))} /> OO</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="has_ear_problem" checked={sickForm.has_ear_problem === false} onChange={() => setSickForm(p => ({ ...p, has_ear_problem: false }))} /> HINDI</label>
                        </div>
                      </div>

                      {sickForm.has_ear_problem && (
                        <div className="space-y-1.5 pl-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span>Masakit ba ang tenga?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_pain" checked={sickForm.ear_pain === true} onChange={() => setSickForm(p => ({ ...p, ear_pain: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_pain" checked={sickForm.ear_pain === false} onChange={() => setSickForm(p => ({ ...p, ear_pain: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Mayroon bang tumutulo mula sa tenga (luga)?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_discharge" checked={sickForm.ear_discharge === true} onChange={() => setSickForm(p => ({ ...p, ear_discharge: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_discharge" checked={sickForm.ear_discharge === false} onChange={() => setSickForm(p => ({ ...p, ear_discharge: false }))} /> Hindi</label>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>May pamamaga o pananakit sa likod ng tenga?</span>
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_swelling_behind" checked={sickForm.ear_swelling_behind === true} onChange={() => setSickForm(p => ({ ...p, ear_swelling_behind: true }))} /> Oo</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="ear_swelling_behind" checked={sickForm.ear_swelling_behind === false} onChange={() => setSickForm(p => ({ ...p, ear_swelling_behind: false }))} /> Hindi</label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      {["Walang Impeksyon sa Tenga", "Bagong Impeksyon sa Tenga", "Matagal na Impeksyon sa Tenga", "Mastoiditis"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_ear" checked={sickForm.classification_ear === c} onChange={() => setSickForm(p => ({ ...p, classification_ear: c }))} />
                          <span className={cn(c.includes("Mastoiditis") ? "font-bold text-rose-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* PAGE 2: IMMUNIZATION, VITAMIN A, NUTRITION, FEEDING & TREATMENT */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-md p-3 space-y-4 bg-card">
                  
                  {/* 8. BAKUNA (VACCINES) & VITAMIN A */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b">
                    <div className="space-y-2">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">SURIIN ANG MGA BAKUNA NG BATA</div>
                      <p className="text-[10px] text-slate-500">Lagyan ng check ang mga bakunang naibigay na sa bata:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          "BCG", "OPV1", "DPT1", "HepB1",
                          "OPV2", "DPT2", "HepB2",
                          "OPV3", "DPT3", "HepB3", "Measles"
                        ].map(vac => (
                          <label key={vac} className="flex items-center space-x-1.5 cursor-pointer">
                            <Checkbox checked={sickForm.vaccines_given.includes(vac)} onCheckedChange={() => toggleVaccine(vac)} />
                            <span>{vac}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-1">
                        <Label className="text-[10px] text-slate-500">Bakuna na maaaring ibigay ngayon:</Label>
                        <Input type="text" value={sickForm.vaccines_needed_today} onChange={e => setSickForm(p => ({ ...p, vaccines_needed_today: e.target.value }))} placeholder="Hal. Measles dose 2" className={lineInputClass} />
                      </div>
                    </div>

                    <div className="space-y-2 border-l border-slate-200 dark:border-slate-700 pl-3">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">SURIIN KUNG NABIGYAN NA NG VITAMIN A</div>
                      <p className="text-[10px] text-slate-500">(Para sa batang 6 na buwang gulang o higit pa):</p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span>Nabigyan na ng Vitamin A nitong nakaraang 6 buwan?</span>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vit_a_past_6months" checked={sickForm.vit_a_past_6months === true} onChange={() => setSickForm(p => ({ ...p, vit_a_past_6months: true }))} /> Oo</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="vit_a_past_6months" checked={sickForm.vit_a_past_6months === false} onChange={() => setSickForm(p => ({ ...p, vit_a_past_6months: false }))} /> Hindi</label>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs pt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="vit_a_needed_today" checked={sickForm.vit_a_needed_today === false} onChange={() => setSickForm(p => ({ ...p, vit_a_needed_today: false }))} />
                          <span>Hindi Kailangan ng Vitamin A ngayon</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer font-semibold text-amber-600">
                          <input type="radio" name="vit_a_needed_today" checked={sickForm.vit_a_needed_today === true} onChange={() => setSickForm(p => ({ ...p, vit_a_needed_today: true }))} />
                          <span>Kailangan ng Vitamin A ngayon</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 10. MALNUTRISYON AT ANEMIA */}
                  <div className="grid grid-cols-12 border-b pb-3">
                    <div className="col-span-8 space-y-1.5 pr-2">
                      <div className="font-bold uppercase text-[11px] text-slate-800 dark:text-slate-200">SURIIN KUNG MAY MALNUTRISYON O ANEMIA</div>
                      <div className="space-y-1 pl-1">
                        <div className="flex items-center justify-between">
                          <span>Lubhang mababa ang timbang para sa edad? (very low weight)</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="very_low_weight" checked={sickForm.very_low_weight === true} onChange={() => setSickForm(p => ({ ...p, very_low_weight: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="very_low_weight" checked={sickForm.very_low_weight === false} onChange={() => setSickForm(p => ({ ...p, very_low_weight: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>May malubha bang pangangayayat?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="severe_wasting" checked={sickForm.severe_wasting === true} onChange={() => setSickForm(p => ({ ...p, severe_wasting: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="severe_wasting" checked={sickForm.severe_wasting === false} onChange={() => setSickForm(p => ({ ...p, severe_wasting: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Manas ba ang dalawang paa (edema)?</span>
                          <div className="flex gap-3 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edema_both_feet" checked={sickForm.edema_both_feet === true} onChange={() => setSickForm(p => ({ ...p, edema_both_feet: true }))} /> Oo</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edema_both_feet" checked={sickForm.edema_both_feet === false} onChange={() => setSickForm(p => ({ ...p, edema_both_feet: false }))} /> Hindi</label>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mid-Upper Arm Circumference (MUAC):</span>
                          <Input type="text" value={sickForm.muac_cm} onChange={e => setSickForm(p => ({ ...p, muac_cm: e.target.value }))} placeholder="___ cm" className="w-20 h-5 text-xs border-b text-center" />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 border-l border-slate-200 dark:border-slate-700 pl-3 space-y-1.5 justify-center flex flex-col">
                      <div className="font-bold text-[10px] text-slate-500 uppercase">Malnutrisyon:</div>
                      {["Walang malnutrisyon", "Napakababang timbang", "Matinding malnutrisyon"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_malnutrition" checked={sickForm.classification_malnutrition === c} onChange={() => setSickForm(p => ({ ...p, classification_malnutrition: c }))} />
                          <span className={cn(c.includes("Matinding") ? "font-bold text-rose-600" : "")}>{c}</span>
                        </label>
                      ))}
                      <div className="font-bold text-[10px] text-slate-500 uppercase pt-1">Anemia:</div>
                      {["Walang Anemia", "Anemia", "Malalang Anemia"].map(c => (
                        <label key={c} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="classification_anemia" checked={sickForm.classification_anemia === c} onChange={() => setSickForm(p => ({ ...p, classification_anemia: c }))} />
                          <span className={cn(c.includes("Malalang") ? "font-bold text-rose-600" : "")}>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 11. DOCTOR EVALUATION & TREATMENT SUMMARY */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded">
                      <span className="font-bold text-slate-800 dark:text-slate-200">DOCTOR EVALUATION & TREATMENT RECORD:</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                          <input type="radio" name="doctor_see" checked={sickForm.doctor_see === true} onChange={() => setSickForm(p => ({ ...p, doctor_see: true }))} /> Titingnan ng Doktor
                        </label>
                        <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                          <input type="radio" name="doctor_see" checked={sickForm.doctor_see === false} onChange={() => setSickForm(p => ({ ...p, doctor_see: false }))} /> Hindi titingnan ng Doktor
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PAGGAMOT (Treatments, Paracetamol, ORS, Antibiotics, etc.):</Label>
                        <Textarea value={sickForm.treatment_notes} onChange={e => setSickForm(p => ({ ...p, treatment_notes: e.target.value }))} placeholder="Hal. Paracetamol syr 125mg/5ml 1.5ml q4h..." className="h-16 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">MGA PAYO KUNG KAILAN DAPAT BUMALIK KAAGAD:</Label>
                        <Textarea value={sickForm.urgent_return_advice} onChange={e => setSickForm(p => ({ ...p, urgent_return_advice: e.target.value }))} placeholder="Kapag lumala ang lagnat, hirap huminga, o di makainom..." className="h-16 text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PAYO SA PAGPAPAKAIN & PAG-AARUGA:</Label>
                        <Textarea value={sickForm.feeding_advice} onChange={e => setSickForm(p => ({ ...p, feeding_advice: e.target.value }))} placeholder="Patuloy na pagpapasuso at pagbibigay ng sabaw at malambot na pagkain..." className="h-14 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PETSA NG PAGBALIK SA HEALTH CENTER:</Label>
                        <Input type="date" value={sickForm.return_health_center_date} onChange={e => setSickForm(p => ({ ...p, return_health_center_date: e.target.value }))} className={`${lineInputClass} ${!sickForm.return_health_center_date ? "empty-date" : ""}`} />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 no-print pt-2 border-t">
                  <Button type="button" variant="outline" onClick={handleResetSickForm} className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-medium">
                    <RefreshCw className="h-3.5 w-3.5" /> Reset Form
                  </Button>

                  <Button type="submit" disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Sick Child Record"}
                  </Button>
                </div>

              </form>

            </TabsContent>

            {/* TAB 2: Children's Master List for Vitamin A and RHU2 (Official Paper Form Replica) */}
            <TabsContent value="vitamin-a" className="mt-4 space-y-4">
              
              {/* Form Title Banner */}
              <div className="text-center py-2 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-300 dark:border-amber-700/60 relative">
                <h1 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 font-heading">
                  VITAMIN A AND DEWORMING MASTER LIST - RHU2
                </h1>
                <div className="absolute left-3 top-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  BARANGAY: <strong>SUBUKIN</strong>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center justify-between no-print bg-muted/40 p-2.5 rounded-md border">
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

                <Button type="button" variant="outline" size="sm" onClick={handleAddVitARow} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Child Row
                </Button>
              </div>

              {/* Masterlist 20-Column Table */}
              <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-md">
                <table className="w-full text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center border-b border-slate-400">
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 w-8">NO.</th>
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[180px]">
                        NAME OF CHILD<br/><span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">(First Name, MI, Last Name)</span>
                      </th>
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[90px]">BIRTH DATE</th>
                      
                      <th colSpan={1} rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200">6 MOS.</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200">12-23 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">24-35 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200">36-47 MONTHS</th>
                      <th colSpan={4} className="border border-slate-300 dark:border-slate-700 p-1 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200">48-59 MONTHS</th>
                      
                      <th rowSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 w-8 no-print"></th>
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

                        <td className="border border-slate-300 dark:border-slate-700 p-1 text-center no-print">
                          {vitARows.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveVitARow(row.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between no-print pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={handleAddVitARow} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Child Row
                </Button>

                <Button type="button" onClick={handleSaveVitAMasterlist} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Vitamin A Master List"}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: Supplemental Immunization Activity (SIA) Master List (Official Paper Form Replica) */}
            <TabsContent value="sia-masterlist" className="mt-4 space-y-4">
              
              {/* Title Banner */}
              <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-300 dark:border-emerald-700/60 relative">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-2.5 rounded-md border text-xs">
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
                <div className="flex items-end justify-end no-print">
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSIARow} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Child Row
                  </Button>
                </div>
              </div>

              {/* SIA Masterlist Table matching exact photo */}
              <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-md">
                <table className="w-full text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center border-b border-slate-400">
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-6">#</th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[240px]">NAME</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[85px]">Date of Birth<br/><span className="text-[9px] font-normal">(YYYY-MM-DD)</span></th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-14">Age in Months</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-12">Gender<br/><span className="text-[9px] font-normal">(M/F)</span></th>
                      <th colSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[160px]">Address</th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[240px]">Name of Mother</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[90px]">Vaccine Given</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[85px]">Date of Vaccination<br/><span className="text-[9px] font-normal">(YYYY-MM-DD)</span></th>
                      <th colSpan={3} className="border border-slate-300 dark:border-slate-700 p-1 min-w-[240px]">Name of Vaccinator</th>
                      <th rowSpan={2} className="border border-slate-300 dark:border-slate-700 p-1 w-6 no-print"></th>
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
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5">
                          <select value={row.gender} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, gender: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-[11px] text-center">
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        </td>

                        {/* Address */}
                        <td className="border border-slate-300 dark:border-slate-700 p-0.5"><input type="text" value={row.barangay} onChange={e => setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, barangay: e.target.value } : r))} className="w-full bg-transparent border-0 outline-none text-xs px-1 text-center" /></td>
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

                        <td className="border border-slate-300 dark:border-slate-700 p-1 text-center no-print">
                          {siaRows.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSIARow(row.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between no-print pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={handleAddSIARow} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Child Row
                </Button>

                <Button type="button" onClick={handleSaveSIAMasterlist} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save SIA Master List"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      {/* SAVED CHILD HEALTH RECORDS HISTORY TABLE */}
      <Card className="border border-border/50 shadow-md bg-card text-card-foreground no-print">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 font-heading">
                <Baby className="h-5 w-5 text-sky-600" /> Saved Child Health Records History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Barangay Subukin – Comprehensive Child Health & Masterlist Database
              </p>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search child name..." 
                value={historySearch} 
                onChange={e => setHistorySearch(e.target.value)} 
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Loading records...</div>
          ) : savedHealthRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">No child health records found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  <th className="p-3">Checkup Date</th>
                  <th className="p-3">Category / Form</th>
                  <th className="p-3">Remarks / Summary</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savedHealthRecords
                  .filter(r => !historySearch.trim() || (r.remarks || "").toLowerCase().includes(historySearch.toLowerCase()))
                  .map(rec => (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">{rec.checkup_date || "—"}</td>
                      <td className="p-3 font-semibold text-primary">
                        {rec.remarks?.includes("Sick Child") ? "Care for Sick Children" :
                         rec.remarks?.includes("Vitamin A") ? "Vitamin A & RHU2" :
                         rec.remarks?.includes("SIA") ? "SIA Masterlist (6-59m)" : "Child Health"}
                      </td>
                      <td className="p-3 max-w-md truncate text-muted-foreground">{rec.remarks || "—"}</td>
                      <td className="p-3 text-right space-x-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedRecordForView(rec);
                            setViewRecordModalOpen(true);
                          }} 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setDeleteConfirmId(rec.id)} 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* VIEW RECORD DETAIL DIALOG */}
      <Dialog open={viewRecordModalOpen} onOpenChange={setViewRecordModalOpen}>
        <DialogContent className="max-w-xl bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
              <Baby className="h-5 w-5 text-sky-600" /> Child Health Record Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Barangay Subukin – Official Registered Record
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForView && (
            <div className="space-y-3 text-xs py-2 max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-md border space-y-1.5">
                <div><strong>Checkup / Activity Date:</strong> {selectedRecordForView.checkup_date}</div>
                <div><strong>Summary Remarks:</strong> {selectedRecordForView.remarks}</div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setViewRecordModalOpen(false)}>
              Close
            </Button>
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
    </div>
  );
};

export default ChildHealthForm;
