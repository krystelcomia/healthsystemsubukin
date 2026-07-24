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
  Edit, 
  Eye, 
  UserCheck,
  Calendar as CalendarIcon,
  FileText,
  Check,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { ensureResidentExists, calculateAge } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-8 text-xs";

export interface ChildSickRecord {
  id?: string;
  resident_id?: string | null;
  child_name: string;
  dob: string;
  age_months: string;
  sex: string;
  mother_name: string;
  sitio: string;
  visit_date: string;
  symptoms: string[];
  treatment_given: string;
  followup_date: string;
  remarks: string;
}

export interface VitaminARow {
  id: string;
  child_name: string;
  sex: string;
  dob: string;
  age_months: string;
  mother_name: string;
  vit_a_blue: string; // 6-11 mos
  vit_a_red: string;  // 12-59 mos
  deworming_date: string;
  remarks: string;
}

export interface SIARow {
  id: string;
  child_name: string;
  sex: string;
  dob: string;
  age_months: string;
  mother_name: string;
  sitio: string;
  mr_vaccine_date: string;
  bopv_vaccine_date: string;
  status: string; // Fully Immunized / Deferred / Refused / Moved
  remarks: string;
}

const ChildHealthForm = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState("sick-children");
  const [residents, setResidents] = useState<any[]>([]);
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);
  const [savedHealthRecords, setSavedHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & History filter
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewRecordModalOpen, setViewRecordModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // FORM 1: Care for Sick Children (2 Months to 5 Years)
  const [sickForm, setSickForm] = useState<ChildSickRecord>({
    child_name: "",
    dob: "",
    age_months: "",
    sex: "Male",
    mother_name: "",
    sitio: "Subukin",
    visit_date: new Date().toISOString().split("T")[0],
    symptoms: [],
    treatment_given: "",
    followup_date: "",
    remarks: "",
  });

  // FORM 2: Vitamin A and RHU2 Master List
  const [vitAInfo, setVitAInfo] = useState({
    sitio: "Subukin",
    target_period: "1st Round (April)",
    year: new Date().getFullYear().toString(),
  });
  const [vitARows, setVitARows] = useState<VitaminARow[]>([
    {
      id: "vrow-1",
      child_name: "",
      sex: "Male",
      dob: "",
      age_months: "",
      mother_name: "",
      vit_a_blue: "",
      vit_a_red: "",
      deworming_date: "",
      remarks: "",
    }
  ]);

  // FORM 3: SIA Master List (6-59 Months)
  const [siaInfo, setSiaInfo] = useState({
    campaign_name: "MR-OPV SIA Campaign",
    sitio: "Subukin",
    activity_date: new Date().toISOString().split("T")[0],
    coordinator: "",
  });
  const [siaRows, setSiaRows] = useState<SIARow[]>([
    {
      id: "srow-1",
      child_name: "",
      sex: "Female",
      dob: "",
      age_months: "",
      mother_name: "",
      sitio: "Subukin",
      mr_vaccine_date: "",
      bopv_vaccine_date: "",
      status: "Fully Immunized",
      remarks: "",
    }
  ]);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from("residents")
      .select("id, full_name, age, birthday, sitio, gender, family_number")
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

  const handleSelectResidentForSick = (residentId: string) => {
    const res = residents.find(r => r.id === residentId);
    if (!res) return;

    let computedAgeMonths = "";
    if (res.birthday) {
      const birth = new Date(res.birthday);
      const today = new Date();
      const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      computedAgeMonths = String(months > 0 ? months : 0);
    } else if (res.age) {
      computedAgeMonths = String(res.age * 12);
    }

    setSickForm(prev => ({
      ...prev,
      resident_id: res.id,
      child_name: res.full_name,
      dob: res.birthday || prev.dob,
      age_months: computedAgeMonths || prev.age_months,
      sex: res.gender || prev.sex,
      sitio: res.sitio || prev.sitio,
    }));
  };

  const toggleSickSymptom = (symptom: string) => {
    setSickForm(prev => {
      const exists = prev.symptoms.includes(symptom);
      return {
        ...prev,
        symptoms: exists ? prev.symptoms.filter(s => s !== symptom) : [...prev.symptoms, symptom]
      };
    });
  };

  // Submit Form 1: Sick Child Care
  const handleSaveSickChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sickForm.child_name.trim()) {
      toast.error("Please enter or select the child's name.");
      return;
    }

    setSaving(true);
    try {
      const targetResId = sickForm.resident_id || await ensureResidentExists({
        fullName: sickForm.child_name,
        sitio: sickForm.sitio,
        gender: sickForm.sex,
        birthday: sickForm.dob,
      });

      const summaryRemarks = `[Care for Sick Child 2m-5y] Symptoms: ${sickForm.symptoms.join(", ") || "None"}. Treatment: ${sickForm.treatment_given || "N/A"}`;

      const payload = {
        resident_id: targetResId,
        checkup_date: sickForm.visit_date || new Date().toISOString().split("T")[0],
        remarks: summaryRemarks,
        details: JSON.stringify({
          form_type: "care_for_sick_children",
          ...sickForm,
        }),
      };

      const { error } = await supabase.from("child_health" as any).insert(payload as any);

      if (error) {
        toast.error("Failed to save Sick Child record.");
      } else {
        toast.success("Sick Child care record saved successfully.");
        logActivity("submit_child_health", {
          entity_type: "child_health",
          description: `Saved Care for Sick Child record for: ${sickForm.child_name}`,
        });
        setSickForm({
          child_name: "",
          dob: "",
          age_months: "",
          sex: "Male",
          mother_name: "",
          sitio: "Subukin",
          visit_date: new Date().toISOString().split("T")[0],
          symptoms: [],
          treatment_given: "",
          followup_date: "",
          remarks: "",
        });
        fetchSavedRecords();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving record.");
    } finally {
      setSaving(false);
    }
  };

  // Submit Form 2: Vitamin A & RHU2 Master List
  const handleAddVitARow = () => {
    setVitARows(prev => [
      ...prev,
      {
        id: `vrow-${Date.now()}`,
        child_name: "",
        sex: "Male",
        dob: "",
        age_months: "",
        mother_name: "",
        vit_a_blue: "",
        vit_a_red: "",
        deworming_date: "",
        remarks: "",
      }
    ]);
  };

  const handleRemoveVitARow = (id: string) => {
    setVitARows(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveVitAMasterlist = async () => {
    const validRows = vitARows.filter(r => r.child_name.trim());
    if (validRows.length === 0) {
      toast.error("Please enter at least one child's name in the master list.");
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const row of validRows) {
        const resId = await ensureResidentExists({
          fullName: row.child_name,
          sitio: vitAInfo.sitio,
          gender: row.sex,
          birthday: row.dob,
        });

        const remarksText = `[Vitamin A & RHU2 Masterlist - ${vitAInfo.target_period} ${vitAInfo.year}] Blue: ${row.vit_a_blue || "N/A"}, Red: ${row.vit_a_red || "N/A"}, Deworming: ${row.deworming_date || "N/A"}`;

        const payload = {
          resident_id: resId,
          checkup_date: row.vit_a_red || row.vit_a_blue || new Date().toISOString().split("T")[0],
          remarks: remarksText,
          details: JSON.stringify({
            form_type: "vitamin_a_rhu2_masterlist",
            header: vitAInfo,
            row_data: row,
          }),
        };

        const { error } = await supabase.from("child_health" as any).insert(payload as any);
        if (!error) savedCount++;
      }

      toast.success(`Successfully saved ${savedCount} Vitamin A & RHU2 masterlist entries.`);
      logActivity("submit_child_health", {
        entity_type: "child_health",
        description: `Saved ${savedCount} Vitamin A & RHU2 masterlist records`,
      });
      fetchSavedRecords();
    } catch (err) {
      console.error(err);
      toast.error("Error saving Vitamin A masterlist.");
    } finally {
      setSaving(false);
    }
  };

  // Submit Form 3: SIA Master List (6-59 Months)
  const handleAddSIARow = () => {
    setSiaRows(prev => [
      ...prev,
      {
        id: `srow-${Date.now()}`,
        child_name: "",
        sex: "Female",
        dob: "",
        age_months: "",
        mother_name: "",
        sitio: "Subukin",
        mr_vaccine_date: "",
        bopv_vaccine_date: "",
        status: "Fully Immunized",
        remarks: "",
      }
    ]);
  };

  const handleRemoveSIARow = (id: string) => {
    setSiaRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveSIAMasterlist = async () => {
    const validRows = siaRows.filter(r => r.child_name.trim());
    if (validRows.length === 0) {
      toast.error("Please enter at least one child's name in the SIA master list.");
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const row of validRows) {
        const resId = await ensureResidentExists({
          fullName: row.child_name,
          sitio: row.sitio || siaInfo.sitio,
          gender: row.sex,
          birthday: row.dob,
        });

        const remarksText = `[SIA Masterlist (6-59m) - ${siaInfo.campaign_name}] MR: ${row.mr_vaccine_date || "N/A"}, bOPV: ${row.bopv_vaccine_date || "N/A"}, Status: ${row.status}`;

        const payload = {
          resident_id: resId,
          checkup_date: siaInfo.activity_date || new Date().toISOString().split("T")[0],
          remarks: remarksText,
          details: JSON.stringify({
            form_type: "sia_masterlist_6_59m",
            campaign_info: siaInfo,
            row_data: row,
          }),
        };

        const { error } = await supabase.from("child_health" as any).insert(payload as any);
        if (!error) savedCount++;
      }

      toast.success(`Successfully saved ${savedCount} SIA masterlist entries.`);
      logActivity("submit_child_health", {
        entity_type: "child_health",
        description: `Saved ${savedCount} SIA masterlist records`,
      });
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
      logActivity("delete_child_health", {
        entity_type: "child_health",
        description: `Deleted child health record ID: ${id}`,
      });
      fetchSavedRecords();
    } else {
      toast.error("Failed to delete record.");
    }
    setDeleteConfirmId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const SICK_CHILD_SYMPTOMS = [
    "Cough or difficulty breathing",
    "Diarrhea (less than 14 days)",
    "Diarrhea with blood in stool",
    "Fever (duration 7 days or more)",
    "Stiff neck / Severe headache",
    "Measles rash / Red eyes",
    "Ear pain or ear discharge",
    "Swelling behind ear",
    "Visible severe wasting",
    "Palmar pallor (Anemia sign)",
    "Edema on both feet",
  ];

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
            margin: 10mm;
          }
        }
      `}</style>

      {/* Main Container Card */}
      <Card id="child-print-area" className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          
          {/* Header Seal Layout - Visible ONLY when printing */}
          <div className="print-only flex items-center justify-center gap-8 md:gap-12 border-b-[4px] border-double border-slate-900 pb-4 header-border" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Subukin Logo" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          {/* Barangay Subukin & Action Bar */}
          <div className="flex items-center justify-between gap-2 no-print pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
              BRGY: <strong className="text-foreground">SUBUKIN</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs border-primary/20 text-primary hover:bg-primary/10">
                <Printer className="h-3.5 w-3.5" /> Print Form
              </Button>
            </div>
          </div>

          {/* Child Health Form Category Sub-Tabs */}
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

            {/* TAB 1: Care for Sick Children (Aged 2 Months to 5 Years) */}
            <TabsContent value="sick-children" className="mt-6 space-y-6">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 font-heading uppercase">
                    <Stethoscope className="h-5 w-5 text-sky-600" /> Care for Sick Children (Aged 2 Months to 5 Years)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Integrative Management of Childhood Illness (IMCI) Clinical Assessment & Treatment Form
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSickChild} className="space-y-6">
                {/* Child General Info */}
                <div className="space-y-4 bg-muted/20 p-4 md:p-5 rounded-lg border border-border/60 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" /> Child Patient Information
                    </h3>
                    <div className="flex items-center gap-2 no-print w-full md:w-72">
                      <Label className="text-xs shrink-0 font-medium">Select Resident Child:</Label>
                      <Select onValueChange={handleSelectResidentForSick}>
                        <SelectTrigger className="h-8 text-xs bg-background">
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

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="font-semibold text-muted-foreground">Child's Full Name *</Label>
                      <Input 
                        type="text" 
                        value={sickForm.child_name} 
                        onChange={e => setSickForm(p => ({ ...p, child_name: e.target.value }))} 
                        placeholder="Pangalan ng bata" 
                        className={lineInputClass}
                        required 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Date of Birth</Label>
                      <Input 
                        type="date" 
                        value={sickForm.dob} 
                        onChange={e => setSickForm(p => ({ ...p, dob: e.target.value }))} 
                        className={`${lineInputClass} ${!sickForm.dob ? "empty-date" : ""}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Age in Months</Label>
                      <Input 
                        type="text" 
                        value={sickForm.age_months} 
                        onChange={e => setSickForm(p => ({ ...p, age_months: e.target.value }))} 
                        placeholder="e.g. 14 months" 
                        className={lineInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Sex</Label>
                      <Select value={sickForm.sex} onValueChange={v => setSickForm(p => ({ ...p, sex: v }))}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male" className="text-xs">Male</SelectItem>
                          <SelectItem value="Female" className="text-xs">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Mother's / Guardian's Name</Label>
                      <Input 
                        type="text" 
                        value={sickForm.mother_name} 
                        onChange={e => setSickForm(p => ({ ...p, mother_name: e.target.value }))} 
                        placeholder="Pangalan ng Ina" 
                        className={lineInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Sitio / Address</Label>
                      <Select value={sickForm.sitio} onValueChange={v => setSickForm(p => ({ ...p, sitio: v }))}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Sitio" />
                        </SelectTrigger>
                        <SelectContent>
                          {sitioOptions.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Checkup / Visit Date</Label>
                      <Input 
                        type="date" 
                        value={sickForm.visit_date} 
                        onChange={e => setSickForm(p => ({ ...p, visit_date: e.target.value }))} 
                        className={`${lineInputClass} ${!sickForm.visit_date ? "empty-date" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Symptoms Assessment Checklist */}
                <div className="space-y-3 bg-card p-4 md:p-5 rounded-lg border border-border/80 text-xs">
                  <div className="border-b pb-2 flex items-center justify-between">
                    <h3 className="font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5 font-heading">
                      <AlertCircle className="h-4 w-4" /> Clinical Symptoms Assessment Checklist
                    </h3>
                    <span className="text-xs text-muted-foreground no-print">
                      {sickForm.symptoms.length} symptoms selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {SICK_CHILD_SYMPTOMS.map(symptom => {
                      const isSelected = sickForm.symptoms.includes(symptom);
                      return (
                        <div 
                          key={symptom} 
                          className="flex items-center space-x-2.5 cursor-pointer hover:text-foreground transition-colors group select-none py-1"
                          onClick={() => toggleSickSymptom(symptom)}
                        >
                          <div 
                            className={cn(
                              "h-4 w-4 shrink-0 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center transition-all",
                              isSelected 
                                ? "bg-sky-600 border-sky-600 text-white font-bold shadow-xs" 
                                : "bg-background group-hover:border-sky-500"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className={cn("text-xs cursor-pointer select-none", isSelected ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            {symptom}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Treatment & Action */}
                <div className="space-y-4 bg-muted/20 p-4 md:p-5 rounded-lg border border-border/60 text-xs">
                  <h3 className="font-bold uppercase tracking-wider text-primary">Treatment & Action Given</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Treatment Given (ORS, Zinc, Antibiotics, Vitamin A, etc.)</Label>
                      <Textarea 
                        value={sickForm.treatment_given} 
                        onChange={e => setSickForm(p => ({ ...p, treatment_given: e.target.value }))} 
                        placeholder="Ibigay ang mga gamot o lunas na naipamahagi..." 
                        className="h-16 text-xs resize-y"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-muted-foreground">Notes / Follow-up Instructions</Label>
                      <Textarea 
                        value={sickForm.remarks} 
                        onChange={e => setSickForm(p => ({ ...p, remarks: e.target.value }))} 
                        placeholder="Karagdagang ulat o paalala..." 
                        className="h-16 text-xs resize-y"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 no-print pt-2 border-t">
                  <Button type="submit" disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Sick Child Record"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: Children's Master List for Vitamin A and RHU2 */}
            <TabsContent value="vitamin-a" className="mt-6 space-y-6">
              <div className="border-b pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 font-heading uppercase">
                    <Pill className="h-5 w-5 text-amber-600" /> Children's Master List for Vitamin A & RHU2
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semestral Vitamin A Supplementation (6-59 Months) & Deworming Master Registry
                  </p>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <Select value={vitAInfo.target_period} onValueChange={v => setVitAInfo(p => ({ ...p, target_period: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-background w-44">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Round (April)" className="text-xs">1st Round (April)</SelectItem>
                      <SelectItem value="2nd Round (October)" className="text-xs">2nd Round (October)</SelectItem>
                    </SelectContent>
                  </Select>

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

              {/* Masterlist Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold text-center">
                      <th className="border border-border p-2 w-8">#</th>
                      <th className="border border-border p-2 w-[22%]">Child's Full Name</th>
                      <th className="border border-border p-2 w-[8%]">Sex</th>
                      <th className="border border-border p-2 w-[12%]">DOB</th>
                      <th className="border border-border p-2 w-[10%]">Vit A (6-11m) Blue</th>
                      <th className="border border-border p-2 w-[10%]">Vit A (12-59m) Red</th>
                      <th className="border border-border p-2 w-[12%]">Deworming Date</th>
                      <th className="border border-border p-2 w-[18%]">Remarks / RHU2</th>
                      <th className="border border-border p-2 w-8 no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitARows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="border border-border p-1 text-center font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="border border-border p-1">
                          <input 
                            type="text" 
                            value={row.child_name} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, child_name: val } : r));
                            }} 
                            placeholder="" 
                            className="cell-input w-full bg-transparent border-0 outline-none text-xs px-1"
                          />
                        </td>
                        <td className="border border-border p-1">
                          <select 
                            value={row.sex} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, sex: val } : r));
                            }} 
                            className="w-full bg-transparent border-0 outline-none text-xs text-center"
                          >
                            <option value="Male">M</option>
                            <option value="Female">F</option>
                          </select>
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.dob} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, dob: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.dob ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.vit_a_blue} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, vit_a_blue: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.vit_a_blue ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.vit_a_red} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, vit_a_red: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.vit_a_red ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.deworming_date} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, deworming_date: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.deworming_date ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="text" 
                            value={row.remarks} 
                            onChange={e => {
                              const val = e.target.value;
                              setVitARows(prev => prev.map(r => r.id === row.id ? { ...r, remarks: val } : r));
                            }} 
                            placeholder="" 
                            className="cell-input w-full bg-transparent border-0 outline-none text-xs px-1"
                          />
                        </td>
                        <td className="border border-border p-1 text-center no-print">
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
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </Button>

                <Button type="button" onClick={handleSaveVitAMasterlist} disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Vitamin A Master List"}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: Supplemental Immunization Activity (SIA) Master List (6-59 Months) */}
            <TabsContent value="sia-masterlist" className="mt-6 space-y-6">
              <div className="border-b pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 font-heading uppercase">
                    <Syringe className="h-5 w-5 text-emerald-600" /> Supplemental Immunization Activity (SIA) Master List (6–59 Months)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    MR (Measles-Rubella) & bOPV (Oral Polio) Campaign Supplemental Vaccination Registry
                  </p>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <Select value={siaInfo.sitio} onValueChange={v => setSiaInfo(p => ({ ...p, sitio: v }))}>
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

              {/* SIA Masterlist Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold text-center">
                      <th className="border border-border p-2 w-8">#</th>
                      <th className="border border-border p-2 w-[22%]">Child's Full Name</th>
                      <th className="border border-border p-2 w-[8%]">Sex</th>
                      <th className="border border-border p-2 w-[12%]">DOB</th>
                      <th className="border border-border p-2 w-[12%]">MR Vaccine Date</th>
                      <th className="border border-border p-2 w-[12%]">bOPV Vaccine Date</th>
                      <th className="border border-border p-2 w-[14%]">SIA Status</th>
                      <th className="border border-border p-2 w-[14%]">Remarks</th>
                      <th className="border border-border p-2 w-8 no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {siaRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="border border-border p-1 text-center font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="border border-border p-1">
                          <input 
                            type="text" 
                            value={row.child_name} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, child_name: val } : r));
                            }} 
                            placeholder="" 
                            className="cell-input w-full bg-transparent border-0 outline-none text-xs px-1"
                          />
                        </td>
                        <td className="border border-border p-1">
                          <select 
                            value={row.sex} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, sex: val } : r));
                            }} 
                            className="w-full bg-transparent border-0 outline-none text-xs text-center"
                          >
                            <option value="Male">M</option>
                            <option value="Female">F</option>
                          </select>
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.dob} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, dob: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.dob ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.mr_vaccine_date} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, mr_vaccine_date: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.mr_vaccine_date ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="date" 
                            value={row.bopv_vaccine_date} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, bopv_vaccine_date: val } : r));
                            }} 
                            className={`w-full bg-transparent border-0 outline-none text-xs text-center ${!row.bopv_vaccine_date ? "empty-date" : ""}`}
                          />
                        </td>
                        <td className="border border-border p-1">
                          <select 
                            value={row.status} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, status: val } : r));
                            }} 
                            className="w-full bg-transparent border-0 outline-none text-xs"
                          >
                            <option value="Fully Immunized">Fully Immunized</option>
                            <option value="Deferred">Deferred</option>
                            <option value="Refused">Refused</option>
                            <option value="Moved Out">Moved Out</option>
                          </select>
                        </td>
                        <td className="border border-border p-1">
                          <input 
                            type="text" 
                            value={row.remarks} 
                            onChange={e => {
                              const val = e.target.value;
                              setSiaRows(prev => prev.map(r => r.id === row.id ? { ...r, remarks: val } : r));
                            }} 
                            placeholder="" 
                            className="cell-input w-full bg-transparent border-0 outline-none text-xs px-1"
                          />
                        </td>
                        <td className="border border-border p-1 text-center no-print">
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
                  <Plus className="h-3.5 w-3.5" /> Add Row
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
