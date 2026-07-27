import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Heart, Plus, Pencil, Trash2, Printer, Save, RefreshCw, Search, Eye, 
  FileText, Activity, ShieldAlert, CheckSquare, UserCheck, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import { ensureResidentExists } from "@/lib/residentLinker";

// --- FP FORM 1 INTERFACES ---

export interface FPVisitRow {
  id: string;
  visit_date: string;
  medical_findings: string;
  method_accepted: string;
  service_provider: string;
  followup_date: string;
}

export interface FPForm1Full {
  // HEADER
  client_id: string;
  philhealth_no: string;
  nhts: "Yes" | "No" | "";

  // DEMOGRAPHICS - CLIENT
  last_name: string;
  given_name: string;
  middle_initial: string;
  dob: string;
  age: string;

  // ADDRESS
  address_no: string;
  address_street: string;
  address_barangay: string;
  address_municipality: string;
  address_province: string;
  contact_number: string;
  civil_status: string;
  religion: string;
  occupation: string;

  // DEMOGRAPHICS - SPOUSE
  spouse_last_name: string;
  spouse_given_name: string;
  spouse_middle_initial: string;
  spouse_dob: string;
  spouse_age: string;
  spouse_occupation: string;

  // FAMILY PROFILE
  no_living_children: string;
  plan_more_children: "Yes" | "No" | "";
  avg_monthly_income: string;

  // TYPE OF CLIENT
  client_type: "New Acceptor" | "Current User" | "Changing Method" | "Changing Clinic" | "Dropout/Restart" | "";
  reason_for_fp: "spacing" | "limiting" | "others" | "";
  changing_reason: "medical condition" | "side-effects" | "";
  previously_used_methods: string[]; // Implant, IUD, BTL, NSV, Injectable, COC, POP, Condom, LAM, SDM, BBT, BOM/CMM/STM

  // I. MEDICAL HISTORY (Yes / No for each)
  med_severe_headaches: boolean | null;
  med_stroke_hypertension: boolean | null;
  med_hematoma_bleeding: boolean | null;
  med_breast_cancer_mass: boolean | null;
  med_severe_chest_pain: boolean | null;
  med_cough_14days: boolean | null;
  med_jaundice: boolean | null;
  med_unexplained_vaginal_bleeding: boolean | null;
  med_abnormal_vaginal_discharge: boolean | null;
  med_anti_seizure_tb_meds: boolean | null;
  med_smoker: boolean | null;
  med_with_disability: boolean | null;
  med_disability_specify: string;

  // II. OBSTETRICAL HISTORY
  obs_g: string;
  obs_p: string;
  obs_full_term: string;
  obs_premature: string;
  obs_abortion: string;
  obs_living_children: string;
  obs_last_delivery_date: string;
  obs_type_last_delivery: "Vaginal" | "Cesarean Section" | "";
  obs_lmp: string;
  obs_pmp: string;
  obs_menstrual_flow: "Scanty (1-2 pads per day)" | "Moderate (3-5 pads per day)" | "Heavy (>5 pads per day)" | "";
  obs_dysmenorrhea: boolean;
  obs_hydatidiform_mole: boolean;
  obs_ectopic_pregnancy: boolean;

  // III. RISKS FOR STI
  sti_abnormal_discharge: boolean | null;
  sti_discharge_source: "Vagina" | "Penis" | "";
  sti_sores_ulcers: boolean | null;
  sti_pain_burning: boolean | null;
  sti_treatment_history: boolean | null;
  sti_hiv_aids_pid: boolean | null;

  // IV. RISKS FOR VIOLENCE AGAINST WOMEN (VAW)
  vaw_domestic_violence: boolean | null;
  vaw_unpleasant_relationship: boolean | null;
  vaw_partner_disapproves: boolean | null;
  vaw_referred_to: ("DSWD" | "WCPU" | "NGOs" | "Others")[];
  vaw_referred_others_specify: string;

  // V. PHYSICAL EXAMINATION
  pe_weight_kg: string;
  pe_height_m: string;
  pe_bp: string;
  pe_pulse_rate: string;

  pe_skin: ("normal" | "pale" | "yellowish" | "hematoma")[];
  pe_conjunctiva: ("normal" | "pale" | "yellowish")[];
  pe_neck: ("normal" | "neck mass" | "enlarged lymph nodes")[];
  pe_breast: ("normal" | "mass" | "nipple discharge")[];
  pe_abdomen: ("normal" | "abdominal mass" | "varicosities")[];
  pe_extremities: ("normal" | "edema" | "varicosities")[];

  // PELVIC EXAMINATION (For IUD Acceptors)
  pe_pelvic_normal: boolean;
  pe_pelvic_mass: boolean;
  pe_pelvic_abnormal_discharge: boolean;
  pe_cervical_abnormalities: ("warts" | "polyp or cyst" | "inflammation or erosion" | "bloody discharge")[];
  pe_cervical_consistency: "firm" | "soft" | "";
  pe_cervical_tenderness: boolean;
  pe_adnexal_mass_tenderness: boolean;
  pe_uterine_position: "mid" | "anteflexed" | "retroflexed" | "";
  pe_uterine_depth_cm: string;

  // ACKNOWLEDGEMENT & CONSENT
  ack_method_chosen: string;
  ack_client_signature: string;
  ack_date: string;
  consent_client_signature: string;
  consent_date: string;

  // SIDE B: PREGNANCY RISK ASSESSMENT
  preg_qn1_breastfeeding_6m: boolean | null;
  preg_qn2_abstained: boolean | null;
  preg_qn3_baby_last_4w: boolean | null;
  preg_qn4_lmp_7d: boolean | null;
  preg_qn5_abortion_7d: boolean | null;
  preg_qn6_reliable_contraceptive: boolean | null;

  // SIDE B: VISIT HISTORY ROWS
  visit_rows: FPVisitRow[];
}

const initialFPForm: FPForm1Full = {
  client_id: "",
  philhealth_no: "",
  nhts: "",
  last_name: "",
  given_name: "",
  middle_initial: "",
  dob: "",
  age: "",
  address_no: "",
  address_street: "",
  address_barangay: "Subukin",
  address_municipality: "San Juan",
  address_province: "Batangas",
  contact_number: "",
  civil_status: "Married",
  religion: "Roman Catholic",
  occupation: "",
  spouse_last_name: "",
  spouse_given_name: "",
  spouse_middle_initial: "",
  spouse_dob: "",
  spouse_age: "",
  spouse_occupation: "",
  no_living_children: "",
  plan_more_children: "No",
  avg_monthly_income: "",
  client_type: "New Acceptor",
  reason_for_fp: "spacing",
  changing_reason: "",
  previously_used_methods: [],

  med_severe_headaches: false,
  med_stroke_hypertension: false,
  med_hematoma_bleeding: false,
  med_breast_cancer_mass: false,
  med_severe_chest_pain: false,
  med_cough_14days: false,
  med_jaundice: false,
  med_unexplained_vaginal_bleeding: false,
  med_abnormal_vaginal_discharge: false,
  med_anti_seizure_tb_meds: false,
  med_smoker: false,
  med_with_disability: false,
  med_disability_specify: "",

  obs_g: "",
  obs_p: "",
  obs_full_term: "",
  obs_premature: "",
  obs_abortion: "",
  obs_living_children: "",
  obs_last_delivery_date: "",
  obs_type_last_delivery: "Vaginal",
  obs_lmp: "",
  obs_pmp: "",
  obs_menstrual_flow: "Moderate (3-5 pads per day)",
  obs_dysmenorrhea: false,
  obs_hydatidiform_mole: false,
  obs_ectopic_pregnancy: false,

  sti_abnormal_discharge: false,
  sti_discharge_source: "",
  sti_sores_ulcers: false,
  sti_pain_burning: false,
  sti_treatment_history: false,
  sti_hiv_aids_pid: false,

  vaw_domestic_violence: false,
  vaw_unpleasant_relationship: false,
  vaw_partner_disapproves: false,
  vaw_referred_to: [],
  vaw_referred_others_specify: "",

  pe_weight_kg: "",
  pe_height_m: "",
  pe_bp: "",
  pe_pulse_rate: "",
  pe_skin: ["normal"],
  pe_conjunctiva: ["normal"],
  pe_neck: ["normal"],
  pe_breast: ["normal"],
  pe_abdomen: ["normal"],
  pe_extremities: ["normal"],

  pe_pelvic_normal: true,
  pe_pelvic_mass: false,
  pe_pelvic_abnormal_discharge: false,
  pe_cervical_abnormalities: [],
  pe_cervical_consistency: "firm",
  pe_cervical_tenderness: false,
  pe_adnexal_mass_tenderness: false,
  pe_uterine_position: "mid",
  pe_uterine_depth_cm: "",

  ack_method_chosen: "",
  ack_client_signature: "",
  ack_date: new Date().toISOString().split("T")[0],
  consent_client_signature: "",
  consent_date: new Date().toISOString().split("T")[0],

  preg_qn1_breastfeeding_6m: false,
  preg_qn2_abstained: false,
  preg_qn3_baby_last_4w: false,
  preg_qn4_lmp_7d: false,
  preg_qn5_abortion_7d: false,
  preg_qn6_reliable_contraceptive: false,

  visit_rows: [
    {
      id: "v-1",
      visit_date: new Date().toISOString().split("T")[0],
      medical_findings: "",
      method_accepted: "",
      service_provider: "",
      followup_date: "",
    }
  ],
};

const PREVIOUS_METHODS_LIST = [
  "Implant", "IUD", "BTL", "NSV", "Injectable", "COC", "POP", "Condom", "LAM", "SDM", "BBT", "BOM/CMM/STM"
];

const FamilyPlanningForm = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<string>("side-a");
  const [saving, setSaving] = useState<boolean>(false);
  const [records, setRecords] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");

  // Main Form State
  const [form, setForm] = useState<FPForm1Full>(initialFPForm);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  // Modal view record
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const lineInputClass = "border-b border-t-0 border-x-0 border-slate-400 dark:border-slate-600 bg-transparent rounded-none px-1 py-0 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-6 text-xs";

  const fetchSavedData = async () => {
    try {
      const [{ data: recs }, { data: res }] = await Promise.all([
        supabase.from("family_planning" as any).select("*, residents(full_name, age, sitio)").order("created_at", { ascending: false }),
        supabase.from("residents" as any).select("id, full_name, age, birthday, sitio, gender, family_number, father_name, mother_name").order("full_name"),
      ]);
      setRecords(recs || []);
      setResidents(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSavedData();
  }, []);

  const handleResidentSelect = (resId: string) => {
    setSelectedResidentId(resId);
    if (!resId) return;
    const res = residents.find(r => r.id === resId);
    if (res) {
      const nameParts = res.full_name.trim().split(" ");
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : res.full_name;
      const givenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : res.full_name;

      setForm(prev => ({
        ...prev,
        last_name: lastName,
        given_name: givenName,
        age: res.age ? String(res.age) : prev.age,
        dob: res.birthday ? res.birthday : prev.dob,
        address_barangay: res.sitio ? `Subukin (${res.sitio})` : "Subukin",
        ack_client_signature: res.full_name,
        consent_client_signature: res.full_name,
      }));
      toast.info(`Auto-filled details for resident: ${res.full_name}`);
    }
  };

  const handleResetForm = () => {
    setForm(initialFPForm);
    setSelectedResidentId("");
    setEditRecordId(null);
    toast.info("Form reset to blank state.");
  };

  const handleAddVisitRow = () => {
    setForm(prev => ({
      ...prev,
      visit_rows: [
        ...prev.visit_rows,
        {
          id: `v-${Date.now()}`,
          visit_date: new Date().toISOString().split("T")[0],
          medical_findings: "",
          method_accepted: prev.ack_method_chosen || "",
          service_provider: "",
          followup_date: "",
        }
      ]
    }));
  };

  const handleRemoveVisitRow = (id: string) => {
    setForm(prev => ({
      ...prev,
      visit_rows: prev.visit_rows.filter(r => r.id !== id)
    }));
  };

  const handleSaveForm = async () => {
    const fullName = `${form.given_name} ${form.middle_initial} ${form.last_name}`.trim();
    if (!fullName) {
      toast.error("Please enter the client's name.");
      return;
    }

    setSaving(true);
    try {
      // 1. Link Resident
      const linkedResId = await ensureResidentExists({
        fullName: fullName,
        sitio: form.address_barangay,
        age: form.age,
        birthday: form.dob,
      });

      // 2. Prepare payload
      const chosenMethod = form.ack_method_chosen || form.previously_used_methods.join(", ") || form.client_type || "Family Planning";
      const summaryRemarks = `[FP FORM 1] Client: ${fullName}, Age: ${form.age || "N/A"}, Type: ${form.client_type || "N/A"}, Chosen Method: ${chosenMethod}`;

      const payload = {
        resident_id: linkedResId || (selectedResidentId || null),
        method: chosenMethod,
        start_date: form.ack_date || new Date().toISOString().split("T")[0],
        remarks: `${summaryRemarks}\n\nDATA_JSON:${JSON.stringify(form)}`,
      };

      if (editRecordId) {
        const { error } = await supabase.from("family_planning" as any).update(payload as any).eq("id", editRecordId);
        if (error) throw error;
        toast.success("FP FORM 1 record updated successfully!");
        logActivity("update_family_planning", { entity_type: "family_planning", entity_id: editRecordId, description: `Updated FP Form 1 for ${fullName}` });
      } else {
        const { error } = await supabase.from("family_planning" as any).insert(payload as any);
        if (error) throw error;
        toast.success("FP FORM 1 record saved successfully!");
        logActivity("submit_family_planning", { entity_type: "family_planning", description: `Saved new FP Form 1 for ${fullName}` });
      }

      handleResetForm();
      fetchSavedData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRecord = (rec: any) => {
    try {
      let parsedForm: FPForm1Full | null = null;
      if (rec.remarks && rec.remarks.includes("DATA_JSON:")) {
        const jsonPart = rec.remarks.split("DATA_JSON:")[1];
        parsedForm = JSON.parse(jsonPart);
      }

      if (parsedForm) {
        setForm(parsedForm);
      } else {
        setForm({
          ...initialFPForm,
          ack_method_chosen: rec.method || "",
          ack_date: rec.start_date || "",
        });
      }

      setEditRecordId(rec.id);
      setSelectedResidentId(rec.resident_id || "");
      setActiveTab("side-a");
      toast.info("Record loaded into form for editing.");
    } catch (e) {
      console.error(e);
      toast.error("Could not parse full form data.");
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("family_planning" as any).delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Record deleted successfully!");
      logActivity("delete_family_planning", { entity_type: "family_planning", entity_id: deleteId, description: "Deleted FP Form 1 record" });
      setDeleteId(null);
      fetchSavedData();
    } catch (e: any) {
      console.error(e);
      toast.error("Error deleting record.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parseRecordData = (rec: any): FPForm1Full => {
    if (rec && rec.remarks && rec.remarks.includes("DATA_JSON:")) {
      try {
        return JSON.parse(rec.remarks.split("DATA_JSON:")[1]);
      } catch (e) {}
    }
    return {
      ...initialFPForm,
      last_name: rec?.residents?.full_name || "N/A",
      ack_method_chosen: rec?.method || "",
      ack_date: rec?.start_date || "",
    };
  };

  return (
    <div className="w-full space-y-6">
      
      {/* PRINT CSS STYLES FOR EXACT 1:1 PAPER FORM REPLICA */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #fp-form1-print-area, #fp-form1-print-area * {
            visibility: visible;
          }
          #fp-form1-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          select {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            background: transparent !important;
          }
          @page {
            size: legal portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border shadow-xs no-print">
        <div>
          <h1 className="text-xl font-bold font-heading flex items-center gap-2 text-foreground">
            <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Family Planning Module (FP FORM 1)
          </h1>
          <p className="text-xs text-muted-foreground">
            Official Family Planning Client Assessment Record (Side A & Side B Replica)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
            <Printer className="h-4 w-4 text-blue-600" /> Print Form
          </Button>
          <Button type="button" size="sm" onClick={handleSaveForm} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save FP Record"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleResetForm} className="gap-1 text-xs text-destructive hover:bg-destructive/10">
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* MAIN CARD CONTAINER */}
      <Card className="border-border/50 shadow-sm w-full">
        <CardContent className="p-4 sm:p-6 space-y-6">

          {/* AUTO-FILL RESIDENT SELECTOR */}
          <div className="bg-muted/40 p-3 rounded-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Auto-fill from Resident Database:</span>
            </div>
            <div className="w-full md:w-80">
              <Select value={selectedResidentId} onValueChange={handleResidentSelect}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select Resident to populate demographics..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.full_name} {r.age ? `(${r.age} yrs)` : ""} - {r.sitio || "Subukin"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md no-print mb-4">
              <TabsTrigger value="side-a" className="text-xs font-bold gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Side A (Assessment)
              </TabsTrigger>
              <TabsTrigger value="side-b" className="text-xs font-bold gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Side B (Visits & Assessment)
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs font-bold gap-1.5">
                <History className="h-3.5 w-3.5" /> Saved Records ({records.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SIDE A - CLIENT ASSESSMENT RECORD */}
            <TabsContent value="side-a" className="space-y-4">
              <div id="fp-form1-print-area" className="w-full max-w-full space-y-4 bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-md border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-sans">
                
                {/* OFFICIAL HEADER BANNER */}
                <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 mb-3">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span>SIDE A</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">FAMILY PLANNING CLIENT ASSESSMENT RECORD</span>
                    <span>FP 242 FP FORM 1</span>
                  </div>
                  <p className="text-[10px] italic text-slate-600 dark:text-slate-400 mt-1">
                    Instructions for Physicians, Nurses and Midwives: Make sure that the client is not pregnant by using the questions listed in SIDE B. Completely fill out or check the required information. Refer accordingly for any abnormal history/findings for further medical evaluation.
                  </p>
                </div>

                {/* TOP HEADER IDS & NHTS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-slate-400 dark:border-slate-600 p-2 rounded-xs bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">CLIENT ID:</span>
                    <Input type="text" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} className={lineInputClass} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">PHILHEALTH NO.:</span>
                    <Input type="text" value={form.philhealth_no} onChange={e => setForm(p => ({ ...p, philhealth_no: e.target.value }))} className={lineInputClass} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">NHTS?</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="nhts" checked={form.nhts === "Yes"} onChange={() => setForm(p => ({ ...p, nhts: "Yes" }))} /> Yes
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="nhts" checked={form.nhts === "No"} onChange={() => setForm(p => ({ ...p, nhts: "No" }))} /> No
                    </label>
                  </div>
                </div>

                {/* DEMOGRAPHICS BLOCK */}
                <div className="border border-slate-400 dark:border-slate-600 p-2.5 space-y-2.5 rounded-xs">
                  {/* CLIENT NAME */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <span className="sm:col-span-2 font-bold text-[10px] uppercase">NAME OF CLIENT:</span>
                    <div className="sm:col-span-3">
                      <Input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={lineInputClass} placeholder="Last Name" />
                    </div>
                    <div className="sm:col-span-3">
                      <Input type="text" value={form.given_name} onChange={e => setForm(p => ({ ...p, given_name: e.target.value }))} className={lineInputClass} placeholder="Given Name" />
                    </div>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.middle_initial} onChange={e => setForm(p => ({ ...p, middle_initial: e.target.value }))} className={lineInputClass} placeholder="MI" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className={lineInputClass} />
                    </div>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} className={lineInputClass} placeholder="Age" />
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <span className="sm:col-span-2 font-bold text-[10px] uppercase">ADDRESS:</span>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.address_no} onChange={e => setForm(p => ({ ...p, address_no: e.target.value }))} className={lineInputClass} placeholder="No." />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="text" value={form.address_street} onChange={e => setForm(p => ({ ...p, address_street: e.target.value }))} className={lineInputClass} placeholder="Street" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="text" value={form.address_barangay} onChange={e => setForm(p => ({ ...p, address_barangay: e.target.value }))} className={lineInputClass} placeholder="Barangay" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="text" value={form.address_municipality} onChange={e => setForm(p => ({ ...p, address_municipality: e.target.value }))} className={lineInputClass} placeholder="Municipality" />
                    </div>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.address_province} onChange={e => setForm(p => ({ ...p, address_province: e.target.value }))} className={lineInputClass} placeholder="Province" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="text" value={form.contact_number} onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))} className={lineInputClass} placeholder="Contact No." />
                    </div>
                  </div>

                  {/* CIVIL STATUS / RELIGION / OCCUPATION */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">CIVIL STATUS:</span>
                      <Input type="text" value={form.civil_status} onChange={e => setForm(p => ({ ...p, civil_status: e.target.value }))} className={lineInputClass} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">RELIGION:</span>
                      <Input type="text" value={form.religion} onChange={e => setForm(p => ({ ...p, religion: e.target.value }))} className={lineInputClass} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">OCCUPATION:</span>
                      <Input type="text" value={form.occupation} onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))} className={lineInputClass} />
                    </div>
                  </div>

                  {/* SPOUSE NAME */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="sm:col-span-2 font-bold text-[10px] uppercase">NAME OF SPOUSE:</span>
                    <div className="sm:col-span-3">
                      <Input type="text" value={form.spouse_last_name} onChange={e => setForm(p => ({ ...p, spouse_last_name: e.target.value }))} className={lineInputClass} placeholder="Last Name" />
                    </div>
                    <div className="sm:col-span-3">
                      <Input type="text" value={form.spouse_given_name} onChange={e => setForm(p => ({ ...p, spouse_given_name: e.target.value }))} className={lineInputClass} placeholder="Given Name" />
                    </div>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.spouse_middle_initial} onChange={e => setForm(p => ({ ...p, spouse_middle_initial: e.target.value }))} className={lineInputClass} placeholder="MI" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input type="date" value={form.spouse_dob} onChange={e => setForm(p => ({ ...p, spouse_dob: e.target.value }))} className={lineInputClass} />
                    </div>
                    <div className="sm:col-span-1">
                      <Input type="text" value={form.spouse_age} onChange={e => setForm(p => ({ ...p, spouse_age: e.target.value }))} className={lineInputClass} placeholder="Age" />
                    </div>
                  </div>

                  {/* LIVING CHILDREN / MORE CHILDREN / INCOME */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">NO. OF LIVING CHILDREN:</span>
                      <Input type="text" value={form.no_living_children} onChange={e => setForm(p => ({ ...p, no_living_children: e.target.value }))} className={lineInputClass} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px]">PLAN MORE CHILDREN?</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="plan_more" checked={form.plan_more_children === "Yes"} onChange={() => setForm(p => ({ ...p, plan_more_children: "Yes" }))} /> Yes
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="plan_more" checked={form.plan_more_children === "No"} onChange={() => setForm(p => ({ ...p, plan_more_children: "No" }))} /> No
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">AVG MONTHLY INCOME:</span>
                      <Input type="text" value={form.avg_monthly_income} onChange={e => setForm(p => ({ ...p, avg_monthly_income: e.target.value }))} className={lineInputClass} placeholder="₱" />
                    </div>
                  </div>
                </div>

                {/* TYPE OF CLIENT & PREVIOUS METHODS BLOCK */}
                <div className="border border-slate-400 dark:border-slate-600 p-2.5 rounded-xs grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                  {/* LEFT: CLIENT TYPE */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-[10px] uppercase block border-b pb-0.5 border-slate-300 dark:border-slate-700">Type of Client</span>
                    
                    <div className="space-y-1 text-[11px]">
                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="client_type" checked={form.client_type === "New Acceptor"} onChange={() => setForm(p => ({ ...p, client_type: "New Acceptor" }))} />
                        New Acceptor
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="client_type" checked={form.client_type === "Current User"} onChange={() => setForm(p => ({ ...p, client_type: "Current User" }))} />
                        Current User
                      </label>
                      
                      <div className="pl-4 flex items-center gap-3 text-[10px]">
                        <span className="font-medium">Reason for FP:</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="reason_fp" checked={form.reason_for_fp === "spacing"} onChange={() => setForm(p => ({ ...p, reason_for_fp: "spacing" }))} /> spacing
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="reason_fp" checked={form.reason_for_fp === "limiting"} onChange={() => setForm(p => ({ ...p, reason_for_fp: "limiting" }))} /> limiting
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="reason_fp" checked={form.reason_for_fp === "others"} onChange={() => setForm(p => ({ ...p, reason_for_fp: "others" }))} /> others
                        </label>
                      </div>

                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer pt-1">
                        <input type="radio" name="client_type" checked={form.client_type === "Changing Method"} onChange={() => setForm(p => ({ ...p, client_type: "Changing Method" }))} />
                        Changing Method
                      </label>
                      <div className="pl-4 flex items-center gap-3 text-[10px]">
                        <span className="font-medium">Reason:</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="changing_reason" checked={form.changing_reason === "medical condition"} onChange={() => setForm(p => ({ ...p, changing_reason: "medical condition" }))} /> medical condition
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="changing_reason" checked={form.changing_reason === "side-effects"} onChange={() => setForm(p => ({ ...p, changing_reason: "side-effects" }))} /> side-effects
                        </label>
                      </div>

                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="client_type" checked={form.client_type === "Changing Clinic"} onChange={() => setForm(p => ({ ...p, client_type: "Changing Clinic" }))} />
                        Changing Clinic
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                        <input type="radio" name="client_type" checked={form.client_type === "Dropout/Restart"} onChange={() => setForm(p => ({ ...p, client_type: "Dropout/Restart" }))} />
                        Dropout/Restart
                      </label>
                    </div>
                  </div>

                  {/* RIGHT: PREVIOUSLY USED METHOD */}
                  <div className="space-y-1.5 border-l md:border-slate-300 md:dark:border-slate-700 md:pl-4">
                    <span className="font-bold text-[10px] uppercase block border-b pb-0.5 border-slate-300 dark:border-slate-700">Previously Used Method (for Current User)</span>
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] pt-1">
                      {PREVIOUS_METHODS_LIST.map((m) => {
                        const checked = form.previously_used_methods.includes(m);
                        return (
                          <label key={m} className="flex items-center gap-1 cursor-pointer hover:text-primary">
                            <input 
                              type="checkbox" 
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setForm(p => ({ ...p, previously_used_methods: [...p.previously_used_methods, m] }));
                                } else {
                                  setForm(p => ({ ...p, previously_used_methods: p.previously_used_methods.filter(x => x !== m) }));
                                }
                              }} 
                            />
                            <span>{m}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2-COLUMN SECTION: I & II & III vs IV & V */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  
                  {/* LEFT COLUMN: SECTIONS I, II, III */}
                  <div className="space-y-3">
                    
                    {/* SECTION I: MEDICAL HISTORY */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                      <div className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs flex justify-between items-center">
                        <span>I. MEDICAL HISTORY</span>
                        <span className="text-[9px] font-normal">Does the client have any of the following?</span>
                      </div>

                      <div className="space-y-1 text-[10px]">
                        {[
                          { key: "med_severe_headaches", label: "severe headaches / migraine" },
                          { key: "med_stroke_hypertension", label: "history of stroke / heart attack / hypertension" },
                          { key: "med_hematoma_bleeding", label: "non-traumatic hematoma / frequent bruising or gum bleeding" },
                          { key: "med_breast_cancer_mass", label: "current or history of breast cancer / breast mass" },
                          { key: "med_severe_chest_pain", label: "severe chest pain" },
                          { key: "med_cough_14days", label: "cough for more than 14 days" },
                          { key: "med_jaundice", label: "jaundice" },
                          { key: "med_unexplained_vaginal_bleeding", label: "unexplained vaginal bleeding" },
                          { key: "med_abnormal_vaginal_discharge", label: "abnormal vaginal discharge" },
                          { key: "med_anti_seizure_tb_meds", label: "intake of phenobarbital (anti-seizure) or rifampicin (anti-TB)" },
                          { key: "med_smoker", label: "Is the client a SMOKER?" },
                          { key: "med_with_disability", label: "With Disability?" },
                        ].map((item) => {
                          const val = (form as any)[item.key];
                          return (
                            <div key={item.key} className="flex items-center justify-between hover:bg-muted/30 p-0.5 rounded-xs">
                              <span>• {item.label}</span>
                              <div className="flex items-center gap-2 font-bold shrink-0">
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                  <input type="radio" name={item.key} checked={val === true} onChange={() => setForm(p => ({ ...p, [item.key]: true }))} /> Yes
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                  <input type="radio" name={item.key} checked={val === false} onChange={() => setForm(p => ({ ...p, [item.key]: false }))} /> No
                                </label>
                              </div>
                            </div>
                          );
                        })}

                        {form.med_with_disability && (
                          <div className="pt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-[9px]">(if YES please specify):</span>
                            <Input type="text" value={form.med_disability_specify} onChange={e => setForm(p => ({ ...p, med_disability_specify: e.target.value }))} className={lineInputClass} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION II: OBSTETRICAL HISTORY */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                      <div className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs">
                        II. OBSTETRICAL HISTORY
                      </div>

                      <div className="space-y-2 text-[10px]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                          <div>
                            <span className="font-bold">Number of pregnancies:</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>G:</span>
                            <Input type="text" value={form.obs_g} onChange={e => setForm(p => ({ ...p, obs_g: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>P:</span>
                            <Input type="text" value={form.obs_p} onChange={e => setForm(p => ({ ...p, obs_p: e.target.value }))} className={lineInputClass} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="flex items-center gap-1">
                            <span>Full term:</span>
                            <Input type="text" value={form.obs_full_term} onChange={e => setForm(p => ({ ...p, obs_full_term: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Premature:</span>
                            <Input type="text" value={form.obs_premature} onChange={e => setForm(p => ({ ...p, obs_premature: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Abortion:</span>
                            <Input type="text" value={form.obs_abortion} onChange={e => setForm(p => ({ ...p, obs_abortion: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Living children:</span>
                            <Input type="text" value={form.obs_living_children} onChange={e => setForm(p => ({ ...p, obs_living_children: e.target.value }))} className={lineInputClass} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="font-bold">Date of last delivery:</span>
                            <Input type="date" value={form.obs_last_delivery_date} onChange={e => setForm(p => ({ ...p, obs_last_delivery_date: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-2 font-bold">
                            <span>Type of delivery:</span>
                            <label className="flex items-center gap-0.5 cursor-pointer">
                              <input type="radio" name="type_del" checked={form.obs_type_last_delivery === "Vaginal"} onChange={() => setForm(p => ({ ...p, obs_type_last_delivery: "Vaginal" }))} /> Vaginal
                            </label>
                            <label className="flex items-center gap-0.5 cursor-pointer">
                              <input type="radio" name="type_del" checked={form.obs_type_last_delivery === "Cesarean Section"} onChange={() => setForm(p => ({ ...p, obs_type_last_delivery: "Cesarean Section" }))} /> Cesarean Section
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="font-bold">Last menstrual period (LMP):</span>
                            <Input type="date" value={form.obs_lmp} onChange={e => setForm(p => ({ ...p, obs_lmp: e.target.value }))} className={lineInputClass} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">Previous menstrual period (PMP):</span>
                            <Input type="date" value={form.obs_pmp} onChange={e => setForm(p => ({ ...p, obs_pmp: e.target.value }))} className={lineInputClass} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold block">Menstrual flow:</span>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="flow" checked={form.obs_menstrual_flow === "Scanty (1-2 pads per day)"} onChange={() => setForm(p => ({ ...p, obs_menstrual_flow: "Scanty (1-2 pads per day)" }))} /> Scanty (1-2 pads/day)
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="flow" checked={form.obs_menstrual_flow === "Moderate (3-5 pads per day)"} onChange={() => setForm(p => ({ ...p, obs_menstrual_flow: "Moderate (3-5 pads per day)" }))} /> Moderate (3-5 pads/day)
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="flow" checked={form.obs_menstrual_flow === "Heavy (>5 pads per day)"} onChange={() => setForm(p => ({ ...p, obs_menstrual_flow: "Heavy (>5 pads per day)" }))} /> Heavy (&gt;5 pads/day)
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                          <label className="flex items-center gap-1 cursor-pointer font-medium">
                            <input type="checkbox" checked={form.obs_dysmenorrhea} onChange={e => setForm(p => ({ ...p, obs_dysmenorrhea: e.target.checked }))} /> Dysmenorrhea
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer font-medium">
                            <input type="checkbox" checked={form.obs_hydatidiform_mole} onChange={e => setForm(p => ({ ...p, obs_hydatidiform_mole: e.target.checked }))} /> Hydatidiform mole (last 12 mos)
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer font-medium">
                            <input type="checkbox" checked={form.obs_ectopic_pregnancy} onChange={e => setForm(p => ({ ...p, obs_ectopic_pregnancy: e.target.checked }))} /> History of ectopic pregnancy
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* SECTION III: RISKS FOR STI */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                      <div className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs flex justify-between items-center">
                        <span>III. RISKS FOR SEXUALLY TRANSMITTED INFECTIONS</span>
                        <span className="text-[9px] font-normal">Does client or partner have any of the following?</span>
                      </div>

                      <div className="space-y-1 text-[10px]">
                        {[
                          { key: "sti_abnormal_discharge", label: "abnormal discharge from the genital area" },
                          { key: "sti_sores_ulcers", label: "sores or ulcers in the genital area" },
                          { key: "sti_pain_burning", label: "pain or burning sensation in the genital area" },
                          { key: "sti_treatment_history", label: "history of treatment for sexually transmitted infections" },
                          { key: "sti_hiv_aids_pid", label: "HIV / AIDS / Pelvic inflammatory disease" },
                        ].map((item) => {
                          const val = (form as any)[item.key];
                          return (
                            <div key={item.key} className="space-y-1 hover:bg-muted/30 p-0.5 rounded-xs">
                              <div className="flex items-center justify-between">
                                <span>• {item.label}</span>
                                <div className="flex items-center gap-2 font-bold shrink-0">
                                  <label className="flex items-center gap-0.5 cursor-pointer">
                                    <input type="radio" name={item.key} checked={val === true} onChange={() => setForm(p => ({ ...p, [item.key]: true }))} /> Yes
                                  </label>
                                  <label className="flex items-center gap-0.5 cursor-pointer">
                                    <input type="radio" name={item.key} checked={val === false} onChange={() => setForm(p => ({ ...p, [item.key]: false }))} /> No
                                  </label>
                                </div>
                              </div>

                              {item.key === "sti_abnormal_discharge" && val === true && (
                                <div className="pl-4 flex items-center gap-3 text-[9px] font-semibold text-primary">
                                  <span>If YES, indicate if from:</span>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="discharge_src" checked={form.sti_discharge_source === "Vagina"} onChange={() => setForm(p => ({ ...p, sti_discharge_source: "Vagina" }))} /> Vagina
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="discharge_src" checked={form.sti_discharge_source === "Penis"} onChange={() => setForm(p => ({ ...p, sti_discharge_source: "Penis" }))} /> Penis
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: SECTIONS IV & V & ACKNOWLEDGEMENT */}
                  <div className="space-y-3">
                    
                    {/* SECTION IV: RISKS FOR VAW */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-1.5">
                      <div className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs">
                        IV. RISKS FOR VIOLENCE AGAINST WOMEN (VAW)
                      </div>

                      <div className="space-y-1 text-[10px]">
                        {[
                          { key: "vaw_domestic_violence", label: "history of domestic violence or VAW" },
                          { key: "vaw_unpleasant_relationship", label: "unpleasant relationship with partner" },
                          { key: "vaw_partner_disapproves", label: "partner does not approve of the visit to FP clinic" },
                        ].map((item) => {
                          const val = (form as any)[item.key];
                          return (
                            <div key={item.key} className="flex items-center justify-between hover:bg-muted/30 p-0.5 rounded-xs">
                              <span>• {item.label}</span>
                              <div className="flex items-center gap-2 font-bold shrink-0">
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                  <input type="radio" name={item.key} checked={val === true} onChange={() => setForm(p => ({ ...p, [item.key]: true }))} /> Yes
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                  <input type="radio" name={item.key} checked={val === false} onChange={() => setForm(p => ({ ...p, [item.key]: false }))} /> No
                                </label>
                              </div>
                            </div>
                          );
                        })}

                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[9px] font-semibold border-t border-slate-200 dark:border-slate-800">
                          <span>Referred to:</span>
                          {(["DSWD", "WCPU", "NGOs", "Others"] as const).map((ref) => {
                            const checked = form.vaw_referred_to.includes(ref);
                            return (
                              <label key={ref} className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={checked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setForm(p => ({ ...p, vaw_referred_to: [...p.vaw_referred_to, ref] }));
                                    } else {
                                      setForm(p => ({ ...p, vaw_referred_to: p.vaw_referred_to.filter(x => x !== ref) }));
                                    }
                                  }} 
                                />
                                {ref}
                              </label>
                            );
                          })}
                        </div>

                        {form.vaw_referred_to.includes("Others") && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px]">Specify:</span>
                            <Input type="text" value={form.vaw_referred_others_specify} onChange={e => setForm(p => ({ ...p, vaw_referred_others_specify: e.target.value }))} className={lineInputClass} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION V: PHYSICAL EXAMINATION */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2 rounded-xs space-y-2">
                      <div className="font-bold text-[10px] uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs">
                        V. PHYSICAL EXAMINATION
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Weight:</span>
                          <Input type="text" value={form.pe_weight_kg} onChange={e => setForm(p => ({ ...p, pe_weight_kg: e.target.value }))} className={lineInputClass} placeholder="kg" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Height:</span>
                          <Input type="text" value={form.pe_height_m} onChange={e => setForm(p => ({ ...p, pe_height_m: e.target.value }))} className={lineInputClass} placeholder="m" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold">BP:</span>
                          <Input type="text" value={form.pe_bp} onChange={e => setForm(p => ({ ...p, pe_bp: e.target.value }))} className={lineInputClass} placeholder="mmHg" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Pulse Rate:</span>
                          <Input type="text" value={form.pe_pulse_rate} onChange={e => setForm(p => ({ ...p, pe_pulse_rate: e.target.value }))} className={lineInputClass} placeholder="/min" />
                        </div>
                      </div>

                      {/* SYSTEM CHECKLISTS */}
                      <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">SKIN:</span>
                          {(["normal", "pale", "yellowish", "hematoma"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_skin.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_skin: e.target.checked ? [...p.pe_skin, opt] : p.pe_skin.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>

                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">CONJUNCTIVA:</span>
                          {(["normal", "pale", "yellowish"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_conjunctiva.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_conjunctiva: e.target.checked ? [...p.pe_conjunctiva, opt] : p.pe_conjunctiva.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>

                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">NECK:</span>
                          {(["normal", "neck mass", "enlarged lymph nodes"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_neck.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_neck: e.target.checked ? [...p.pe_neck, opt] : p.pe_neck.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>

                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">BREAST:</span>
                          {(["normal", "mass", "nipple discharge"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_breast.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_breast: e.target.checked ? [...p.pe_breast, opt] : p.pe_breast.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>

                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">ABDOMEN:</span>
                          {(["normal", "abdominal mass", "varicosities"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_abdomen.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_abdomen: e.target.checked ? [...p.pe_abdomen, opt] : p.pe_abdomen.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>

                        <div>
                          <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">EXTREMITIES:</span>
                          {(["normal", "edema", "varicosities"] as const).map(opt => (
                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={form.pe_extremities.includes(opt)} onChange={e => {
                                setForm(p => ({ ...p, pe_extremities: e.target.checked ? [...p.pe_extremities, opt] : p.pe_extremities.filter(x => x !== opt) }));
                              }} /> {opt}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* PELVIC EXAMINATION */}
                      <div className="pt-2 border-t border-slate-300 dark:border-slate-700 space-y-1.5">
                        <span className="font-bold text-[10px] uppercase block text-primary">PELVIC EXAMINATION (For IUD Acceptors)</span>
                        <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                          <label className="flex items-center gap-1 cursor-pointer font-semibold">
                            <input type="checkbox" checked={form.pe_pelvic_normal} onChange={e => setForm(p => ({ ...p, pe_pelvic_normal: e.target.checked }))} /> normal
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer font-semibold">
                            <input type="checkbox" checked={form.pe_pelvic_mass} onChange={e => setForm(p => ({ ...p, pe_pelvic_mass: e.target.checked }))} /> mass
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer font-semibold">
                            <input type="checkbox" checked={form.pe_pelvic_abnormal_discharge} onChange={e => setForm(p => ({ ...p, pe_pelvic_abnormal_discharge: e.target.checked }))} /> abnormal discharge
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer font-semibold">
                            <input type="checkbox" checked={form.pe_cervical_tenderness} onChange={e => setForm(p => ({ ...p, pe_cervical_tenderness: e.target.checked }))} /> cervical tenderness
                          </label>
                        </div>

                        <div className="text-[9px] space-y-1 pt-1">
                          <span className="font-bold">Cervical Abnormalities:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {(["warts", "polyp or cyst", "inflammation or erosion", "bloody discharge"] as const).map(ab => (
                              <label key={ab} className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={form.pe_cervical_abnormalities.includes(ab)} onChange={e => {
                                  setForm(p => ({ ...p, pe_cervical_abnormalities: e.target.checked ? [...p.pe_cervical_abnormalities, ab] : p.pe_cervical_abnormalities.filter(x => x !== ab) }));
                                }} /> {ab}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold">Cervical consistency:</span>
                            <label className="flex items-center gap-0.5 cursor-pointer"><input type="radio" name="c_cons" checked={form.pe_cervical_consistency === "firm"} onChange={() => setForm(p => ({ ...p, pe_cervical_consistency: "firm" }))} /> firm</label>
                            <label className="flex items-center gap-0.5 cursor-pointer"><input type="radio" name="c_cons" checked={form.pe_cervical_consistency === "soft"} onChange={() => setForm(p => ({ ...p, pe_cervical_consistency: "soft" }))} /> soft</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">Uterine depth:</span>
                            <Input type="text" value={form.pe_uterine_depth_cm} onChange={e => setForm(p => ({ ...p, pe_uterine_depth_cm: e.target.value }))} className={lineInputClass} placeholder="cm" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACKNOWLEDGEMENT & CONSENT */}
                    <div className="border border-slate-400 dark:border-slate-600 p-2.5 rounded-xs space-y-2 bg-slate-50/60 dark:bg-slate-900/40 text-[10px]">
                      <div className="font-bold uppercase text-[10px] border-b pb-0.5">ACKNOWLEDGEMENT & CONSENT</div>
                      <p className="italic text-[9.5px]">
                        This is to certify that the Physician/Nurse/Midwife of the clinic has fully explained to me the different methods available in family planning and I freely choose the:
                      </p>
                      <div className="flex items-center gap-2 font-bold">
                        <span>Chosen Method:</span>
                        <Input type="text" value={form.ack_method_chosen} onChange={e => setForm(p => ({ ...p, ack_method_chosen: e.target.value }))} className={lineInputClass} placeholder="e.g. DMPA / Injectable" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center">
                          <Input type="text" value={form.ack_client_signature} onChange={e => setForm(p => ({ ...p, ack_client_signature: e.target.value }))} className="text-center border-b border-t-0 border-x-0 rounded-none h-6 text-xs font-bold" />
                          <span className="text-[9px] block font-semibold text-slate-600 dark:text-slate-400">Client Signature</span>
                        </div>
                        <div className="text-center">
                          <Input type="date" value={form.ack_date} onChange={e => setForm(p => ({ ...p, ack_date: e.target.value }))} className="text-center border-b border-t-0 border-x-0 rounded-none h-6 text-xs font-bold" />
                          <span className="text-[9px] block font-semibold text-slate-600 dark:text-slate-400">Date</span>
                        </div>
                      </div>

                      <p className="italic text-[9.5px] pt-2 border-t border-slate-200 dark:border-slate-800">
                        I hereby consent to the inclusion of my FP Form 1 in the Family Health Registry.
                      </p>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="text-center">
                          <Input type="text" value={form.consent_client_signature} onChange={e => setForm(p => ({ ...p, consent_client_signature: e.target.value }))} className="text-center border-b border-t-0 border-x-0 rounded-none h-6 text-xs font-bold" />
                          <span className="text-[9px] block font-semibold text-slate-600 dark:text-slate-400">Client Signature</span>
                        </div>
                        <div className="text-center">
                          <Input type="date" value={form.consent_date} onChange={e => setForm(p => ({ ...p, consent_date: e.target.value }))} className="text-center border-b border-t-0 border-x-0 rounded-none h-6 text-xs font-bold" />
                          <span className="text-[9px] block font-semibold text-slate-600 dark:text-slate-400">Date</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* FOOTNOTE LEGEND BOX */}
                <div className="border border-slate-300 dark:border-slate-700 p-2 text-[8.5px] text-slate-600 dark:text-slate-400 leading-tight rounded-xs mt-2 bg-muted/20">
                  <strong>Legend:</strong> Implant - Progestin subdermal implant; IUD - Intrauterine device; BTL - Bilateral tubal ligation; NSV - No-scalpel vasectomy; COC - Combined oral contraceptives; POP - Progestin only pills; LAM - Lactational amenorrhea method; SDM - Standard days method; BBT - Basal body temperature; BOM - Billings ovulation method; CMM - Cervical mucus method; STM - Sympto-thermal method.
                </div>

              </div>
            </TabsContent>

            {/* TAB 2: SIDE B - VISIT HISTORY & PREGNANCY ASSESSMENT */}
            <TabsContent value="side-b" className="space-y-4">
              <div id="fp-form1-sideb-print-area" className="w-full max-w-full space-y-4 bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-md border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-sans">
                
                {/* SIDE B BANNER */}
                <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span>SIDE B</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">FAMILY PLANNING CLIENT ASSESSMENT RECORD</span>
                    <span>FP FORM 1</span>
                  </div>
                </div>

                {/* VISIT HISTORY TABLE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-primary">Visit History & Service Rendered Log</span>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVisitRow} className="gap-1 text-xs no-print">
                      <Plus className="h-3.5 w-3.5" /> Add Visit Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-slate-400 dark:border-slate-600 rounded-xs">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center border-b border-slate-400">
                          <th className="border border-slate-300 dark:border-slate-700 p-1.5 w-28">DATE OF VISIT<br/><span className="text-[9px] font-normal">(MM/DD/YYYY)</span></th>
                          <th className="border border-slate-300 dark:border-slate-700 p-1.5 min-w-[280px]">MEDICAL FINDINGS<br/><span className="text-[9px] font-normal">(Medical observation, complaints, service rendered, lab exam, treatment & referrals)</span></th>
                          <th className="border border-slate-300 dark:border-slate-700 p-1.5 w-36">METHOD ACCEPTED</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-1.5 min-w-[180px]">NAME & SIGNATURE OF SERVICE PROVIDER</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-1.5 w-32">DATE OF FOLLOW-UP VISIT<br/><span className="text-[9px] font-normal">(MM/DD/YYYY)</span></th>
                          <th className="border border-slate-300 dark:border-slate-700 p-1 w-8 no-print"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.visit_rows.map((vRow, idx) => (
                          <tr key={vRow.id} className="hover:bg-muted/20">
                            <td className="border border-slate-300 dark:border-slate-700 p-1">
                              <Input type="date" value={vRow.visit_date} onChange={e => setForm(p => ({ ...p, visit_rows: p.visit_rows.map(r => r.id === vRow.id ? { ...r, visit_date: e.target.value } : r) }))} className="h-6 text-[11px] border-0 text-center" />
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1">
                              <Textarea value={vRow.medical_findings} onChange={e => setForm(p => ({ ...p, visit_rows: p.visit_rows.map(r => r.id === vRow.id ? { ...r, medical_findings: e.target.value } : r) }))} className="min-h-[40px] text-xs p-1 border-0" placeholder="Findings, complaints, BP/Weight, procedures..." />
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1">
                              <Input type="text" value={vRow.method_accepted} onChange={e => setForm(p => ({ ...p, visit_rows: p.visit_rows.map(r => r.id === vRow.id ? { ...r, method_accepted: e.target.value } : r) }))} className="h-6 text-[11px] border-0 text-center" placeholder="DMPA / Pills..." />
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1">
                              <Input type="text" value={vRow.service_provider} onChange={e => setForm(p => ({ ...p, visit_rows: p.visit_rows.map(r => r.id === vRow.id ? { ...r, service_provider: e.target.value } : r) }))} className="h-6 text-xs border-0" placeholder="Provider Name / Midwife" />
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1">
                              <Input type="date" value={vRow.followup_date} onChange={e => setForm(p => ({ ...p, visit_rows: p.visit_rows.map(r => r.id === vRow.id ? { ...r, followup_date: e.target.value } : r) }))} className="h-6 text-[11px] border-0 text-center" />
                            </td>
                            <td className="border border-slate-300 dark:border-slate-700 p-1 text-center no-print">
                              {form.visit_rows.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveVisitRow(vRow.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
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

                {/* HOW TO BE REASONABLY SURE CLIENT IS NOT PREGNANT */}
                <div className="border border-slate-400 dark:border-slate-600 p-3 rounded-xs space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="font-bold text-xs uppercase bg-slate-200 dark:bg-slate-800 p-1 rounded-xs text-slate-900 dark:text-slate-100">
                    How to be Reasonably Sure a Client is Not Pregnant
                  </div>

                  <div className="space-y-2 text-[10.5px]">
                    {[
                      { key: "preg_qn1_breastfeeding_6m", text: "1. Did you have a baby less than six (6) months ago, are you fully or nearly-fully breastfeeding, AND have you had no menstrual period since then?" },
                      { key: "preg_qn2_abstained", text: "2. Have you abstained from sexual intercourse since your last menstrual period or delivery?" },
                      { key: "preg_qn3_baby_last_4w", text: "3. Have you had a baby in the last four (4) weeks?" },
                      { key: "preg_qn4_lmp_7d", text: "4. Did your last menstrual period start within the past seven (7) days?" },
                      { key: "preg_qn5_abortion_7d", text: "5. Have you had a miscarriage or abortion in the last seven (7) days?" },
                      { key: "preg_qn6_reliable_contraceptive", text: "6. Have you been using a reliable contraceptive method consistently and correctly?" },
                    ].map((qn) => {
                      const val = (form as any)[qn.key];
                      return (
                        <div key={qn.key} className="flex items-start justify-between gap-2 hover:bg-muted/30 p-1 rounded-xs">
                          <span className="leading-snug">{qn.text}</span>
                          <div className="flex items-center gap-3 font-bold shrink-0 pt-0.5">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name={qn.key} checked={val === true} onChange={() => setForm(p => ({ ...p, [qn.key]: true }))} /> Yes
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name={qn.key} checked={val === false} onChange={() => setForm(p => ({ ...p, [qn.key]: false }))} /> No
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-300 dark:border-slate-700 pt-2 space-y-1 text-[9.5px] italic text-slate-700 dark:text-slate-300">
                    <p>• If the client answered <strong>YES</strong> to at least one of the questions and she is free of signs or symptoms of pregnancy, provide client with desired method.</p>
                    <p>• If the client answered <strong>NO</strong> to all of the questions, pregnancy cannot be ruled out. The client should await menses or use a pregnancy test.</p>
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* TAB 3: SAVED RECORDS HISTORY */}
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Saved Family Planning Records ({records.length})
                </h3>

                {records.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-6 text-center border rounded-lg bg-muted/20">
                    No saved Family Planning records found.
                  </p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-muted text-muted-foreground font-semibold border-b">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Resident / Client Name</th>
                          <th className="p-2.5">Method Chosen</th>
                          <th className="p-2.5">Summary Remarks</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {records.map((rec) => {
                          const resName = rec.residents?.full_name || "—";
                          const displayRemarks = rec.remarks ? rec.remarks.split("DATA_JSON:")[0] : "—";
                          return (
                            <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                              <td className="p-2.5 font-medium whitespace-nowrap">{rec.start_date || rec.created_at?.split("T")[0]}</td>
                              <td className="p-2.5 font-bold text-foreground">{resName}</td>
                              <td className="p-2.5 font-semibold text-primary">{rec.method || "—"}</td>
                              <td className="p-2.5 max-w-xs truncate text-muted-foreground">{displayRemarks}</td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      setViewRecord(rec);
                                      setViewModalOpen(true);
                                    }}
                                    className="h-7 px-2 text-xs gap-1"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-600" /> View / Print
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditRecord(rec)} 
                                    className="h-7 w-7"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-600" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setDeleteId(rec.id)} 
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      {/* VIEW RECORD MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {viewRecord && (() => {
            const formData = parseRecordData(viewRecord);
            return (
              <div className="space-y-4">
                <DialogHeader className="border-b pb-3 no-print flex flex-row items-center justify-between">
                  <DialogTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-600" /> Family Planning Client Assessment Record (FP FORM 1)
                  </DialogTitle>
                  <Button type="button" onClick={() => window.print()} size="sm" className="gap-1 text-xs">
                    <Printer className="h-4 w-4" /> Print Form
                  </Button>
                </DialogHeader>

                <div id="fp-form1-modal-print" className="space-y-3 text-xs border p-4 rounded-md">
                  <div className="text-center font-bold text-sm border-b pb-1">
                    FAMILY PLANNING CLIENT ASSESSMENT RECORD (FP FORM 1)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>Client Name:</strong> {formData.given_name} {formData.middle_initial} {formData.last_name}</div>
                    <div><strong>Age / DOB:</strong> {formData.age} yrs / {formData.dob || "N/A"}</div>
                    <div><strong>Address:</strong> {formData.address_barangay}, {formData.address_municipality}</div>
                    <div><strong>Client Type:</strong> {formData.client_type}</div>
                    <div><strong>Chosen Method:</strong> {formData.ack_method_chosen || formData.previously_used_methods.join(", ") || "N/A"}</div>
                    <div><strong>Date:</strong> {formData.ack_date}</div>
                  </div>
                </div>

                <DialogFooter className="no-print pt-2">
                  <Button type="button" variant="outline" onClick={() => setViewModalOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family Planning Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
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
