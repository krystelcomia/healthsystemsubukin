import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Heart, 
  Save, 
  Printer, 
  Plus, 
  Trash, 
  RefreshCw, 
  Search, 
  Edit, 
  Eye, 
  UserCheck,
  AlertTriangle,
  Calendar as CalendarIcon,
  FileText,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { ensureResidentExists, calculateAge, getFamilyOnlyResidents } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

export const RISK_FACTORS_COLUMN_1 = [
  "Abnormal presentation",
  "Age <15 or >35",
  "Bronchial asthma",
  "Convulsions",
  "Diabetes",
  "Dizziness or blurring of vision having her 4th or more baby",
  "Heart or kidney disease",
  "Height lower than 145 cm.",
  "Illiterate mother",
  "Leg and pelvic deformities (polio paralysis)",
  "Malaria",
  "Mental disorder",
];

export const RISK_FACTORS_COLUMN_2 = [
  "Multiple fetus",
  "No prenatal/irregular or prenatal section",
  "For previous pregnancy performs heavy manual labor",
  "Pitting",
  "Poor OB history (3 consecutive Miscarriages, stillbirth, postpartum hemorrhage)",
  "Positive urine albumin",
  "Pre-pregnancy weight less than 80% of standard weight",
  "Pregnancy interval less than 24 Months from last pregnancy",
];

export const RISK_FACTORS_COLUMN_3 = [
  "Pregnancy longer than 294 days or 42 weeks",
  "Previous cesarean",
  "Thyroid problems",
  "Tuberculosis",
  "Unwanted or unplanned pregnancy",
  "Unwed mother",
  "Vaginal bleeding",
  "Vaginal infection",
  "Weight gain more than 6% of Pre-pregnancy weight per trim.",
  "Weight less than 4% of pre-pregnancy weight per trim.",
];

export interface PrenatalVisit {
  id: string;
  visit_date: string;
  visit_number: string;
  aog: string;
  blood_pressure: string;
  weight: string;
  fundic_height: string;
  fhr: string;
  fhr_location: string;
  presentation: string;
  notes: string;
}

export interface MaternalCareRecord {
  id: string;
  resident_id?: string | null;
  family_number?: string;
  patient_name?: string;
  patient_last_name?: string;
  patient_first_name?: string;
  patient_middle_name?: string;
  age?: number | string;
  sitio?: string;
  edc?: string;
  lmp?: string;
  obstetric_score?: string;
  fpal?: string;
  end_1st_trim?: string;
  end_2nd_trim?: string;
  end_3rd_trim?: string;
  end_postpartum?: string;
  period?: string;
  patient_height?: string;
  blood_type?: string;
  risk_factors?: string[] | string;
  prenatal_visits?: PrenatalVisit[] | string;
  checkup_date?: string;
  remarks?: string;
  created_at?: string;
}

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-8 text-sm";

const MaternalCareForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<any[]>([]);
  const [sitios, setSitios] = useState<string[]>([]);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const [form, setForm] = useState({
    id: "",
    resident_id: "",
    family_number: "",
    full_name: "",
    age: "",
    birthday: "",
    sitio: "",
    husband_name: "",
    gravida: "",
    para: "",
    abortion: "",
    stillbirth: "",
    lmp: "",
    edc: "",
    risk_factors: [] as string[],
    prenatal_visits: [] as PrenatalVisit[],
  });

  const fetchResidents = async () => {
    const data = await getFamilyOnlyResidents();
    setResidents(data || []);
  };

  const fetchSavedRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maternal_care" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSavedRecords(data as MaternalCareRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResidents();
    fetchSavedRecords();
    getDatabaseSitios().then(sits => setSitioOptions(sits));
  }, []);

  // Split name helper
  const parseNameParts = (fullName: string) => {
    const clean = (fullName || "").trim();
    if (!clean) return { last: "", first: "", middle: "" };
    if (clean.includes(",")) {
      const parts = clean.split(",");
      const last = parts[0].trim();
      const rest = parts[1].trim().split(" ");
      const first = rest[0] || "";
      const middle = rest.slice(1).join(" ") || "";
      return { last, first, middle };
    }
    const parts = clean.split(" ");
    if (parts.length === 1) return { last: parts[0], first: "", middle: "" };
    if (parts.length === 2) return { last: parts[1], first: parts[0], middle: "" };
    return { last: parts[parts.length - 1], first: parts.slice(0, -1).join(" "), middle: "" };
  };

  const handleSelectResident = async (residentId: string) => {
    const res = residents.find(r => r.id === residentId);
    if (!res) {
      setForm(prev => ({ ...prev, resident_id: residentId }));
      return;
    }

    const { last, first, middle } = parseNameParts(res.full_name);
    let computedAge = "";
    if (res.birthday) {
      computedAge = String(calculateAge(res.birthday));
    } else if (res.age) {
      computedAge = String(res.age);
    }

    // Query family_data database to find linked family_number (from household head or father)
    let linkedFamilyNumber = res.family_number || "";
    try {
      const { data: familyRecords } = await supabase
        .from("family_data")
        .select("*");

      if (familyRecords && familyRecords.length > 0) {
        const cleanResName = (res.full_name || "").trim().toLowerCase();
        
        const matchedFam = familyRecords.find((fam: any) => {
          if (fam.resident_id === res.id) return true;
          if (fam.father_name && fam.father_name.trim().toLowerCase() === cleanResName) return true;
          if (fam.mother_name && fam.mother_name.trim().toLowerCase() === cleanResName) return true;

          // Check inside members_detail list
          let members: any[] = [];
          if (Array.isArray(fam.members_detail)) {
            members = fam.members_detail;
          } else if (typeof fam.members_detail === "string") {
            try { members = JSON.parse(fam.members_detail); } catch (e) {}
          }

          return members.some((m: any) => m.full_name && m.full_name.trim().toLowerCase() === cleanResName);
        });

        if (matchedFam?.family_number) {
          linkedFamilyNumber = matchedFam.family_number;
        }
      }
    } catch (err) {
      console.warn("Failed to query family_data for family_number link:", err);
    }

    setForm(prev => ({
      ...prev,
      resident_id: res.id,
      family_number: linkedFamilyNumber || prev.family_number,
      patient_last_name: res.last_name || last || prev.patient_last_name,
      patient_first_name: res.first_name || first || prev.patient_first_name,
      patient_middle_name: res.middle_name || middle || prev.patient_middle_name,
      age: computedAge || prev.age,
      sitio: res.sitio || prev.sitio,
    }));
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleRiskFactor = (factor: string) => {
    setForm(prev => {
      const exists = prev.risk_factors.includes(factor);
      if (exists) {
        return { ...prev, risk_factors: prev.risk_factors.filter(f => f !== factor) };
      } else {
        return { ...prev, risk_factors: [...prev.risk_factors, factor] };
      }
    });
  };

  // Prenatal Visits Handlers
  const handleAddVisit = () => {
    const newVisitNum = String(form.prenatal_visits.length + 1);
    const newVisit: PrenatalVisit = {
      id: `visit-${Date.now()}`,
      visit_date: new Date().toISOString().split("T")[0],
      visit_number: newVisitNum,
      aog: "",
      blood_pressure: "",
      weight: "",
      fundic_height: "",
      fhr: "",
      fhr_location: "",
      presentation: "",
      notes: "",
    };
    setForm(prev => ({ ...prev, prenatal_visits: [...prev.prenatal_visits, newVisit] }));
  };

  const handleUpdateVisit = (index: number, field: keyof PrenatalVisit, value: string) => {
    setForm(prev => {
      const updated = [...prev.prenatal_visits];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, prenatal_visits: updated };
    });
  };

  const handleRemoveVisit = (index: number) => {
    setForm(prev => {
      const updated = [...prev.prenatal_visits];
      updated.splice(index, 1);
      return { ...prev, prenatal_visits: updated };
    });
  };

  const handleResetForm = () => {
    setForm({
      resident_id: "",
      family_number: "",
      patient_last_name: "",
      patient_first_name: "",
      patient_middle_name: "",
      age: "",
      sitio: "Subukin",
      edc: "",
      lmp: "",
      obstetric_score: "",
      fpal: "",
      end_1st_trim: "",
      end_2nd_trim: "",
      end_3rd_trim: "",
      end_postpartum: "",
      period: "",
      patient_height: "",
      blood_type: "Unspecified",
      risk_factors: [],
      prenatal_visits: [],
    });
    setEditRecordId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${form.patient_last_name}, ${form.patient_first_name} ${form.patient_middle_name}`.trim();
    const cleanName = fullName.replace(/^,\s*/, "").replace(/\s+,/, "").trim();

    if (!cleanName && !form.resident_id) {
      toast.error("Please select or enter the patient's name.");
      return;
    }

    setSaving(true);

    try {
      // Ensure resident exists in DB
      let targetResidentId = form.resident_id || null;
      if (!targetResidentId && cleanName) {
        targetResidentId = await ensureResidentExists({
          fullName: cleanName,
          sitio: form.sitio,
          gender: "Female",
          age: form.age,
          familyNumber: form.family_number,
        });
      }

      // Generate checkup date & remarks summary
      const latestVisit = form.prenatal_visits[form.prenatal_visits.length - 1];
      const checkupDate = latestVisit?.visit_date || new Date().toISOString().split("T")[0];

      let remarksText = "";
      if (latestVisit?.notes) {
        remarksText += latestVisit.notes + " ";
      }
      if (form.risk_factors.length > 0) {
        remarksText += `[Risk Factors: ${form.risk_factors.join(", ")}]`;
      }
      if (!remarksText.trim()) {
        remarksText = `EDC: ${form.edc || "N/A"}, Obstetric: ${form.obstetric_score || "N/A"}`;
      }

      const payload = {
        resident_id: targetResidentId,
        family_number: form.family_number,
        patient_name: cleanName,
        patient_last_name: form.patient_last_name,
        patient_first_name: form.patient_first_name,
        patient_middle_name: form.patient_middle_name,
        age: form.age,
        sitio: form.sitio,
        edc: form.edc,
        lmp: form.lmp,
        obstetric_score: form.obstetric_score,
        fpal: form.fpal,
        end_1st_trim: form.end_1st_trim,
        end_2nd_trim: form.end_2nd_trim,
        end_3rd_trim: form.end_3rd_trim,
        end_postpartum: form.end_postpartum,
        period: form.period,
        patient_height: form.patient_height,
        blood_type: form.blood_type,
        risk_factors: JSON.stringify(form.risk_factors),
        prenatal_visits: JSON.stringify(form.prenatal_visits),
        checkup_date: checkupDate,
        remarks: remarksText.trim(),
      };

      if (editRecordId) {
        const { error } = await supabase
          .from("maternal_care" as any)
          .update(payload as any)
          .eq("id", editRecordId);

        if (error) {
          toast.error("Failed to update record.");
        } else {
          toast.success("Maternal Care record updated successfully.");
          logActivity("update_maternal_care", {
            entity_type: "maternal_care",
            description: `Updated Maternal Care Data for: ${cleanName}`,
          });
          handleResetForm();
          fetchSavedRecords();
        }
      } else {
        const { error } = await supabase
          .from("maternal_care" as any)
          .insert(payload as any);

        if (error) {
          toast.error("Failed to save record.");
        } else {
          toast.success("Maternal Care record saved successfully.");
          logActivity("submit_maternal_care", {
            entity_type: "maternal_care",
            description: `Saved new Maternal Care Data for: ${cleanName}`,
          });
          handleResetForm();
          fetchSavedRecords();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: MaternalCareRecord) => {
    let parsedRisks: string[] = [];
    if (Array.isArray(record.risk_factors)) {
      parsedRisks = record.risk_factors;
    } else if (typeof record.risk_factors === "string") {
      try { parsedRisks = JSON.parse(record.risk_factors); } catch (e) {}
    }

    let parsedVisits: PrenatalVisit[] = [];
    if (Array.isArray(record.prenatal_visits)) {
      parsedVisits = record.prenatal_visits;
    } else if (typeof record.prenatal_visits === "string") {
      try { parsedVisits = JSON.parse(record.prenatal_visits); } catch (e) {}
    }

    const { last, first, middle } = parseNameParts(record.patient_name || "");

    setForm({
      resident_id: record.resident_id || "",
      family_number: record.family_number || "",
      patient_last_name: record.patient_last_name || last,
      patient_first_name: record.patient_first_name || first,
      patient_middle_name: record.patient_middle_name || middle,
      age: record.age ? String(record.age) : "",
      sitio: record.sitio || "Subukin",
      edc: record.edc || "",
      lmp: record.lmp || "",
      obstetric_score: record.obstetric_score || "",
      fpal: record.fpal || "",
      end_1st_trim: record.end_1st_trim || "",
      end_2nd_trim: record.end_2nd_trim || "",
      end_3rd_trim: record.end_3rd_trim || "",
      end_postpartum: record.end_postpartum || "",
      period: record.period || "",
      patient_height: record.patient_height || "",
      blood_type: record.blood_type || "Unspecified",
      risk_factors: parsedRisks,
      prenatal_visits: parsedVisits,
    });

    setEditRecordId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (recordId: string) => {
    const { error } = await supabase
      .from("maternal_care" as any)
      .delete()
      .eq("id", recordId);

    if (error) {
      toast.error("Failed to delete record.");
    } else {
      toast.success("Record deleted successfully.");
      logActivity("delete_maternal_care", {
        entity_type: "maternal_care",
        description: `Deleted Maternal Care record ID: ${recordId}`,
      });
      fetchSavedRecords();
    }
    setDeleteConfirmId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter saved records
  const filteredRecords = savedRecords.filter(r => {
    const matchesSearch = 
      !searchQuery.trim() ||
      (r.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.family_number || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSitio = 
      selectedSitioFilter === "all" ||
      (r.sitio || "").toLowerCase() === selectedSitioFilter.toLowerCase();

    return matchesSearch && matchesSitio;
  });

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
          #maternal-print-area, #maternal-print-area * {
            visibility: visible !important;
          }
          #maternal-print-area {
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

          /* Hide all placeholders and guide text when printing */
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

          /* Hide default Chrome date picker mm/dd/yyyy when empty */
          input[type="date"]:invalid::-webkit-datetime-edit,
          input[type="date"]:not([value])::-webkit-datetime-edit,
          input[type="date"][value=""]::-webkit-datetime-edit,
          .empty-date::-webkit-datetime-edit {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }

          /* Force empty inputs with placeholders to hide placeholder text on print */
          input:placeholder-shown {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }

          /* Clean input rendering for print */
          input, textarea, select {
            background-color: transparent !important;
            box-shadow: none !important;
          /* Fit printout cleanly onto portrait sheet */
          .header-border {
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
            gap: 16px !important;
          }
          .header-border img {
            height: 75px !important;
            max-height: 75px !important;
          }
          #maternal-print-area .p-6,
          #maternal-print-area .md\:p-8,
          #maternal-print-area .p-4,
          #maternal-print-area .md\:p-5 {
            padding: 8px !important;
          }
          #maternal-print-area form > * + * {
            margin-top: 8px !important;
          }
          #maternal-print-area label,
          #maternal-print-area input,
          #maternal-print-area select,
          #maternal-print-area textarea,
          #maternal-print-area span,
          #maternal-print-area h3 {
            font-size: 11px !important;
          }
          #maternal-print-area table th,
          #maternal-print-area table td {
            padding: 2px 4px !important;
            font-size: 10px !important;
          }

          @page {
            size: A4 portrait;
            margin: 4mm;
          }
        }
      `}</style>

      {/* Main Card Container */}
      <Card id="maternal-print-area" className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          
          {/* Header Seal Layout - Visible ONLY when printing */}
          <div className="print-only flex items-center justify-center gap-8 md:gap-12 border-b-[4px] border-double border-slate-900 pb-4 header-border" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Subukin Logo" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          {/* Header Bar with Barangay Subukin note & Action Toolbar (Hidden when printing) */}
          <div className="flex items-center justify-between gap-2 no-print pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              BRGY: <strong className="text-foreground">SUBUKIN</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleResetForm} 
                className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-medium shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs border-primary/20 text-primary hover:bg-primary/10">
                <Printer className="h-3.5 w-3.5" /> Print Form
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Patient General Details Grid */}
            <div className="space-y-4 bg-muted/20 p-4 md:p-5 rounded-lg border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" /> Patient General Information
                </h3>
                <div className="flex items-center gap-2 no-print w-full md:w-72">
                  <Label className="text-xs shrink-0 font-medium">Select Resident:</Label>
                  <Select value={form.resident_id} onValueChange={handleSelectResident}>
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

              {/* Patient Fields Layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Family Number (FN)</Label>
                  <Input 
                    type="text" 
                    value={form.family_number} 
                    onChange={e => handleFormChange("family_number", e.target.value)} 
                    placeholder="e.g. FN-512A" 
                    className={lineInputClass}
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Patient's Last Name *</Label>
                  <Input 
                    type="text" 
                    value={form.patient_last_name} 
                    onChange={e => handleFormChange("patient_last_name", e.target.value)} 
                    placeholder="Apelyido" 
                    className={lineInputClass}
                    required
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">First Name *</Label>
                  <Input 
                    type="text" 
                    value={form.patient_first_name} 
                    onChange={e => handleFormChange("patient_first_name", e.target.value)} 
                    placeholder="Pangalan" 
                    className={lineInputClass}
                    required
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Middle Initial / Name</Label>
                  <Input 
                    type="text" 
                    value={form.patient_middle_name} 
                    onChange={e => handleFormChange("patient_middle_name", e.target.value)} 
                    placeholder="Gitnang Apelyido" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Age</Label>
                  <Input 
                    type="number" 
                    value={form.age} 
                    onChange={e => handleFormChange("age", e.target.value)} 
                    placeholder="Edad" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Sitio / Address</Label>
                  <Select value={form.sitio} onValueChange={v => handleFormChange("sitio", v)}>
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
                  <Label className="text-xs font-semibold text-muted-foreground">EDC (Expected Date of Confinement)</Label>
                  <Input 
                    type="date" 
                    value={form.edc} 
                    onChange={e => handleFormChange("edc", e.target.value)} 
                    className={`${lineInputClass} ${!form.edc ? "empty-date" : ""}`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">LMP (Last Menstrual Period)</Label>
                  <Input 
                    type="date" 
                    value={form.lmp} 
                    onChange={e => handleFormChange("lmp", e.target.value)} 
                    className={`${lineInputClass} ${!form.lmp ? "empty-date" : ""}`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Obstetric Score (G / P)</Label>
                  <Input 
                    type="text" 
                    value={form.obstetric_score} 
                    onChange={e => handleFormChange("obstetric_score", e.target.value)} 
                    placeholder="e.g. G2/P2" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">FPAL Score (F - P - A - L)</Label>
                  <Input 
                    type="text" 
                    value={form.fpal} 
                    onChange={e => handleFormChange("fpal", e.target.value)} 
                    placeholder="e.g. 1-0-0-1" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Patient Height (cm)</Label>
                  <Input 
                    type="text" 
                    value={form.patient_height} 
                    onChange={e => handleFormChange("patient_height", e.target.value)} 
                    placeholder="e.g. 148 cm" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Blood Type</Label>
                  <Select value={form.blood_type} onValueChange={v => handleFormChange("blood_type", v)}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${form.blood_type === "Unspecified" ? "print:text-transparent" : ""}`}>
                      <SelectValue placeholder="Blood Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Unspecified", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bt => (
                        <SelectItem key={bt} value={bt} className="text-xs">{bt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trimester Milestone Dates */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs pt-2 border-t border-border/40">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">End of 1st Trim:</Label>
                  <Input type="text" value={form.end_1st_trim} onChange={e => handleFormChange("end_1st_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">End of 2nd Trim:</Label>
                  <Input type="text" value={form.end_2nd_trim} onChange={e => handleFormChange("end_2nd_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">End of 3rd Trim:</Label>
                  <Input type="text" value={form.end_3rd_trim} onChange={e => handleFormChange("end_3rd_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">End of Postpartum:</Label>
                  <Input type="text" value={form.end_postpartum} onChange={e => handleFormChange("end_postpartum", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Period:</Label>
                  <Input type="text" value={form.period} onChange={e => handleFormChange("period", e.target.value)} placeholder="Period" className={lineInputClass} />
                </div>
              </div>
            </div>

            {/* RISK FACTORS CHECKLIST SECTION */}
            <div className="space-y-3 bg-card p-4 md:p-5 rounded-lg border border-border/80 shadow-xs">
              <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-heading">
                  <AlertTriangle className="h-4 w-4" /> RISK FACTORS
                </h3>
                <span className="text-xs text-muted-foreground no-print">
                  {form.risk_factors.length} selected
                </span>
              </div>

              {/* 3 Column Grid for Risk Factors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-1">
                
                {/* Column 1 */}
                <div className="space-y-2.5">
                  {RISK_FACTORS_COLUMN_1.map(factor => {
                    const isSelected = form.risk_factors.includes(factor);
                    return (
                      <div 
                        key={factor} 
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-foreground transition-colors group select-none py-0.5" 
                        onClick={() => toggleRiskFactor(factor)}
                      >
                        <div 
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-rose-600 border-rose-600 text-white font-bold shadow-xs" 
                              : "bg-background group-hover:border-rose-500"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={cn("text-xs leading-tight cursor-pointer font-medium select-none", isSelected ? "text-foreground font-semibold" : "text-muted-foreground")}>
                          {factor}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Column 2 */}
                <div className="space-y-2.5">
                  {RISK_FACTORS_COLUMN_2.map(factor => {
                    const isSelected = form.risk_factors.includes(factor);
                    return (
                      <div 
                        key={factor} 
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-foreground transition-colors group select-none py-0.5" 
                        onClick={() => toggleRiskFactor(factor)}
                      >
                        <div 
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-rose-600 border-rose-600 text-white font-bold shadow-xs" 
                              : "bg-background group-hover:border-rose-500"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={cn("text-xs leading-tight cursor-pointer font-medium select-none", isSelected ? "text-foreground font-semibold" : "text-muted-foreground")}>
                          {factor}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Column 3 */}
                <div className="space-y-2.5">
                  {RISK_FACTORS_COLUMN_3.map(factor => {
                    const isSelected = form.risk_factors.includes(factor);
                    return (
                      <div 
                        key={factor} 
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-foreground transition-colors group select-none py-0.5" 
                        onClick={() => toggleRiskFactor(factor)}
                      >
                        <div 
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-400 dark:border-slate-500 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-rose-600 border-rose-600 text-white font-bold shadow-xs" 
                              : "bg-background group-hover:border-rose-500"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={cn("text-xs leading-tight cursor-pointer font-medium select-none", isSelected ? "text-foreground font-semibold" : "text-muted-foreground")}>
                          {factor}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PRENATAL VISITS SECTION */}
            <div className="space-y-4 bg-muted/20 p-4 md:p-5 rounded-lg border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 font-heading">
                    <CalendarIcon className="h-4 w-4" /> PRENATAL VISITS
                  </h3>
                  <p className="text-[11px] text-muted-foreground no-print">Record prenatal checkup dates, vital signs, AOG, and notes.</p>
                </div>
                <Button type="button" onClick={handleAddVisit} size="sm" className="gap-1 text-xs no-print bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  <Plus className="h-3.5 w-3.5" /> Add Prenatal Visit
                </Button>
              </div>

              {form.prenatal_visits.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic bg-background/50 rounded-md border border-dashed border-border/80 no-print">
                  No prenatal visit entries added yet. Click "+ Add Prenatal Visit" to record checkups.
                </div>
              ) : (
                <div className="space-y-4">
                  {form.prenatal_visits.map((visit, index) => (
                    <div key={visit.id} className="p-3 bg-card border border-border/70 rounded-md space-y-3 relative group">
                      <div className="flex items-center justify-between border-b pb-1 text-xs">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          Prenatal Visit #{index + 1}
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveVisit(index)} 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive no-print"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Prenatal Visit Date</Label>
                          <Input 
                            type="date" 
                            value={visit.visit_date} 
                            onChange={e => handleUpdateVisit(index, "visit_date", e.target.value)} 
                            className={`${lineInputClass} ${!visit.visit_date ? "empty-date" : ""}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Prenatal Visit #</Label>
                          <Input 
                            type="text" 
                            value={visit.visit_number} 
                            onChange={e => handleUpdateVisit(index, "visit_number", e.target.value)} 
                            placeholder="e.g. 1" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">AOG (Age of Gestation)</Label>
                          <Input 
                            type="text" 
                            value={visit.aog} 
                            onChange={e => handleUpdateVisit(index, "aog", e.target.value)} 
                            placeholder="e.g. 13 weeks 1 day" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Blood Pressure (BP)</Label>
                          <Input 
                            type="text" 
                            value={visit.blood_pressure} 
                            onChange={e => handleUpdateVisit(index, "blood_pressure", e.target.value)} 
                            placeholder="e.g. 90/60" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Weight (kg)</Label>
                          <Input 
                            type="text" 
                            value={visit.weight} 
                            onChange={e => handleUpdateVisit(index, "weight", e.target.value)} 
                            placeholder="e.g. 35.5 kg" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Fundic Height (cm)</Label>
                          <Input 
                            type="text" 
                            value={visit.fundic_height} 
                            onChange={e => handleUpdateVisit(index, "fundic_height", e.target.value)} 
                            placeholder="Fundic height" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">FHR (Fetal Heart Rate)</Label>
                          <Input 
                            type="text" 
                            value={visit.fhr} 
                            onChange={e => handleUpdateVisit(index, "fhr", e.target.value)} 
                            placeholder="FHR" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Presentation</Label>
                          <Input 
                            type="text" 
                            value={visit.presentation} 
                            onChange={e => handleUpdateVisit(index, "presentation", e.target.value)} 
                            placeholder="Presentation" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="col-span-2 md:col-span-4 space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Notes / Remarks</Label>
                          <Input 
                            type="text" 
                            value={visit.notes} 
                            onChange={e => handleUpdateVisit(index, "notes", e.target.value)} 
                            placeholder="e.g. BMI: 16.2 (S), Ideal weight: 47.6 kg, Vitamin prescription..." 
                            className={lineInputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 no-print pt-2 border-t">
              {editRecordId && (
                <Button type="button" variant="outline" onClick={handleResetForm} className="text-xs">
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : editRecordId ? "Update Record" : "Save Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SAVED MATERNAL CARE RECORDS TABLE HISTORY */}
      <Card className="border border-border/50 shadow-md bg-card text-card-foreground no-print">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 font-heading">
                <FileText className="h-5 w-5 text-primary" /> Saved Maternal Care Data History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage and view registered Maternal Care records in Barangay Subukin.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search name or FN..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={selectedSitioFilter} onValueChange={setSelectedSitioFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Sitio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sitios</SelectItem>
                  {sitioOptions.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Loading records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">No maternal care records found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  <th className="p-3">Family # (FN)</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Sitio</th>
                  <th className="p-3">EDC</th>
                  <th className="p-3">Obstetric / FPAL</th>
                  <th className="p-3">Remarks / Risk Summary</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-primary">{rec.family_number || "—"}</td>
                    <td className="p-3 font-medium text-foreground">{rec.patient_name || "—"}</td>
                    <td className="p-3">{rec.age || "—"}</td>
                    <td className="p-3">{rec.sitio || "Subukin"}</td>
                    <td className="p-3">{rec.edc || "—"}</td>
                    <td className="p-3">
                      {rec.obstetric_score || "—"} {rec.fpal ? `(${rec.fpal})` : ""}
                    </td>
                    <td className="p-3 max-w-xs truncate text-muted-foreground">{rec.remarks || "—"}</td>
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
                        onClick={() => handleEdit(rec)} 
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
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

      {/* VIEW / PRINT RECORD DETAIL DIALOG */}
      <Dialog open={viewRecordModalOpen} onOpenChange={setViewRecordModalOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" /> Maternal Care Data Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Barangay Subukin – Official Maternal Record Details
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForView && (
            <div className="space-y-4 text-xs py-2 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md border">
                <div><strong>FN:</strong> {selectedRecordForView.family_number || "—"}</div>
                <div className="col-span-2"><strong>Patient Name:</strong> {selectedRecordForView.patient_name || "—"}</div>
                <div><strong>Age:</strong> {selectedRecordForView.age || "—"}</div>
                <div><strong>Sitio:</strong> {selectedRecordForView.sitio || "—"}</div>
                <div><strong>EDC:</strong> {selectedRecordForView.edc || "—"}</div>
                <div><strong>LMP:</strong> {selectedRecordForView.lmp || "—"}</div>
                <div><strong>G/P Score:</strong> {selectedRecordForView.obstetric_score || "—"}</div>
                <div><strong>FPAL:</strong> {selectedRecordForView.fpal || "—"}</div>
                <div><strong>Height:</strong> {selectedRecordForView.patient_height || "—"}</div>
                <div><strong>Blood Type:</strong> {selectedRecordForView.blood_type || "—"}</div>
              </div>

              {/* Risk Factors */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Risk Factors Assessed:</h4>
                {(() => {
                  let risks: string[] = [];
                  if (Array.isArray(selectedRecordForView.risk_factors)) risks = selectedRecordForView.risk_factors;
                  else if (typeof selectedRecordForView.risk_factors === "string") {
                    try { risks = JSON.parse(selectedRecordForView.risk_factors); } catch (e) {}
                  }

                  if (risks.length === 0) return <p className="text-slate-500 italic">No risk factors checked.</p>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {risks.map(rf => (
                        <span key={rf} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          {rf}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Prenatal Visits */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Prenatal Visits:</h4>
                {(() => {
                  let visits: PrenatalVisit[] = [];
                  if (Array.isArray(selectedRecordForView.prenatal_visits)) visits = selectedRecordForView.prenatal_visits;
                  else if (typeof selectedRecordForView.prenatal_visits === "string") {
                    try { visits = JSON.parse(selectedRecordForView.prenatal_visits); } catch (e) {}
                  }

                  if (visits.length === 0) return <p className="text-slate-500 italic">No prenatal visits recorded.</p>;
                  return (
                    <table className="w-full text-left text-[11px] border border-slate-200 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b">
                          <th className="p-1.5">Date</th>
                          <th className="p-1.5">Visit #</th>
                          <th className="p-1.5">AOG</th>
                          <th className="p-1.5">BP</th>
                          <th className="p-1.5">Weight</th>
                          <th className="p-1.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((v, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-1.5">{v.visit_date}</td>
                            <td className="p-1.5">{v.visit_number || i + 1}</td>
                            <td className="p-1.5">{v.aog || "—"}</td>
                            <td className="p-1.5">{v.blood_pressure || "—"}</td>
                            <td className="p-1.5">{v.weight || "—"}</td>
                            <td className="p-1.5">{v.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setViewRecordModalOpen(false)}>
              Close
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                setViewRecordModalOpen(false);
                if (selectedRecordForView) handleEdit(selectedRecordForView);
              }} 
              className="bg-primary text-white"
            >
              Edit Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Maternal Care Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete this maternal care record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} 
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

export default MaternalCareForm;
