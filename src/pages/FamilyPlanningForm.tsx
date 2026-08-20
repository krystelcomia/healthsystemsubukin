import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Heart, Plus, Pencil, Trash2, Printer, RefreshCw, Save, Search, Eye, Stethoscope, Calendar, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import { getFamilyOnlyResidents } from "@/lib/residentLinker";
import { ensureResidentExists, calculateAge } from "@/lib/residentLinker";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";
import {
  allowOnlyNumbers,
  allowNumbersAndDecimal,
  allowNumbersAndSlash,
  allowOnlyLetters,
  sanitizeNumbers,
  sanitizeNumbersAndDecimal,
  sanitizeNumbersAndSlash,
  sanitizeLetters,
} from "@/lib/inputValidation";

// --- INTERFACES FOR FP FORM 1 ---
export interface FPSideAData {
  // Header / Admin
  fp_no: string;
  philhealth_no: string;
  nhts: boolean | null;

  // Name of Client
  client_last_name: string;
  client_given_name: string;
  client_mi: string;
  client_dob: string;
  client_age: string;
  client_occupation: string;

  // Address
  address_no: string;
  address_street: string;
  address_barangay: string;
  address_municipality: string;
  address_province: string;
  contact_number: string;
  civil_status: string;
  religion: string;

  // Name of Spouse
  spouse_last_name: string;
  spouse_given_name: string;
  spouse_mi: string;
  spouse_dob: string;
  spouse_age: string;
  spouse_occupation: string;

  // Family Stats
  no_living_children: string;
  plan_more_children: boolean | null;
  average_monthly_income: string;

  // Type of Client
  type_of_client: "new_acceptor" | "current_user" | "changing_method" | "changing_clinic" | "dropout_restart" | "";
  reason_fp: "spacing" | "limiting" | "others" | "";
  reason_fp_others: string;
  reason_changing: "medical_condition" | "side_effects" | "";

  // Previously Used Method
  prev_method: {
    implant: boolean;
    iud: boolean;
    btl: boolean;
    nsv: boolean;
    injectable: boolean;
    coc: boolean;
    pop: boolean;
    condom: boolean;
    lam: boolean;
    sdm: boolean;
    bbt: boolean;
    bom_cmm_stm: boolean;
  };

  // Section I: Medical History
  medical_history: {
    severe_headaches: boolean | null;
    history_stroke_hypertension: boolean | null;
    non_traumatic_hematoma: boolean | null;
    breast_cancer_mass: boolean | null;
    severe_chest_pain: boolean | null;
    cough_14_days: boolean | null;
    jaundice: boolean | null;
    unexplained_vaginal_bleeding: boolean | null;
    abnormal_vaginal_discharge: boolean | null;
    phenobarbital_rifampicin: boolean | null;
    is_smoker: boolean | null;
    with_disability: boolean | null;
    disability_specify: string;
  };

  // Section II: Obstetrical History
  obstetrical_history: {
    g_pregnancies: string;
    p_pregnancies: string;
    full_term: string;
    premature: string;
    abortion: string;
    living_children: string;
    date_last_delivery: string;
    type_last_delivery: "vaginal" | "cesarean" | "";
    last_menstrual_period: string;
    previous_menstrual_period: string;
    menstrual_flow: "scanty" | "moderate" | "heavy" | "";
    dysmenorrhea: boolean;
    hydatidiform_mole: boolean;
    history_ectopic_pregnancy: boolean;
  };

  // Section III: STI Risks
  sti_risks: {
    abnormal_discharge_genital: boolean | null;
    discharge_location: "vagina" | "penis" | "";
    sores_ulcers_genital: boolean | null;
    pain_burning_genital: boolean | null;
    history_sti_treatment: boolean | null;
    hiv_aids_pid: boolean | null;
  };

  // Section IV: VAW Risks
  vaw_risks: {
    history_domestic_violence: boolean | null;
    unpleasant_relationship_partner: boolean | null;
    partner_disapproves_fp: boolean | null;
    referred_dswd: boolean;
    referred_wcpu: boolean;
    referred_ngos: boolean;
    referred_others: boolean;
    referred_others_specify: string;
  };

  // Section V: Physical Examination
  physical_exam: {
    weight_kg: string;
    height_m: string;
    bp: string;
    pulse_rate: string;
    skin_normal: boolean; skin_pale: boolean; skin_yellowish: boolean; skin_hematoma: boolean;
    extremities_normal: boolean; extremities_edema: boolean; extremities_varicosities: boolean;
    conjunctiva_normal: boolean; conjunctiva_pale: boolean; conjunctiva_yellowish: boolean;
    neck_normal: boolean; neck_mass: boolean; neck_enlarged_lymph_nodes: boolean;
    breast_normal: boolean; breast_mass: boolean; breast_nipple_discharge: boolean;
    abdomen_normal: boolean; abdomen_mass: boolean; abdomen_varicosities: boolean;
    pelvic_normal: boolean; pelvic_mass: boolean; pelvic_abnormal_discharge: boolean; pelvic_cervical_abnormalities: boolean;
    cervical_warts: boolean; cervical_polyp_cyst: boolean; cervical_inflammation_erosion: boolean; cervical_bloody_discharge: boolean;
    cervical_consistency: "firm" | "soft" | "";
    cervical_tenderness: boolean;
    adnexal_mass_tenderness: boolean;
    uterine_position: "mid" | "anteflexed" | "retroflexed" | "";
    uterine_depth_cm: string;
  };

  // Acknowledgement & Consent
  chosen_method: string;
  client_signature_date: string;
  registry_consent_date: string;
}

export interface FPSideBVisitRow {
  id: string;
  visit_date: string;
  medical_findings: string;
  method_accepted: string;
  provider_name: string;
  followup_date: string;
}

export interface FPPregnancyChecklist {
  q1_baby_under_6m_breastfeeding_no_menses: boolean | null;
  q2_abstained_since_lmp_delivery: boolean | null;
  q3_baby_in_last_4_weeks: boolean | null;
  q4_lmp_within_past_7_days: boolean | null;
  q5_miscarriage_abortion_last_7_days: boolean | null;
  q6_using_contraceptive_consistently: boolean | null;
}

export interface FPFullFormState {
  sideA: FPSideAData;
  sideBVisits: FPSideBVisitRow[];
  pregnancyChecklist: FPPregnancyChecklist;
}

// Initial Blank State generator (All checkboxes UNCHECKED by default)
const createInitialFPForm = (): FPFullFormState => ({
  sideA: {
    fp_no: "",
    philhealth_no: "",
    nhts: null,
    client_last_name: "",
    client_given_name: "",
    client_mi: "",
    client_dob: "",
    client_age: "",
    client_occupation: "",
    address_no: "",
    address_street: "",
    address_barangay: "Subukin",
    address_municipality: "San Juan",
    address_province: "Batangas",
    contact_number: "",
    civil_status: "Married",
    religion: "Roman Catholic",
    spouse_last_name: "",
    spouse_given_name: "",
    spouse_mi: "",
    spouse_dob: "",
    spouse_age: "",
    spouse_occupation: "",
    no_living_children: "",
    plan_more_children: null,
    average_monthly_income: "",
    type_of_client: "",
    reason_fp: "",
    reason_fp_others: "",
    reason_changing: "",
    prev_method: {
      implant: false, iud: false, btl: false, nsv: false, injectable: false,
      coc: false, pop: false, condom: false, lam: false, sdm: false, bbt: false, bom_cmm_stm: false
    },
    medical_history: {
      severe_headaches: null, history_stroke_hypertension: null, non_traumatic_hematoma: null,
      breast_cancer_mass: null, severe_chest_pain: null, cough_14_days: null, jaundice: null,
      unexplained_vaginal_bleeding: null, abnormal_vaginal_discharge: null, phenobarbital_rifampicin: null,
      is_smoker: null, with_disability: null, disability_specify: ""
    },
    obstetrical_history: {
      g_pregnancies: "", p_pregnancies: "", full_term: "", premature: "", abortion: "", living_children: "",
      date_last_delivery: "", type_last_delivery: "", last_menstrual_period: "", previous_menstrual_period: "",
      menstrual_flow: "", dysmenorrhea: false, hydatidiform_mole: false, history_ectopic_pregnancy: false
    },
    sti_risks: {
      abnormal_discharge_genital: null, discharge_location: "", sores_ulcers_genital: null,
      pain_burning_genital: null, history_sti_treatment: null, hiv_aids_pid: null
    },
    vaw_risks: {
      history_domestic_violence: null, unpleasant_relationship_partner: null, partner_disapproves_fp: null,
      referred_dswd: false, referred_wcpu: false, referred_ngos: false, referred_others: false, referred_others_specify: ""
    },
    physical_exam: {
      weight_kg: "", height_m: "", bp: "", pulse_rate: "",
      skin_normal: false, skin_pale: false, skin_yellowish: false, skin_hematoma: false,
      extremities_normal: false, extremities_edema: false, extremities_varicosities: false,
      conjunctiva_normal: false, conjunctiva_pale: false, conjunctiva_yellowish: false,
      neck_normal: false, neck_mass: false, neck_enlarged_lymph_nodes: false,
      breast_normal: false, breast_mass: false, breast_nipple_discharge: false,
      abdomen_normal: false, abdomen_mass: false, abdomen_varicosities: false,
      pelvic_normal: false, pelvic_mass: false, pelvic_abnormal_discharge: false, pelvic_cervical_abnormalities: false,
      cervical_warts: false, cervical_polyp_cyst: false, cervical_inflammation_erosion: false, cervical_bloody_discharge: false,
      cervical_consistency: "", cervical_tenderness: false, adnexal_mass_tenderness: false, uterine_position: "", uterine_depth_cm: ""
    },
    chosen_method: "",
    client_signature_date: new Date().toISOString().split("T")[0],
    registry_consent_date: new Date().toISOString().split("T")[0]
  },
  sideBVisits: [
    {
      id: `visit-1`,
      visit_date: new Date().toISOString().split("T")[0],
      medical_findings: "",
      method_accepted: "",
      provider_name: "",
      followup_date: ""
    }
  ],
  pregnancyChecklist: {
    q1_baby_under_6m_breastfeeding_no_menses: null,
    q2_abstained_since_lmp_delivery: null,
    q3_baby_in_last_4_weeks: null,
    q4_lmp_within_past_7_days: null,
    q5_miscarriage_abortion_last_7_days: null,
    q6_using_contraceptive_consistently: null
  }
});

const FP_METHODS = [
  "Pills (COC)", "Pills (POP)", "IUD", "Injectable (DMPA)", "Implant",
  "Condom", "BTL (Tubal Ligation)", "NSV (Vasectomy)",
  "LAM (Lactational Amenorrhea)", "SDM (Standard Days)", "Natural Family Planning", "Other"
];

const STORAGE_KEY_FP_DRAFT = "bhw_fp_form_1_draft";
const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-6 text-xs";

const sanitizeDraftState = (parsed: any): FPFullFormState => {
  const initial = createInitialFPForm();
  if (!parsed || !parsed.sideA) return initial;

  const mh = parsed.sideA.medical_history;
  if (mh) {
    const keys = Object.keys(mh).filter(k => k !== "disability_specify");
    const allFalse = keys.length > 0 && keys.every(k => mh[k] === false);
    if (allFalse) {
      keys.forEach(k => { mh[k] = null; });
    }
  }

  const sti = parsed.sideA.sti_risks;
  if (sti) {
    const keys = Object.keys(sti).filter(k => k !== "discharge_location");
    const allFalse = keys.length > 0 && keys.every(k => sti[k] === false);
    if (allFalse) {
      keys.forEach(k => { sti[k] = null; });
    }
  }

  const vaw = parsed.sideA.vaw_risks;
  if (vaw) {
    const keys = ["history_domestic_violence", "unpleasant_relationship_partner", "partner_disapproves_fp"];
    const allFalse = keys.every(k => vaw[k] === false);
    if (allFalse) {
      keys.forEach(k => { vaw[k] = null; });
    }
  }

  return parsed;
};

const FamilyPlanningForm = () => {
  const { t } = useSettings();
  const [fpState, setFpState] = useState<FPFullFormState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FP_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.sideA) return sanitizeDraftState(parsed);
      }
    } catch {}
    return createInitialFPForm();
  });

  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (fpState) {
      localStorage.setItem(STORAGE_KEY_FP_DRAFT, JSON.stringify(fpState));
    }
  }, [fpState]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, { data: fpData }] = await Promise.all([
        getFamilyOnlyResidents(),
        supabase.from("family_planning").select("*, residents(full_name, sitio, age, gender, birthday, family_number)").order("created_at", { ascending: false })
      ]);
      setResidents(resData || []);
      setSavedRecords(fpData || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load family planning data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Resident Selection
  const handleSelectResident = (resId: string) => {
    setSelectedResidentId(resId);
    if (!resId) return;

    const res = residents.find((r) => r.id === resId);
    if (!res) return;

    // Parse name into last name, given name, middle name
    const parts = (res.full_name || "").trim().split(" ");
    let lastName = "";
    let givenName = "";
    let mi = "";

    if (parts.length === 1) {
      givenName = parts[0];
    } else if (parts.length === 2) {
      givenName = parts[0];
      lastName = parts[1];
    } else {
      givenName = parts[0];
      mi = parts[1].substring(0, 1).toUpperCase();
      lastName = parts.slice(2).join(" ");
    }

    setFpState((prev) => ({
      ...prev,
      sideA: {
        ...prev.sideA,
        client_last_name: lastName || prev.sideA.client_last_name,
        client_given_name: givenName || prev.sideA.client_given_name,
        client_mi: mi || prev.sideA.client_mi,
        client_dob: res.birthday || prev.sideA.client_dob,
        client_age: res.age ? String(res.age) : prev.sideA.client_age,
        address_barangay: "Subukin",
        address_street: res.sitio || prev.sideA.address_street,
        civil_status: res.status || prev.sideA.civil_status,
        religion: res.religion || prev.sideA.religion,
      },
    }));

    toast.success(`Loaded details for resident: ${res.full_name}`);
  };

  // Reset Form
  const handleResetForm = () => {
    localStorage.removeItem(STORAGE_KEY_FP_DRAFT);
    setFpState(createInitialFPForm());
    setSelectedResidentId("");
    toast.info("Form reset to blank.");
  };

  // Save Record
  const handleSaveFPRecord = async () => {
    const sideA = fpState.sideA;
    const clientFullName = `${sideA.client_given_name} ${sideA.client_mi} ${sideA.client_last_name}`.trim();

    if (!clientFullName) {
      toast.error("Please enter client's name.");
      return;
    }

    setSaving(true);
    try {
      // Link or create resident
      const resId = await ensureResidentExists({
        fullName: clientFullName,
        sitio: sideA.address_street || "Subukin",
        gender: "Female",
        birthday: sideA.client_dob,
        age: sideA.client_age,
        status: sideA.civil_status,
      });

      const primaryMethod = sideA.chosen_method || fpState.sideBVisits[0]?.method_accepted || "N/A";
      const remarksText = `[FP FORM 1] Client: ${clientFullName}, Method: ${primaryMethod}, FP No: ${sideA.fp_no || "N/A"}`;

      const payload = {
        resident_id: resId || selectedResidentId || null,
        method: primaryMethod,
        start_date: fpState.sideBVisits[0]?.visit_date || new Date().toISOString().split("T")[0],
        remarks: remarksText,
        details: JSON.stringify(fpState),
      };

      const { error } = await supabase.from("family_planning").insert(payload as any);
      if (error) throw error;

      toast.success("Family Planning Client Assessment Record saved successfully!");
      logActivity("submit_family_planning", {
        entity_type: "family_planning",
        description: `Saved FP Form 1 assessment for client: ${clientFullName} (${primaryMethod})`,
      });

      handleResetForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error saving Family Planning record.");
    } finally {
      setSaving(false);
    }
  };

  // Add Row to Side B Visit Table
  const handleAddVisitRow = () => {
    setFpState((prev) => ({
      ...prev,
      sideBVisits: [
        ...prev.sideBVisits,
        {
          id: `visit-${Date.now()}`,
          visit_date: new Date().toISOString().split("T")[0],
          medical_findings: "",
          method_accepted: "",
          provider_name: "",
          followup_date: "",
        },
      ],
    }));
  };

  const handleRemoveVisitRow = (id: string) => {
    setFpState((prev) => ({
      ...prev,
      sideBVisits: prev.sideBVisits.filter((v) => v.id !== id),
    }));
  };

  // Delete Record from Supabase
  const handleDeleteRecord = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from("family_planning").delete().eq("id", deleteConfirmId);
      if (error) throw error;

      toast.success("Family Planning record deleted!");
      logActivity("delete_family_planning", {
        entity_type: "family_planning",
        entity_id: deleteConfirmId,
        description: `Deleted Family Planning record`,
      });
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error deleting record.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parseRecordDetails = (rec: any): FPFullFormState | null => {
    try {
      if (rec?.details) {
        const parsed = JSON.parse(rec.details);
        if (parsed && parsed.sideA) return parsed;
      }
    } catch {}
    return null;
  };

  const filteredHistoryRecords = savedRecords.filter((r) => {
    const name = r.residents?.full_name || r.remarks || "";
    return name.toLowerCase().includes(historySearch.toLowerCase());
  });

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Dynamic Print CSS Setup */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #fp-print-area, #fp-print-area * {
            visibility: visible !important;
          }
          #fp-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
          }
          .header-seal img {
            height: 68px !important;
            max-height: 68px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }
          select {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            background: transparent !important;
            border: none !important;
          }
          @page {
            size: legal portrait;
            margin: 6mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
              {t("fp.title") || "Family Planning Client Assessment Record"}
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                DOH FP FORM 1
              </Badge>
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Official Digital Replica of Department of Health FP Form 1 (Side A & Side B) – Client clinical assessment, medical history evaluation, method tracking, and follow-up records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end flex-wrap">
          <div className="bg-card/80 border border-border/60 rounded-xl px-4 py-2 text-center shrink-0 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Registered Clients</span>
            <span className="text-base font-extrabold text-primary">{savedRecords.length}</span>
          </div>
          <div className="bg-card/80 border border-border/60 rounded-xl px-4 py-2 text-center shrink-0 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Sections Included</span>
            <span className="text-base font-extrabold text-primary">Side A & Side B</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Resident Selector Bar */}
      <Card className="border-border/50 shadow-xs no-print">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Select a registered resident to auto-fill demographic info:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap shrink-0">
            <div className="w-56 shrink-0">
              <Select value={selectedResidentId} onValueChange={handleSelectResident}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Pumili ng Residente..." />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.full_name} ({r.sitio || "Subukin"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={handleResetForm} className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 shrink-0 whitespace-nowrap">
                <RefreshCw className="h-3.5 w-3.5" /> Reset Form
              </Button>

              <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10 shrink-0 whitespace-nowrap">
                <Printer className="h-4 w-4" /> Print Form
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Linked Form (Side A & Side B in Continuous Official Layout) */}
      <div id="fp-print-area" className="space-y-6">
        
        {/* SECTION 1: SIDE A - Assessment Record Replica */}
        <div className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs text-xs space-y-3 font-sans">
          
          {/* Official Barangay Printable Header */}
          <div 
            className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6 text-center" 
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: '24px', borderBottom: '4px double #000', paddingBottom: '16px', marginBottom: '20px', textAlign: 'center' }}
          >
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: '80px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: '80px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: '80px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>

          {/* Form Title Header Banner */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-slate-600 dark:text-slate-400">SIDE A</div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                FAMILY PLANNING CLIENT ASSESSMENT RECORD
              </h1>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">
                Instructions for Physicians, Nurses and Midwives: Make sure that the client is not pregnant by using the questions listed in SIDE B. Completely fill out or check the required information. Refer accordingly for any abnormal history/findings for further medical evaluation.
              </p>
            </div>
            <div className="text-right text-[11px] font-mono space-y-1">
              <div className="font-extrabold text-slate-800 dark:text-slate-200">FP FORM 1</div>
              <div className="flex items-center gap-1">
                <span className="font-bold">FP NO / CLIENT ID:</span>
                <input type="text" value={fpState.sideA.fp_no} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, fp_no: sanitizeNumbers(e.target.value) } }))} className="w-24 border-b border-slate-400 bg-transparent text-center text-xs font-semibold outline-none" />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">PHILHEALTH NO:</span>
                <input type="text" value={fpState.sideA.philhealth_no} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, philhealth_no: sanitizeNumbers(e.target.value) } }))} className="w-24 border-b border-slate-400 bg-transparent text-center text-xs font-semibold outline-none" />
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px]">
                <span className="font-bold">NHTS?</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={fpState.sideA.nhts === true} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, nhts: e.target.checked ? true : null } }))} className="h-3 w-3" /> Yes
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={fpState.sideA.nhts === false} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, nhts: e.target.checked ? false : null } }))} className="h-3 w-3" /> No
                </label>
              </div>
            </div>
          </div>

          {/* Client Demographics Box */}
          <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
            {/* Row 1: Name of Client */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <div className="md:col-span-1 font-bold text-slate-800 dark:text-slate-200">NAME OF CLIENT:</div>
              <div>
                <span className="text-[10px] text-slate-500 block">Last Name</span>
                <Input type="text" value={fpState.sideA.client_last_name} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_last_name: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Given Name</span>
                <Input type="text" value={fpState.sideA.client_given_name} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_given_name: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div className="w-16">
                <span className="text-[10px] text-slate-500 block">MI</span>
                <Input type="text" value={fpState.sideA.client_mi} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_mi: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Date of Birth</span>
                <Input type="date" value={fpState.sideA.client_dob} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_dob: e.target.value, client_age: String(calculateAge(e.target.value)) } }))} className={lineInputClass} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Age</span>
                  <Input type="text" value={fpState.sideA.client_age} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_age: sanitizeNumbers(e.target.value) } }))} className={lineInputClass} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Occupation</span>
                  <Input type="text" value={fpState.sideA.client_occupation} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_occupation: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
                </div>
              </div>
            </div>

            {/* Row 2: Address */}
            <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
              <div className="md:col-span-1 font-bold text-slate-800 dark:text-slate-200">ADDRESS:</div>
              <div className="w-16">
                <span className="text-[10px] text-slate-500 block">No.</span>
                <Input type="text" value={fpState.sideA.address_no} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, address_no: sanitizeNumbers(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Street / Sitio</span>
                <Input type="text" value={fpState.sideA.address_street} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, address_street: e.target.value } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Barangay</span>
                <Input type="text" value={fpState.sideA.address_barangay} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, address_barangay: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Municipality/City</span>
                <Input type="text" value={fpState.sideA.address_municipality} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, address_municipality: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Province</span>
                <Input type="text" value={fpState.sideA.address_province} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, address_province: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Contact Number</span>
                <Input type="text" value={fpState.sideA.contact_number} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, contact_number: sanitizeNumbers(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Civil Status</span>
                  <Input type="text" value={fpState.sideA.civil_status} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, civil_status: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Religion</span>
                  <Input type="text" value={fpState.sideA.religion} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, religion: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
                </div>
              </div>
            </div>

            {/* Row 3: Name of Spouse */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <div className="md:col-span-1 font-bold text-slate-800 dark:text-slate-200">NAME OF SPOUSE:</div>
              <div>
                <span className="text-[10px] text-slate-500 block">Last Name</span>
                <Input type="text" value={fpState.sideA.spouse_last_name} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_last_name: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Given Name</span>
                <Input type="text" value={fpState.sideA.spouse_given_name} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_given_name: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div className="w-16">
                <span className="text-[10px] text-slate-500 block">MI</span>
                <Input type="text" value={fpState.sideA.spouse_mi} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_mi: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Date of Birth</span>
                <Input type="date" value={fpState.sideA.spouse_dob} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_dob: e.target.value, spouse_age: String(calculateAge(e.target.value)) } }))} className={lineInputClass} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Age</span>
                  <Input type="text" value={fpState.sideA.spouse_age} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_age: sanitizeNumbers(e.target.value) } }))} className={lineInputClass} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Occupation</span>
                  <Input type="text" value={fpState.sideA.spouse_occupation} onKeyDown={allowOnlyLetters} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, spouse_occupation: sanitizeLetters(e.target.value) } }))} className={lineInputClass} />
                </div>
              </div>
            </div>

            {/* Row 4: Children & Income */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-300 dark:border-slate-700 pt-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-bold">NO. OF LIVING CHILDREN:</span>
                <Input type="text" value={fpState.sideA.no_living_children} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, no_living_children: sanitizeNumbers(e.target.value) } }))} className="w-16 h-6 border-b border-t-0 border-x-0 rounded-none text-center" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">PLAN TO HAVE MORE CHILDREN?</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={fpState.sideA.plan_more_children === true} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, plan_more_children: e.target.checked ? true : null } }))} className="h-3.5 w-3.5" /> Yes
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={fpState.sideA.plan_more_children === false} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, plan_more_children: e.target.checked ? false : null } }))} className="h-3.5 w-3.5" /> No
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">AVERAGE MONTHLY INCOME:</span>
                <span className="font-semibold">₱</span>
                <Input type="text" value={fpState.sideA.average_monthly_income} onKeyDown={allowNumbersAndDecimal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, average_monthly_income: sanitizeNumbersAndDecimal(e.target.value) } }))} className="w-28 h-6 border-b border-t-0 border-x-0 rounded-none text-center" />
              </div>
            </div>
          </div>

          {/* Type of Client & Previously Used Method Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left: Type of Client */}
            <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">Type of Client</div>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="radio" name="type_of_client" checked={fpState.sideA.type_of_client === "new_acceptor"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "new_acceptor" } }))} className="h-3.5 w-3.5" />
                    New Acceptor
                  </label>
                  <span className="text-slate-500 font-medium">Reason for FP:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_new" checked={fpState.sideA.type_of_client === "new_acceptor" && fpState.sideA.reason_fp === "spacing"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "new_acceptor", reason_fp: "spacing" } }))} className="h-3 w-3" /> spacing
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_new" checked={fpState.sideA.type_of_client === "new_acceptor" && fpState.sideA.reason_fp === "limiting"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "new_acceptor", reason_fp: "limiting" } }))} className="h-3 w-3" /> limiting
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_new" checked={fpState.sideA.type_of_client === "new_acceptor" && fpState.sideA.reason_fp === "others"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "new_acceptor", reason_fp: "others" } }))} className="h-3 w-3" /> others
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="radio" name="type_of_client" checked={fpState.sideA.type_of_client === "current_user"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "current_user" } }))} className="h-3.5 w-3.5" />
                    Current User
                  </label>
                  <span className="text-slate-500 font-medium">Reason for FP:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_curr" checked={fpState.sideA.type_of_client === "current_user" && fpState.sideA.reason_fp === "spacing"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "current_user", reason_fp: "spacing" } }))} className="h-3 w-3" /> spacing
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_curr" checked={fpState.sideA.type_of_client === "current_user" && fpState.sideA.reason_fp === "limiting"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "current_user", reason_fp: "limiting" } }))} className="h-3 w-3" /> limiting
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_fp_curr" checked={fpState.sideA.type_of_client === "current_user" && fpState.sideA.reason_fp === "others"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "current_user", reason_fp: "others" } }))} className="h-3 w-3" /> others
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="radio" name="type_of_client" checked={fpState.sideA.type_of_client === "changing_method"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "changing_method" } }))} className="h-3.5 w-3.5" />
                    Changing Method
                  </label>
                  <span className="text-slate-500 font-medium">Reason:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_changing" checked={fpState.sideA.reason_changing === "medical_condition"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, reason_changing: "medical_condition" } }))} className="h-3 w-3" /> medical condition
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="reason_changing" checked={fpState.sideA.reason_changing === "side_effects"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, reason_changing: "side_effects" } }))} className="h-3 w-3" /> side-effects
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="radio" name="type_of_client" checked={fpState.sideA.type_of_client === "changing_clinic"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "changing_clinic" } }))} className="h-3.5 w-3.5" />
                    Changing Clinic
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input type="radio" name="type_of_client" checked={fpState.sideA.type_of_client === "dropout_restart"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, type_of_client: "dropout_restart" } }))} className="h-3.5 w-3.5" />
                    Dropout / Restart
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Previously Used Method */}
            <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">Previously Used Method (for Current User)</div>
              <div className="grid grid-cols-4 gap-1.5 text-[11px] pt-1">
                {[
                  { key: "implant", label: "Implant" }, { key: "iud", label: "IUD" }, { key: "btl", label: "BTL" }, { key: "nsv", label: "NSV" },
                  { key: "injectable", label: "Injectable" }, { key: "coc", label: "COC" }, { key: "pop", label: "POP" }, { key: "condom", label: "Condom" },
                  { key: "lam", label: "LAM" }, { key: "sdm", label: "SDM" }, { key: "bbt", label: "BBT" }, { key: "bom_cmm_stm", label: "BOM/CMM/STM" }
                ].map((item) => (
                  <label key={item.key} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(fpState.sideA.prev_method as any)[item.key]}
                      onChange={(e) => setFpState((p) => ({
                        ...p,
                        sideA: {
                          ...p.sideA,
                          prev_method: { ...p.sideA.prev_method, [item.key]: e.target.checked }
                        }
                      }))}
                      className="h-3.5 w-3.5"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Main Medical & Assessment Grid (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            
            {/* LEFT COLUMN: Medical, Obstetrical, STI History */}
            <div className="space-y-3">
              
              {/* I. MEDICAL HISTORY */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                <div className="font-bold border-b pb-1 flex justify-between items-center text-slate-900 dark:text-slate-100">
                  <span>I. MEDICAL HISTORY</span>
                  <span className="text-[10px] font-normal text-slate-500">Does the client have any of the following?</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  {[
                    { key: "severe_headaches", label: "severe headaches / migraine" },
                    { key: "history_stroke_hypertension", label: "history of stroke / heart attack / hypertension" },
                    { key: "non_traumatic_hematoma", label: "non-traumatic hematoma / frequent bruising or gum bleeding" },
                    { key: "breast_cancer_mass", label: "current or history of breast cancer / breast mass" },
                    { key: "severe_chest_pain", label: "severe chest pain" },
                    { key: "cough_14_days", label: "cough for more than 14 days" },
                    { key: "jaundice", label: "jaundice" },
                    { key: "unexplained_vaginal_bleeding", label: "unexplained vaginal bleeding" },
                    { key: "abnormal_vaginal_discharge", label: "abnormal vaginal discharge" },
                    { key: "phenobarbital_rifampicin", label: "intake of phenobarbital (anti-seizure) or rifampicin (anti-TB)" },
                    { key: "is_smoker", label: "Is the client a SMOKER?" },
                    { key: "with_disability", label: "With Disability?" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                      <span className="text-slate-800 dark:text-slate-200">• {item.label}</span>
                      <div className="flex items-center gap-3 font-semibold shrink-0">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.medical_history as any)[item.key] === true}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                medical_history: { ...p.sideA.medical_history, [item.key]: e.target.checked ? true : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> Yes
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.medical_history as any)[item.key] === false}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                medical_history: { ...p.sideA.medical_history, [item.key]: e.target.checked ? false : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> No
                        </label>
                      </div>
                    </div>
                  ))}

                  {fpState.sideA.medical_history.with_disability && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-500 font-medium">If YES please specify:</span>
                      <Input type="text" value={fpState.sideA.medical_history.disability_specify} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, medical_history: { ...p.sideA.medical_history, disability_specify: e.target.value } } }))} className={lineInputClass} />
                    </div>
                  )}
                </div>
              </div>

              {/* II. OBSTETRICAL HISTORY */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">II. OBSTETRICAL HISTORY</div>
                
                <div className="space-y-2 text-[11px]">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1">
                      <span>Number of pregnancies:</span>
                      <span className="font-bold">G</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.g_pregnancies} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, g_pregnancies: sanitizeNumbers(e.target.value) } } }))} className="w-8 h-5 border-b text-center p-0" />
                      <span className="font-bold">P</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.p_pregnancies} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, p_pregnancies: sanitizeNumbers(e.target.value) } } }))} className="w-8 h-5 border-b text-center p-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Full term:</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.full_term} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, full_term: sanitizeNumbers(e.target.value) } } }))} className="w-10 h-5 border-b text-center p-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Premature:</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.premature} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, premature: sanitizeNumbers(e.target.value) } } }))} className="w-10 h-5 border-b text-center p-0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <span>Abortion:</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.abortion} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, abortion: sanitizeNumbers(e.target.value) } } }))} className="w-10 h-5 border-b text-center p-0" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Living children:</span>
                      <Input type="text" value={fpState.sideA.obstetrical_history.living_children} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, living_children: sanitizeNumbers(e.target.value) } } }))} className="w-10 h-5 border-b text-center p-0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div className="flex items-center gap-1">
                      <span>Date of last delivery:</span>
                      <Input type="date" value={fpState.sideA.obstetrical_history.date_last_delivery} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, date_last_delivery: e.target.value } } }))} className="w-28 h-5 border-b text-center p-0 text-[11px]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Type of last delivery:</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="type_last_del" checked={fpState.sideA.obstetrical_history.type_last_delivery === "vaginal"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, type_last_delivery: "vaginal" } } }))} className="h-3 w-3" /> Vaginal
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="type_last_del" checked={fpState.sideA.obstetrical_history.type_last_delivery === "cesarean"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, type_last_delivery: "cesarean" } } }))} className="h-3 w-3" /> Cesarean
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <span>Last menstrual period:</span>
                      <Input type="date" value={fpState.sideA.obstetrical_history.last_menstrual_period} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, last_menstrual_period: e.target.value } } }))} className="w-28 h-5 border-b text-center p-0 text-[11px]" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Previous menstrual period:</span>
                      <Input type="date" value={fpState.sideA.obstetrical_history.previous_menstrual_period} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, previous_menstrual_period: e.target.value } } }))} className="w-28 h-5 border-b text-center p-0 text-[11px]" />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Menstrual flow:</span>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="m_flow" checked={fpState.sideA.obstetrical_history.menstrual_flow === "scanty"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, menstrual_flow: "scanty" } } }))} className="h-3 w-3" /> Scanty (1-2 pads/day)
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="m_flow" checked={fpState.sideA.obstetrical_history.menstrual_flow === "moderate"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, menstrual_flow: "moderate" } } }))} className="h-3 w-3" /> Moderate (3-5 pads/day)
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="m_flow" checked={fpState.sideA.obstetrical_history.menstrual_flow === "heavy"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, menstrual_flow: "heavy" } } }))} className="h-3 w-3" /> Heavy (&gt;5 pads/day)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-medium">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.obstetrical_history.dysmenorrhea} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, dysmenorrhea: e.target.checked } } }))} className="h-3.5 w-3.5" /> Dysmenorrhea
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.obstetrical_history.hydatidiform_mole} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, hydatidiform_mole: e.target.checked } } }))} className="h-3.5 w-3.5" /> Hydatidiform mole
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.obstetrical_history.history_ectopic_pregnancy} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, obstetrical_history: { ...p.sideA.obstetrical_history, history_ectopic_pregnancy: e.target.checked } } }))} className="h-3.5 w-3.5" /> History of ectopic pregnancy
                    </label>
                  </div>
                </div>
              </div>

              {/* III. RISKS FOR SEXUALLY TRANSMITTED INFECTIONS */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                <div className="font-bold border-b pb-1 flex justify-between items-center text-slate-900 dark:text-slate-100">
                  <span>III. RISKS FOR SEXUALLY TRANSMITTED INFECTIONS</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  {[
                    { key: "abnormal_discharge_genital", label: "abnormal discharge from the genital area" },
                    { key: "sores_ulcers_genital", label: "sores or ulcers in the genital area" },
                    { key: "pain_burning_genital", label: "pain or burning sensation in the genital area" },
                    { key: "history_sti_treatment", label: "history of treatment for sexually transmitted infections" },
                    { key: "hiv_aids_pid", label: "HIV / AIDS / Pelvic inflammatory disease" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                      <span className="text-slate-800 dark:text-slate-200">• {item.label}</span>
                      <div className="flex items-center gap-3 font-semibold shrink-0">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.sti_risks as any)[item.key] === true}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                sti_risks: { ...p.sideA.sti_risks, [item.key]: e.target.checked ? true : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> Yes
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.sti_risks as any)[item.key] === false}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                sti_risks: { ...p.sideA.sti_risks, [item.key]: e.target.checked ? false : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> No
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: VAW, Physical Exam, Pelvic Exam, Acknowledgements */}
            <div className="space-y-3">
              
              {/* IV. RISKS FOR VIOLENCE AGAINST WOMEN (VAW) */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">IV. RISKS FOR VIOLENCE AGAINST WOMEN (VAW)</div>
                <div className="space-y-1 text-[11px]">
                  {[
                    { key: "history_domestic_violence", label: "history of domestic violence or VAW" },
                    { key: "unpleasant_relationship_partner", label: "unpleasant relationship with partner" },
                    { key: "partner_disapproves_fp", label: "partner does not approve of the visit to FP clinic" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                      <span className="text-slate-800 dark:text-slate-200">• {item.label}</span>
                      <div className="flex items-center gap-3 font-semibold shrink-0">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.vaw_risks as any)[item.key] === true}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                vaw_risks: { ...p.sideA.vaw_risks, [item.key]: e.target.checked ? true : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> Yes
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(fpState.sideA.vaw_risks as any)[item.key] === false}
                            onChange={(e) => setFpState((p) => ({
                              ...p,
                              sideA: {
                                ...p.sideA,
                                vaw_risks: { ...p.sideA.vaw_risks, [item.key]: e.target.checked ? false : null }
                              }
                            }))}
                            className="h-3 w-3"
                          /> No
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-semibold">Referred to:</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.vaw_risks.referred_dswd} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, vaw_risks: { ...p.sideA.vaw_risks, referred_dswd: e.target.checked } } }))} className="h-3 w-3" /> DSWD
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.vaw_risks.referred_wcpu} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, vaw_risks: { ...p.sideA.vaw_risks, referred_wcpu: e.target.checked } } }))} className="h-3 w-3" /> WCPU
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={fpState.sideA.vaw_risks.referred_ngos} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, vaw_risks: { ...p.sideA.vaw_risks, referred_ngos: e.target.checked } } }))} className="h-3 w-3" /> NGOs
                    </label>
                  </div>
                </div>
              </div>

              {/* V. PHYSICAL EXAMINATION */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-2">
                <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">V. PHYSICAL EXAMINATION</div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xs">
                  <div className="flex items-center gap-1">
                    <span>Weight:</span>
                    <Input type="text" value={fpState.sideA.physical_exam.weight_kg} onKeyDown={allowNumbersAndDecimal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, weight_kg: sanitizeNumbersAndDecimal(e.target.value) } } }))} className="w-12 h-5 border-b p-0 text-center" />
                    <span>kg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Height:</span>
                    <Input type="text" value={fpState.sideA.physical_exam.height_m} onKeyDown={allowNumbersAndDecimal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, height_m: sanitizeNumbersAndDecimal(e.target.value) } } }))} className="w-12 h-5 border-b p-0 text-center" />
                    <span>m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>BP:</span>
                    <Input type="text" value={fpState.sideA.physical_exam.bp} onKeyDown={allowNumbersAndSlash} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, bp: sanitizeNumbersAndSlash(e.target.value) } } }))} className="w-16 h-5 border-b p-0 text-center" />
                    <span>mmHg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Pulse:</span>
                    <Input type="text" value={fpState.sideA.physical_exam.pulse_rate} onKeyDown={allowOnlyNumbers} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, pulse_rate: sanitizeNumbers(e.target.value) } } }))} className="w-12 h-5 border-b p-0 text-center" />
                    <span>/min</span>
                  </div>
                </div>

                {/* Organ System Examination Checks (Boxes only checked when selected by user) */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="font-semibold block">SKIN:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.skin_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, skin_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.skin_pale} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, skin_pale: e.target.checked } } }))} className="h-3 w-3" /> pale</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.skin_yellowish} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, skin_yellowish: e.target.checked } } }))} className="h-3 w-3" /> yellowish</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.skin_hematoma} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, skin_hematoma: e.target.checked } } }))} className="h-3 w-3" /> hematoma</label>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block">EXTREMITIES:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.extremities_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, extremities_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.extremities_edema} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, extremities_edema: e.target.checked } } }))} className="h-3 w-3" /> edema</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.extremities_varicosities} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, extremities_varicosities: e.target.checked } } }))} className="h-3 w-3" /> varicosities</label>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block">CONJUNCTIVA:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.conjunctiva_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, conjunctiva_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.conjunctiva_pale} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, conjunctiva_pale: e.target.checked } } }))} className="h-3 w-3" /> pale</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.conjunctiva_yellowish} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, conjunctiva_yellowish: e.target.checked } } }))} className="h-3 w-3" /> yellowish</label>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block">NECK:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.neck_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, neck_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.neck_mass} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, neck_mass: e.target.checked } } }))} className="h-3 w-3" /> neck mass</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.neck_enlarged_lymph_nodes} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, neck_enlarged_lymph_nodes: e.target.checked } } }))} className="h-3 w-3" /> enlarged lymph nodes</label>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block">BREAST:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.breast_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, breast_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.breast_mass} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, breast_mass: e.target.checked } } }))} className="h-3 w-3" /> mass</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.breast_nipple_discharge} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, breast_nipple_discharge: e.target.checked } } }))} className="h-3 w-3" /> nipple discharge</label>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block">ABDOMEN:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.abdomen_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, abdomen_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.abdomen_mass} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, abdomen_mass: e.target.checked } } }))} className="h-3 w-3" /> abdominal mass</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.abdomen_varicosities} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, abdomen_varicosities: e.target.checked } } }))} className="h-3 w-3" /> varicosities</label>
                    </div>
                  </div>
                </div>

                {/* Pelvic Examination Box */}
                <div className="border-t pt-2 space-y-1 text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200">PELVIC EXAMINATION (For IUD Acceptors)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.pelvic_normal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, pelvic_normal: e.target.checked } } }))} className="h-3 w-3" /> normal</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.pelvic_mass} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, pelvic_mass: e.target.checked } } }))} className="h-3 w-3" /> mass</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.pelvic_abnormal_discharge} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, pelvic_abnormal_discharge: e.target.checked } } }))} className="h-3 w-3" /> abnormal discharge</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.pelvic_cervical_abnormalities} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, pelvic_cervical_abnormalities: e.target.checked } } }))} className="h-3 w-3" /> cervical abnormalities</label>
                  </div>

                  {fpState.sideA.physical_exam.pelvic_cervical_abnormalities && (
                    <div className="pl-4 grid grid-cols-2 gap-1 text-[10px]">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.cervical_warts} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_warts: e.target.checked } } }))} className="h-3 w-3" /> warts</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.cervical_polyp_cyst} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_polyp_cyst: e.target.checked } } }))} className="h-3 w-3" /> polyp or cyst</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.cervical_inflammation_erosion} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_inflammation_erosion: e.target.checked } } }))} className="h-3 w-3" /> inflammation or erosion</label>
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={fpState.sideA.physical_exam.cervical_bloody_discharge} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_bloody_discharge: e.target.checked } } }))} className="h-3 w-3" /> bloody discharge</label>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <span>cervical consistency:</span>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="c_consistency" checked={fpState.sideA.physical_exam.cervical_consistency === "firm"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_consistency: "firm" } } }))} className="h-3 w-3" /> firm</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="c_consistency" checked={fpState.sideA.physical_exam.cervical_consistency === "soft"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, cervical_consistency: "soft" } } }))} className="h-3 w-3" /> soft</label>
                  </div>

                  <div className="flex items-center gap-4">
                    <span>uterine position:</span>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="u_pos" checked={fpState.sideA.physical_exam.uterine_position === "mid"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, uterine_position: "mid" } } }))} className="h-3 w-3" /> mid</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="u_pos" checked={fpState.sideA.physical_exam.uterine_position === "anteflexed"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, uterine_position: "anteflexed" } } }))} className="h-3 w-3" /> anteflexed</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="u_pos" checked={fpState.sideA.physical_exam.uterine_position === "retroflexed"} onChange={() => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, uterine_position: "retroflexed" } } }))} className="h-3 w-3" /> retroflexed</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>uterine depth:</span>
                    <Input type="text" value={fpState.sideA.physical_exam.uterine_depth_cm} onKeyDown={allowNumbersAndDecimal} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, physical_exam: { ...p.sideA.physical_exam, uterine_depth_cm: sanitizeNumbersAndDecimal(e.target.value) } } }))} className="w-16 h-5 border-b p-0 text-center" />
                    <span>cm</span>
                  </div>
                </div>
              </div>

              {/* ACKNOWLEDGEMENT & CONSENT */}
              <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-2 bg-slate-50/50 dark:bg-slate-900/40 text-[11px]">
                <div className="font-bold border-b pb-1 text-slate-900 dark:text-slate-100">ACKNOWLEDGEMENT & CONSENT</div>
                
                <p className="italic">
                  This is to certify that the Physician/Nurse/Midwife of the clinic has fully explained to me the different methods available in family planning and I freely choose the
                  <Select value={fpState.sideA.chosen_method} onValueChange={v => setFpState(p => ({ ...p, sideA: { ...p.sideA, chosen_method: v } }))}>
                    <SelectTrigger className="inline-flex w-36 h-6 text-xs mx-1 border-b border-t-0 border-x-0 rounded-none">
                      <SelectValue placeholder="Select Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {FP_METHODS.map(m => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  method.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center space-y-1">
                    <Input type="text" value={`${fpState.sideA.client_given_name} ${fpState.sideA.client_last_name}`} readOnly className="border-b border-t-0 border-x-0 rounded-none text-center font-bold h-6" />
                    <span className="text-[10px] text-slate-500 block">Client Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <Input type="date" value={fpState.sideA.client_signature_date} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, client_signature_date: e.target.value } }))} className="border-b border-t-0 border-x-0 rounded-none text-center h-6" />
                    <span className="text-[10px] text-slate-500 block">Date</span>
                  </div>
                </div>

                <p className="pt-2 italic border-t">
                  I hereby consent to the inclusion of my FP Form 1 in the Family Health Registry.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="text-center space-y-1">
                    <Input type="text" value={`${fpState.sideA.client_given_name} ${fpState.sideA.client_last_name}`} readOnly className="border-b border-t-0 border-x-0 rounded-none text-center font-bold h-6" />
                    <span className="text-[10px] text-slate-500 block">Client Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <Input type="date" value={fpState.sideA.registry_consent_date} onChange={e => setFpState(p => ({ ...p, sideA: { ...p.sideA, registry_consent_date: e.target.value } }))} className="border-b border-t-0 border-x-0 rounded-none text-center h-6" />
                    <span className="text-[10px] text-slate-500 block">Date</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Form Legend Footer */}
          <div className="border-t border-slate-300 dark:border-slate-700 pt-1 text-[9px] text-slate-500 dark:text-slate-400 space-y-0.5">
            <p><strong>Implant</strong> = Progestin subdermal implant; <strong>IUD</strong> = Intrauterine device; <strong>BTL</strong> = Bilateral tubal ligation; <strong>NSV</strong> = No-scalpel vasectomy; <strong>COC</strong> = Combined oral contraceptives; <strong>POP</strong> = Progestin only pills;</p>
            <p><strong>LAM</strong> = Lactational amenorrhea method; <strong>SDM</strong> = Standard days method; <strong>BBT</strong> = Basal body temperature; <strong>BOM</strong> = Billings ovulation method; <strong>CMM</strong> = Cervical mucus method; <strong>STM</strong> = Symptothermal method</p>
          </div>

        </div>

        {/* SECTION 2: SIDE B - Service Log & Pregnancy Screening Checklist */}
        <div className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs text-xs space-y-4 font-sans print:break-before-page">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 flex justify-between items-center">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-slate-600 dark:text-slate-400">SIDE B</div>
              <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                FAMILY PLANNING CLIENT ASSESSMENT RECORD
              </h1>
            </div>
            <div className="text-right text-xs font-mono font-bold">FP FORM 1</div>
          </div>

          {/* Service & Follow-Up Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between no-print">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
                Service & Follow-Up Visit Log
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddVisitRow} className="gap-1 text-xs h-7">
                <Plus className="h-3.5 w-3.5" /> Add Visit Row
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-b text-center">
                    <th className="border p-1.5 w-28">DATE OF VISIT<br/><span className="text-[9px] font-normal">(MM/DD/YYYY)</span></th>
                    <th className="border p-1.5 min-w-[240px]">MEDICAL FINDINGS<br/><span className="text-[9px] font-normal">(Medical observation, complaints, service rendered, lab exam, treatment)</span></th>
                    <th className="border p-1.5 w-36">METHOD ACCEPTED</th>
                    <th className="border p-1.5 min-w-[180px]">NAME AND SIGNATURE OF SERVICE PROVIDER</th>
                    <th className="border p-1.5 w-28">DATE OF FOLLOW-UP VISIT<br/><span className="text-[9px] font-normal">(MM/DD/YYYY)</span></th>
                    <th className="border p-1.5 w-8 no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {fpState.sideBVisits.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="border p-1">
                        <Input type="date" value={row.visit_date} onChange={e => setFpState(p => ({ ...p, sideBVisits: p.sideBVisits.map(v => v.id === row.id ? { ...v, visit_date: e.target.value } : v) }))} className="h-7 text-xs border-0 text-center bg-transparent" />
                      </td>
                      <td className="border p-1">
                        <Textarea value={row.medical_findings} onChange={e => setFpState(p => ({ ...p, sideBVisits: p.sideBVisits.map(v => v.id === row.id ? { ...v, medical_findings: e.target.value } : v) }))} rows={2} placeholder="Observations / service rendered..." className="text-xs border-0 bg-transparent min-h-[40px] resize-y p-1" />
                      </td>
                      <td className="border p-1">
                        <Select value={row.method_accepted} onValueChange={val => setFpState(p => ({ ...p, sideBVisits: p.sideBVisits.map(v => v.id === row.id ? { ...v, method_accepted: val } : v) }))}>
                          <SelectTrigger className="h-7 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            {FP_METHODS.map(m => (
                              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border p-1">
                        <Input type="text" value={row.provider_name} onChange={e => setFpState(p => ({ ...p, sideBVisits: p.sideBVisits.map(v => v.id === row.id ? { ...v, provider_name: e.target.value } : v) }))} placeholder="Provider Name" className="h-7 text-xs border-0 bg-transparent" />
                      </td>
                      <td className="border p-1">
                        <Input type="date" value={row.followup_date} onChange={e => setFpState(p => ({ ...p, sideBVisits: p.sideBVisits.map(v => v.id === row.id ? { ...v, followup_date: e.target.value } : v) }))} className="h-7 text-xs border-0 text-center bg-transparent" />
                      </td>
                      <td className="border p-1 text-center no-print">
                        {fpState.sideBVisits.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveVisitRow(row.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* How to be Reasonably Sure a Client is Not Pregnant Checklist Box */}
          <div className="border border-slate-400 dark:border-slate-600 p-3 rounded-xs space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-tight border-b pb-1">
              How to be Reasonably Sure a Client is Not Pregnant
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { key: "q1_baby_under_6m_breastfeeding_no_menses", text: "1. Did you have a baby less than six (6) months ago, are you fully or nearly-fully breastfeeding, AND have you had no menstrual period since then?" },
                { key: "q2_abstained_since_lmp_delivery", text: "2. Have you abstained from sexual intercourse since your last menstrual period or delivery?" },
                { key: "q3_baby_in_last_4_weeks", text: "3. Have you had a baby in the last four (4) weeks?" },
                { key: "q4_lmp_within_past_7_days", text: "4. Did your last menstrual period start within the past seven (7) days?" },
                { key: "q5_miscarriage_abortion_last_7_days", text: "5. Have you had a miscarriage or abortion in the last seven (7) days?" },
                { key: "q6_using_contraceptive_consistently", text: "6. Have you been using a reliable contraceptive method consistently and correctly?" }
              ].map((q) => (
                <div key={q.key} className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 gap-4">
                  <span className="text-slate-800 dark:text-slate-200 leading-snug">{q.text}</span>
                  <div className="flex items-center gap-4 font-bold shrink-0">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(fpState.pregnancyChecklist as any)[q.key] === true}
                        onChange={(e) => setFpState((p) => ({
                          ...p,
                          pregnancyChecklist: { ...p.pregnancyChecklist, [q.key]: e.target.checked ? true : null }
                        }))}
                        className="h-3.5 w-3.5"
                      /> Yes
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(fpState.pregnancyChecklist as any)[q.key] === false}
                        onChange={(e) => setFpState((p) => ({
                          ...p,
                          pregnancyChecklist: { ...p.pregnancyChecklist, [q.key]: e.target.checked ? false : null }
                        }))}
                        className="h-3.5 w-3.5"
                      /> No
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-300 dark:border-slate-700 pt-2 text-[11px] text-slate-700 dark:text-slate-300 space-y-1 font-medium italic">
              <p>■ If the client answered <strong>YES</strong> to at least one of the questions and she is free of signs or symptoms of pregnancy, provide client with desired method.</p>
              <p>■ If the client answered <strong>NO</strong> to all of the questions, pregnancy cannot be ruled out. The client should await menses or use a pregnancy test.</p>
            </div>
          </div>

          {/* Bottom Action Bar at the end of the form */}
          <div className="no-print pt-4 border-t border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-md mt-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic">
              Please review all entries in Side A & Side B before saving or printing.
            </p>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button type="button" size="sm" onClick={handleSaveFPRecord} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground shrink-0 whitespace-nowrap font-bold px-5">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save FP Record"}
              </Button>
            </div>
          </div>

        </div>

      </div>

      {/* SAVED FAMILY PLANNING RECORDS (Positioned at the bottom of the page) */}
      <div className="no-print pt-4">
        <Card className="border-border/50 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold font-heading">
              Saved Family Planning Records ({filteredHistoryRecords.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search resident or method..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading records...</div>
            ) : filteredHistoryRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No Family Planning records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident / Client Name</TableHead>
                      <TableHead>Method Accepted</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Remarks / FP Info</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistoryRecords.map((rec) => {
                      const parsed = parseRecordDetails(rec);
                      const clientName = rec.residents?.full_name || parsed?.sideA ? `${parsed.sideA.client_given_name} ${parsed.sideA.client_last_name}` : "—";
                      return (
                        <TableRow key={rec.id}>
                          <TableCell className="font-semibold text-xs">{clientName}</TableCell>
                          <TableCell className="text-xs">{rec.method || "—"}</TableCell>
                          <TableCell className="text-xs">{rec.start_date || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[260px] truncate">{rec.remarks || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {parsed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedRecordForView(rec);
                                    setViewModalOpen(true);
                                  }}
                                  title="View Detail"
                                  className="h-7 w-7"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (parsed) {
                                    setFpState(parsed);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    toast.info(`Loaded ${clientName}'s record into form.`);
                                  } else {
                                    toast.warning("Standard legacy record loaded.");
                                  }
                                }}
                                title="Edit Record"
                                className="h-7 w-7"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirmId(rec.id)}
                                title="Delete Record"
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* VIEW RECORD DETAIL MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 max-h-[90vh] overflow-y-auto">
          {selectedRecordForView && parseRecordDetails(selectedRecordForView) && (
            (() => {
              const parsed = parseRecordDetails(selectedRecordForView)!;
              return (
                <div className="space-y-4 text-xs font-sans">
                  <DialogHeader className="border-b pb-2">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <Heart className="h-5 w-5 text-emerald-600" />
                      FP FORM 1: {parsed.sideA.client_given_name} {parsed.sideA.client_last_name}
                    </DialogTitle>
                  </DialogHeader>

                  {/* Summary Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-md border text-xs">
                    <div><strong>FP No:</strong> {parsed.sideA.fp_no || "N/A"}</div>
                    <div><strong>Age / DOB:</strong> {parsed.sideA.client_age} y/o ({parsed.sideA.client_dob || "N/A"})</div>
                    <div><strong>Civil Status:</strong> {parsed.sideA.civil_status || "N/A"}</div>
                    <div><strong>Method Chosen:</strong> {parsed.sideA.chosen_method || "N/A"}</div>
                    <div><strong>Spouse Name:</strong> {parsed.sideA.spouse_given_name} {parsed.sideA.spouse_last_name}</div>
                    <div><strong>Children:</strong> {parsed.sideA.no_living_children || "0"}</div>
                    <div><strong>Type of Client:</strong> {parsed.sideA.type_of_client || "N/A"}</div>
                    <div><strong>Income:</strong> ₱{parsed.sideA.average_monthly_income || "N/A"}</div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setFpState(parsed);
                        setViewModalOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        toast.info("Record loaded into main editor.");
                      }}
                      className="gap-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Record
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="gap-1 text-xs">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                  </div>
                </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this Family Planning record from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default FamilyPlanningForm;
