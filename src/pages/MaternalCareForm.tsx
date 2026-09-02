import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  History,
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
import { OfficialHeader } from "@/components/OfficialHeader";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";
import { allowOnlyLetters, allowOnlyNumbers, sanitizeLetters, sanitizeNumbers } from "@/lib/inputValidation";
import { useAuth } from "@/contexts/AuthContext";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";

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
  id?: string;
  visit_date?: string;
  visit_number?: string;
  aog?: string;
  aog_weeks?: string;
  blood_pressure?: string;
  bp?: string;
  weight?: string;
  weight_kg?: string;
  fundic_height?: string;
  fundic_height_cm?: string;
  fhr?: string;
  fhb_bpm?: string;
  fhr_location?: string;
  presentation?: string;
  notes?: string;
  findings?: string;
  remarks?: string;
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
  const { userRole } = useAuth();
  const isMidwife = userRole === "midwife";
  const { t, language } = useSettings();
  const [residents, setResidents] = useState<any[]>([]);
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);
  const [savedRecords, setSavedRecords] = useState<MaternalCareRecord[]>([]);
  const [activeView, setActiveView] = useState<"form" | "history">("form");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filter for History list
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSitioFilter, setSelectedSitioFilter] = useState("all");

  // Edit State
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  // View / Print Modal State
  const [viewRecordModalOpen, setViewRecordModalOpen] = useState(false);
  const [selectedRecordForView, setSelectedRecordForView] = useState<MaternalCareRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Main Form State
  const [form, setForm] = useState({
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

    window.addEventListener("resident-records-updated", fetchResidents);
    window.addEventListener("family-data-updated", fetchResidents);
    window.addEventListener("bhw-db-updated", fetchResidents);
    return () => {
      window.removeEventListener("resident-records-updated", fetchResidents);
      window.removeEventListener("family-data-updated", fetchResidents);
      window.removeEventListener("bhw-db-updated", fetchResidents);
    };
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
    if (isMidwife) return;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleRiskFactor = (factor: string) => {
    if (isMidwife) return;
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
    if (isMidwife) return;
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
    if (isMidwife) return;
    setForm(prev => {
      const updated = [...prev.prenatal_visits];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, prenatal_visits: updated };
    });
  };

  const handleRemoveVisit = (index: number) => {
    if (isMidwife) return;
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
      prenatal_visits: [
        { id: `visit-${Date.now()}`, visit_date: "", visit_number: "1", aog: "", blood_pressure: "", weight: "", fundic_height: "", fhr: "", fhr_location: "", presentation: "", notes: "" }
      ]
    });
    setEditRecordId(null);
    setResetConfirmOpen(false);
    toast.info("Maternal care form reset to blank.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMidwife) {
      toast.error("View-only access: Midwife cannot save records.");
      return;
    }
    const fullName = `${form.patient_last_name}, ${form.patient_first_name} ${form.patient_middle_name}`.trim();
    const cleanName = fullName.replace(/^,\s*/, "").replace(/\s+,/, "").trim();

    if (!cleanName && !form.resident_id) {
      toast.error("Please select or enter the patient's name.");
      return;
    }

    if (!form.age || !String(form.age).trim()) {
      toast.error("Essential resident info missing: Please provide patient's age.");
      return;
    }

    if (!form.sitio || !form.sitio.trim()) {
      toast.error("Essential resident info missing: Please provide Address/Sitio.");
      return;
    }

    const hasHealthDetails = Boolean(
      form.edc?.trim() ||
      form.lmp?.trim() ||
      form.obstetric_score?.trim() ||
      form.fpal?.trim() ||
      form.patient_height?.trim() ||
      (form.blood_type && form.blood_type !== "Unspecified") ||
      (form.risk_factors && form.risk_factors.length > 0) ||
      (form.prenatal_visits && form.prenatal_visits.length > 0 && form.prenatal_visits.some(v => v.visit_date || v.weight || v.blood_pressure || v.fundic_height || v.fhr || v.notes)) ||
      form.end_1st_trim?.trim() ||
      form.end_2nd_trim?.trim() ||
      form.end_3rd_trim?.trim() ||
      form.end_postpartum?.trim() ||
      form.period?.trim()
    );

    if (!hasHealthDetails) {
      toast.error("Health details missing: Please record at least one maternal health metric, EDC/LMP, vital sign, or prenatal visit.");
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
    if (isMidwife) return;
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
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (recordId: string) => {
    if (isMidwife) {
      toast.error("View-only access: Midwife cannot delete records.");
      return;
    }
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

  const handlePrintModal = () => {
    document.body.classList.add("printing-modal");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-modal");
    }, 1000);
  };

  const handlePrintHistory = () => {
    document.body.classList.add("printing-history");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-history");
    }, 1000);
  };

  // Filter saved records
  const filteredRecords = savedRecords.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const createdDate = r.created_at ? new Date(r.created_at).toLocaleDateString() : "";
    const matchesSearch = 
      !q ||
      (r.patient_name || "").toLowerCase().includes(q) ||
      (r.family_number || "").toLowerCase().includes(q) ||
      (r.sitio || "").toLowerCase().includes(q) ||
      (r.edc || "").toLowerCase().includes(q) ||
      (r.lmp || "").toLowerCase().includes(q) ||
      (r.remarks || "").toLowerCase().includes(q) ||
      createdDate.includes(q);

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

          /* Single Form Print */
          body:not(.printing-modal):not(.printing-history) #maternal-print-area,
          body:not(.printing-modal):not(.printing-history) #maternal-print-area * {
            visibility: visible !important;
          }
          body:not(.printing-modal):not(.printing-history) #maternal-print-area .no-print,
          body:not(.printing-modal):not(.printing-history) #maternal-print-area .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          body:not(.printing-modal):not(.printing-history) #maternal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: #000000 !important;
          }

          /* History Table Print */
          body.printing-history #maternal-history-print-area,
          body.printing-history #maternal-history-print-area * {
            visibility: visible !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          body.printing-history #maternal-history-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px 15px !important;
            margin: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          body.printing-history #maternal-history-print-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          body.printing-history #maternal-history-print-area th,
          body.printing-history #maternal-history-print-area td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 10px !important;
            color: #000000 !important;
          }
          body.printing-history #maternal-history-print-area th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }

          /* Modal Print */
          body.printing-modal #maternal-modal-printable,
          body.printing-modal #maternal-modal-printable * {
            visibility: visible !important;
            color: #000000 !important;
          }
          body.printing-modal [role="dialog"],
          body.printing-modal [data-radix-portal] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            background: #ffffff !important;
          }
          body.printing-modal #maternal-modal-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 15px !important;
            margin: 0 !important;
          }

          html, body {
            height: 100% !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
          }
          .print-signatures,
          .print-footer-signatures {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner Header matching Dashboard */}
      <PageHeaderBanner
        icon={Heart}
        badge={language === "tl" ? "Talaan ng Pangangalaga sa Ina" : "Maternal Care Record"}
        title={t("nav.maternalCare")}
        description={language === "tl" ? "Komprehensibong pagsubaybay sa prenatal checkup, milestones sa obstetrics (FPAL), at pagtatasa ng panganib sa pagbubuntis." : "Comprehensive prenatal checkup tracking, obstetric milestones (FPAL), EDC/LMP calculation, and pregnancy risk factor assessment for mothers of Barangay Subukin."}
        rightContent={
          <div className="flex items-center gap-1.5 p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("form")}
              className={`h-8 px-4 text-xs font-bold rounded-lg transition-all ${
                activeView === "form"
                  ? "bg-white text-slate-900 shadow-md font-extrabold hover:bg-white"
                  : "text-white/90 hover:text-white hover:bg-white/15"
              }`}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Form
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("history")}
              className={`h-8 px-4 text-xs font-bold rounded-lg transition-all ${
                activeView === "history"
                  ? "bg-white text-slate-900 shadow-md font-extrabold hover:bg-white"
                  : "text-white/90 hover:text-white hover:bg-white/15"
              }`}
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              History
            </Button>
          </div>
        }
      />

      {isMidwife && <ReadOnlyBanner />}

      {/* Main Card Container (Form View) */}
      {activeView === "form" && (
        <Card id="maternal-print-area" className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          
          {/* ========================================================================= */}
          {/* OFFICIAL FORMAL PRINTABLE MATERNAL CARE RECORD (VISIBLE ONLY WHEN PRINTING) */}
          {/* ========================================================================= */}
          <div className="print-only w-full font-sans text-black" style={{ display: "none", width: "100%", color: "#000000", fontFamily: "Arial, sans-serif" }}>
            {/* Official Header Seal */}
            <OfficialHeader
              title="Official Maternal Care & Prenatal Health Record"
              subtitle="Barangay Subukin Health Center • San Juan, Batangas"
              showDoubleBorder={true}
              logoHeight="85px"
            />

            {/* Document Metadata Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "8px", fontSize: "10px", fontWeight: "bold" }}>
              <span>OFFICIAL PATIENT HEALTH RECORD • BARANGAY SUBUKIN HEALTH REGISTRY</span>
              <span>DATE PRINTED: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>

            {/* SECTION 1: PATIENT IDENTIFICATION & OBSTETRIC PROFILE */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "3px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                I. Patient Demographic &amp; Obstetrical Profile
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1px solid #000" }}>
                <tbody>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left", width: "18%" }}>Patient Full Name:</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", fontSize: "11px", width: "32%" }}>
                      {[form.patient_last_name, form.patient_first_name, form.patient_middle_name].filter(Boolean).join(", ") || (form.resident_id ? residents.find(r => r.id === form.resident_id)?.full_name : "—") || "—"}
                    </td>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left", width: "18%" }}>Family Number (FN):</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", width: "32%" }}>
                      {form.family_number || "—"}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Age:</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{form.age ? `${form.age} years old` : "—"}</td>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Sitio / Address:</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{form.sitio ? `${form.sitio}, Subukin, San Juan, Batangas` : "Subukin, San Juan, Batangas"}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Obstetric Score (G/P):</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{form.obstetric_score || "—"}</td>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>FPAL Score (F-P-A-L):</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{form.fpal || "—"}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>LMP (Last Menstrual Period):</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{form.lmp || "—"}</td>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>EDC (Expected Date):</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{form.edc || "—"}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Patient Height:</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{form.patient_height ? `${form.patient_height} cm` : "—"}</td>
                    <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Blood Type:</th>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{form.blood_type || "Unspecified"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Trimester Milestones Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", border: "1px solid #000", borderTop: "none" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 1st Trimester</th>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 2nd Trimester</th>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 3rd Trimester</th>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of Postpartum / Period</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{form.end_1st_trim || "—"}</td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{form.end_2nd_trim || "—"}</td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{form.end_3rd_trim || "—"}</td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>
                      {form.end_postpartum || "—"}{form.period ? ` (${form.period})` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 2: PRENATAL CHECKUP & CLINICAL VISITS LEDGER */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "3px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                II. Prenatal Clinical Visits &amp; Progress Monitoring Ledger
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "45px" }}>Visit #</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "80px" }}>Date of Visit</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "55px" }}>AOG</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "65px" }}>BP</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "65px" }}>Weight (kg)</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "70px" }}>Fundic Ht (cm)</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "70px" }}>FHR (bpm)</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "85px" }}>Presentation</th>
                    <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "left" }}>Clinical Findings / Treatment / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {form.prenatal_visits.length > 0 ? (
                    form.prenatal_visits.map((v, i) => (
                      <tr key={i}>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", fontWeight: "bold" }}>{v.visit_number || i + 1}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.visit_date || "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.aog || v.aog_weeks || "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", fontWeight: "600" }}>{v.blood_pressure || v.bp || "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.weight || v.weight_kg ? `${v.weight || v.weight_kg} kg` : "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.fundic_height || v.fundic_height_cm ? `${v.fundic_height || v.fundic_height_cm} cm` : "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.fhr || v.fhb_bpm ? `${v.fhr || v.fhb_bpm} bpm` : "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.presentation || "—"}</td>
                        <td style={{ border: "1px solid #000", padding: "4px 5px" }}>{v.notes || v.findings || v.remarks || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    [1, 2, 3, 4].map((num) => (
                      <tr key={num}>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center", color: "#64748b" }}>{num}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                        <td style={{ border: "1px solid #000", padding: "6px 5px" }}></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION 3: MATERNAL CLINICAL RISK FACTORS EVALUATION */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "3px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                III. Maternal Risk Factors Clinical Assessment Matrix
              </div>
              
              {/* Summary of Active Risks */}
              <div style={{ border: "1px solid #000", borderBottom: "none", padding: "4px 8px", background: form.risk_factors.length > 0 ? "#fff1f2" : "#f0fdf4", fontSize: "9.5px" }}>
                <strong>Identified Clinical Risks: </strong>
                {form.risk_factors.length > 0 ? (
                  <span style={{ color: "#b91c1c", fontWeight: "bold" }}>
                    {form.risk_factors.join(" • ")}
                  </span>
                ) : (
                  <span style={{ color: "#15803d", fontWeight: "bold" }}>
                    ✓ No High-Risk Clinical Factors Identified (Low-Risk Pregnancy Status)
                  </span>
                )}
              </div>

              {/* Full 3-Column Risk Factors Checklist Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5px", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "34%" }}>Risk Factors (Group 1)</th>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "33%" }}>Risk Factors (Group 2)</th>
                    <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "33%" }}>Risk Factors (Group 3)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(RISK_FACTORS_COLUMN_1.length, RISK_FACTORS_COLUMN_2.length, RISK_FACTORS_COLUMN_3.length) }).map((_, rIdx) => {
                    const rf1 = RISK_FACTORS_COLUMN_1[rIdx];
                    const rf2 = RISK_FACTORS_COLUMN_2[rIdx];
                    const rf3 = RISK_FACTORS_COLUMN_3[rIdx];

                    const isChecked1 = rf1 ? form.risk_factors.includes(rf1) : false;
                    const isChecked2 = rf2 ? form.risk_factors.includes(rf2) : false;
                    const isChecked3 = rf3 ? form.risk_factors.includes(rf3) : false;

                    return (
                      <tr key={rIdx}>
                        <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked1 ? "#fee2e2" : "transparent" }}>
                          {rf1 ? (
                            <span style={{ fontWeight: isChecked1 ? "bold" : "normal" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked1 ? "[✓] " : "[  ] "}</span>
                              {rf1}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked2 ? "#fee2e2" : "transparent" }}>
                          {rf2 ? (
                            <span style={{ fontWeight: isChecked2 ? "bold" : "normal" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked2 ? "[✓] " : "[  ] "}</span>
                              {rf2}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked3 ? "#fee2e2" : "transparent" }}>
                          {rf3 ? (
                            <span style={{ fontWeight: isChecked3 ? "bold" : "normal" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked3 ? "[✓] " : "[  ] "}</span>
                              {rf3}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SECTION 4: CLINICAL REMARKS */}
            {form.remarks && (
              <div style={{ marginBottom: "10px", border: "1px solid #000", padding: "5px 8px", fontSize: "9.5px" }}>
                <strong>Additional Clinical Instructions / Midwife Remarks: </strong>
                <span>{form.remarks}</span>
              </div>
            )}

            {/* SECTION 5: OFFICIAL SIGNATURES */}
            <div className="print-footer-signatures" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", paddingTop: "14px", marginTop: "12px", borderTop: "1.5px solid #000" }}>
              <div style={{ textAlign: "left", width: "45%" }}>
                <div style={{ fontSize: "10px", fontWeight: "bold" }}>Certified Correct by:</div>
                <div style={{ marginTop: "24px", borderBottom: "1.5px solid #000", width: "100%" }}></div>
                <div style={{ fontSize: "9.5px", fontWeight: "bold", marginTop: "2px" }}>Attending Barangay Health Worker (BHW)</div>
                <div style={{ fontSize: "8.5px", color: "#475569" }}>Barangay Subukin Health Center</div>
              </div>
              <div style={{ textAlign: "right", width: "45%" }}>
                <div style={{ fontSize: "10px", fontWeight: "bold" }}>Approved &amp; Verified by:</div>
                <div style={{ marginTop: "24px", borderBottom: "1.5px solid #000", width: "100%", marginLeft: "auto" }}></div>
                <div style={{ fontSize: "9.5px", fontWeight: "bold", marginTop: "2px" }}>Barangay Health Supervisor / Public Health Midwife</div>
                <div style={{ fontSize: "8.5px", color: "#475569" }}>Rural Health Unit • Municipality of San Juan</div>
              </div>
            </div>

            {/* Official Seal / Legal Footer Note */}
            <div style={{ marginTop: "10px", paddingTop: "4px", borderTop: "1px dotted #94a3b8", textAlign: "center", fontSize: "8px", color: "#64748b" }}>
              CONFIDENTIAL PATIENT MEDICAL RECORD • BARANGAY HEALTH WORKER HEALTH INFORMATION MANAGEMENT SYSTEM (BHW-HIMS) • BARANGAY SUBUKIN, SAN JUAN, BATANGAS
            </div>
          </div>

          {/* Header Bar with Barangay Subukin note (Hidden when printing) */}
          <div className="flex items-center justify-between gap-2 no-print pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              BRGY: <strong className="text-foreground">SUBUKIN</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 no-print">
            <fieldset disabled={isMidwife} className="space-y-8 border-0 p-0 m-0 min-w-0">
            
            {/* Patient General Details Grid */}
            <div className="space-y-4 bg-muted/20 p-4 md:p-5 rounded-lg border border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-2.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 shrink-0" /> Patient General Information
                </h3>
                <div className="flex items-center gap-2 no-print w-full sm:w-auto">
                  <Label className="text-xs shrink-0 font-medium text-foreground whitespace-nowrap">Select Resident:</Label>
                  <Select value={form.resident_id} onValueChange={handleSelectResident}>
                    <SelectTrigger className="h-8 text-xs bg-background text-foreground w-full sm:w-56 min-w-[140px]">
                      <SelectValue placeholder={language === "tl" ? "Pumili..." : "Select..."} />
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
                  <Label className="text-xs font-semibold text-foreground">Family Number (FN)</Label>
                  <Input 
                    type="text" 
                    value={form.family_number} 
                    onChange={e => handleFormChange("family_number", e.target.value)} 
                    placeholder="e.g. FN-512A" 
                    className={lineInputClass}
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Patient's Last Name *</Label>
                  <Input 
                    type="text" 
                    value={form.patient_last_name} 
                    onKeyDown={allowOnlyLetters}
                    onChange={e => handleFormChange("patient_last_name", sanitizeLetters(e.target.value))} 
                    placeholder={language === "tl" ? "Apelyido" : "Last Name"} 
                    className={lineInputClass}
                    required
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">First Name *</Label>
                  <Input 
                    type="text" 
                    value={form.patient_first_name} 
                    onKeyDown={allowOnlyLetters}
                    onChange={e => handleFormChange("patient_first_name", sanitizeLetters(e.target.value))} 
                    placeholder={language === "tl" ? "Pangalan" : "First Name"} 
                    className={lineInputClass}
                    required
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Middle Initial / Name</Label>
                  <Input 
                    type="text" 
                    value={form.patient_middle_name} 
                    onKeyDown={allowOnlyLetters}
                    onChange={e => handleFormChange("patient_middle_name", sanitizeLetters(e.target.value))} 
                    placeholder={language === "tl" ? "Gitnang Apelyido" : "Middle Name"} 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Age</Label>
                  <Input 
                    type="number" 
                    value={form.age} 
                    onKeyDown={allowOnlyNumbers}
                    onChange={e => handleFormChange("age", sanitizeNumbers(e.target.value))} 
                    placeholder={language === "tl" ? "Edad" : "Age"} 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Sitio / Address</Label>
                  <Select value={form.sitio} onValueChange={v => handleFormChange("sitio", v)}>
                    <SelectTrigger className="h-8 text-xs bg-background text-foreground">
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
                  <Label className="text-xs font-semibold text-foreground">EDC (Expected Date of Confinement)</Label>
                  <Input 
                    type="date" 
                    value={form.edc} 
                    onChange={e => handleFormChange("edc", e.target.value)} 
                    className={`${lineInputClass} ${!form.edc ? "empty-date" : ""}`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">LMP (Last Menstrual Period)</Label>
                  <Input 
                    type="date" 
                    value={form.lmp} 
                    onChange={e => handleFormChange("lmp", e.target.value)} 
                    className={`${lineInputClass} ${!form.lmp ? "empty-date" : ""}`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Obstetric Score (G / P)</Label>
                  <Input 
                    type="text" 
                    value={form.obstetric_score} 
                    onChange={e => handleFormChange("obstetric_score", e.target.value)} 
                    placeholder="e.g. G2/P2" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">FPAL Score (F - P - A - L)</Label>
                  <Input 
                    type="text" 
                    value={form.fpal} 
                    onChange={e => handleFormChange("fpal", e.target.value)} 
                    placeholder="e.g. 1-0-0-1" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Patient Height (cm)</Label>
                  <Input 
                    type="text" 
                    value={form.patient_height} 
                    onChange={e => handleFormChange("patient_height", e.target.value)} 
                    placeholder="e.g. 148 cm" 
                    className={lineInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Blood Type</Label>
                  <Select value={form.blood_type} onValueChange={v => handleFormChange("blood_type", v)}>
                    <SelectTrigger className={`h-8 text-xs bg-background text-foreground ${form.blood_type === "Unspecified" ? "print:text-transparent" : ""}`}>
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
                  <Label className="text-[11px] font-semibold text-foreground">End of 1st Trim:</Label>
                  <Input type="text" value={form.end_1st_trim} onChange={e => handleFormChange("end_1st_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">End of 2nd Trim:</Label>
                  <Input type="text" value={form.end_2nd_trim} onChange={e => handleFormChange("end_2nd_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">End of 3rd Trim:</Label>
                  <Input type="text" value={form.end_3rd_trim} onChange={e => handleFormChange("end_3rd_trim", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">End of Postpartum:</Label>
                  <Input type="text" value={form.end_postpartum} onChange={e => handleFormChange("end_postpartum", e.target.value)} placeholder="Petsa / Tala" className={lineInputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Period:</Label>
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
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-primary transition-colors group select-none py-0.5" 
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
                        <span className={cn("text-xs leading-tight cursor-pointer select-none text-foreground", isSelected ? "font-bold" : "font-normal")}>
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
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-primary transition-colors group select-none py-0.5" 
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
                        <span className={cn("text-xs leading-tight cursor-pointer select-none text-foreground", isSelected ? "font-bold" : "font-normal")}>
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
                        className="flex items-start space-x-2.5 cursor-pointer hover:text-primary transition-colors group select-none py-0.5" 
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
                        <span className={cn("text-xs leading-tight cursor-pointer select-none text-foreground", isSelected ? "font-bold" : "font-normal")}>
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
                {!isMidwife && (
                  <Button type="button" onClick={handleAddVisit} size="sm" className="gap-1 text-xs no-print bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    <Plus className="h-3.5 w-3.5" /> Add Prenatal Visit
                  </Button>
                )}
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
                        {!isMidwife && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveVisit(index)} 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive no-print"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Prenatal Visit Date</Label>
                          <Input 
                            type="date" 
                            value={visit.visit_date} 
                            onChange={e => handleUpdateVisit(index, "visit_date", e.target.value)} 
                            className={`${lineInputClass} ${!visit.visit_date ? "empty-date" : ""}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Prenatal Visit #</Label>
                          <Input 
                            type="text" 
                            value={visit.visit_number} 
                            onChange={e => handleUpdateVisit(index, "visit_number", e.target.value)} 
                            placeholder="e.g. 1" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">AOG (Age of Gestation)</Label>
                          <Input 
                            type="text" 
                            value={visit.aog} 
                            onChange={e => handleUpdateVisit(index, "aog", e.target.value)} 
                            placeholder="e.g. 13 weeks 1 day" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Blood Pressure (BP)</Label>
                          <Input 
                            type="text" 
                            value={visit.blood_pressure} 
                            onChange={e => handleUpdateVisit(index, "blood_pressure", e.target.value)} 
                            placeholder="e.g. 90/60" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Weight (kg)</Label>
                          <Input 
                            type="text" 
                            value={visit.weight} 
                            onChange={e => handleUpdateVisit(index, "weight", e.target.value)} 
                            placeholder="e.g. 35.5 kg" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Fundic Height (cm)</Label>
                          <Input 
                            type="text" 
                            value={visit.fundic_height} 
                            onChange={e => handleUpdateVisit(index, "fundic_height", e.target.value)} 
                            placeholder="Fundic height" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">FHR (Fetal Heart Rate)</Label>
                          <Input 
                            type="text" 
                            value={visit.fhr} 
                            onChange={e => handleUpdateVisit(index, "fhr", e.target.value)} 
                            placeholder="FHR" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Presentation</Label>
                          <Input 
                            type="text" 
                            value={visit.presentation} 
                            onChange={e => handleUpdateVisit(index, "presentation", e.target.value)} 
                            placeholder="Presentation" 
                            className={lineInputClass}
                          />
                        </div>

                        <div className="col-span-2 md:col-span-4 space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Notes / Remarks</Label>
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
            </fieldset>

            {/* Printable Official Footer Signatures */}
            <div
              className="print-only print-footer-signatures pt-8 mt-6 border-t border-slate-300 text-xs text-slate-800 w-full"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              <div style={{ textAlign: "left" }}>
                Certified Correct: ___________________________<br />
                <span className="text-[10px] text-slate-600">Attending Barangay Health Worker</span>
              </div>
              <div style={{ textAlign: "right" }}>
                Approved By: ___________________________<br />
                <span className="text-[10px] text-slate-600">Barangay Health Supervisor / Midwife</span>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 no-print pt-2 border-t">
              {!isMidwife && editRecordId && (
                <Button type="button" variant="outline" onClick={handleResetForm} className="text-xs">
                  Cancel Edit
                </Button>
              )}
              {!isMidwife && (
                <>
                  <Button type="submit" disabled={saving} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : editRecordId ? "Update Record" : "Save Record"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setResetConfirmOpen(true)} 
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-medium px-4 h-9 text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-4 w-4" /> Reset
                  </Button>
                </>
              )}
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrint} 
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold px-4 h-9 text-xs sm:text-sm"
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {/* SAVED MATERNAL CARE RECORDS TABLE HISTORY (History View) */}
      {activeView === "history" && (
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintHistory}
                disabled={filteredRecords.length === 0}
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
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">No maternal care records found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Family # (FN)</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Sitio</th>
                  <th className="p-3">EDC</th>
                  <th className="p-3">Obstetric / FPAL</th>
                  <th className="p-3">Remarks / Risk Summary</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map(rec => {
                  const dateStr = rec.created_at 
                    ? new Date(rec.created_at).toLocaleDateString() 
                    : (rec.edc || "—");

                  return (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-primary whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {dateStr}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-foreground">{rec.patient_name || "—"}</td>
                      <td className="p-3 font-medium text-foreground">{rec.family_number || "—"}</td>
                      <td className="p-3">{rec.age ? `${rec.age} yrs` : "—"}</td>
                      <td className="p-3">{rec.sitio || "Subukin"}</td>
                      <td className="p-3">{rec.edc || "—"}</td>
                      <td className="p-3">
                        {rec.obstetric_score || "—"} {rec.fpal ? `(${rec.fpal})` : ""}
                      </td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground">{rec.remarks || "—"}</td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => {
                            setSelectedRecordForView(rec);
                            setViewRecordModalOpen(true);
                          }} 
                          title="View & Print Full Record"
                          className="h-7 w-7 text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isMidwife && (
                          <>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleEdit(rec)} 
                              title="Edit Record"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => setDeleteConfirmId(rec.id)} 
                              title="Delete Record"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      )}

      {/* PRINTABLE MATERNAL CARE HISTORY REPORT */}
      <div id="maternal-history-print-area" className="hidden print:block" style={{ display: "none" }}>
        <OfficialHeader
          title="Official Maternal Care & Prenatal Health Records History"
          subtitle={`Barangay Subukin Health Center Registry • Total: ${filteredRecords.length} Record(s) • Generated: ${new Date().toLocaleDateString()}`}
          showDoubleBorder={true}
          logoHeight="95px"
        />

        <table className="w-full border-collapse" style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
          <thead>
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
          </thead>
          <tbody>
            {filteredRecords.map((rec, index) => {
              const dateStr = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : (rec.edc || "—");
              return (
                <tr key={rec.id || index}>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{index + 1}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", fontWeight: "bold" }}>{rec.patient_name || "—"}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.family_number || "—"}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>{rec.age ? `${rec.age}y` : "—"}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.sitio || "Subukin"}</td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px", textAlign: "center" }}>
                    {rec.obstetric_score || "—"}{rec.fpal ? ` (${rec.fpal})` : ""}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "5px 6px", fontSize: "10px" }}>{rec.remarks || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Printable Official Signatures */}
        <div className="print-footer-signatures" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", paddingTop: "35px", marginTop: "25px", borderTop: "1px solid #cbd5e1" }}>
          <div style={{ textAlign: "left" }}>
            Certified Correct: ___________________________<br />
            <span style={{ fontSize: "10px", color: "#4b5563" }}>Attending Barangay Health Worker</span>
          </div>
          <div style={{ textAlign: "right" }}>
            Approved By: ___________________________<br />
            <span style={{ fontSize: "10px", color: "#4b5563" }}>Barangay Health Supervisor / Midwife</span>
          </div>
        </div>
      </div>

      {/* VIEW / PRINT RECORD DETAIL DIALOG */}
      <Dialog open={viewRecordModalOpen} onOpenChange={setViewRecordModalOpen}>
        <DialogContent className="max-w-4xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 max-h-[90vh] overflow-y-auto">
          {selectedRecordForView && (
            <div className="space-y-5" id="maternal-modal-printable">
              {/* Header Seals */}
              <OfficialHeader
                title="Official Maternal Care Patient Record"
                subtitle="Barangay Subukin Health Center • San Juan, Batangas"
                showDoubleBorder={true}
                logoHeight="95px"
              />

              {/* Patient Demographics Table */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "4px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  I. Patient Demographic &amp; Obstetrical Profile
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1px solid #000" }}>
                  <tbody>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left", width: "18%" }}>Patient Full Name:</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", fontSize: "11px", width: "32%" }}>
                        {selectedRecordForView.patient_name || "—"}
                      </td>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left", width: "18%" }}>Family Number (FN):</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", width: "32%" }}>
                        {selectedRecordForView.family_number || "—"}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Age:</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{selectedRecordForView.age ? `${selectedRecordForView.age} years old` : "—"}</td>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Sitio / Address:</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{selectedRecordForView.sitio ? `${selectedRecordForView.sitio}, Subukin, San Juan, Batangas` : "Subukin, San Juan, Batangas"}</td>
                    </tr>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Obstetric Score (G/P):</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{selectedRecordForView.obstetric_score || "—"}</td>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>FPAL Score (F-P-A-L):</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{selectedRecordForView.fpal || "—"}</td>
                    </tr>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>LMP (Last Menstrual Period):</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{selectedRecordForView.lmp || "—"}</td>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>EDC (Expected Date):</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{selectedRecordForView.edc || "—"}</td>
                    </tr>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Patient Height:</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{selectedRecordForView.patient_height ? `${selectedRecordForView.patient_height} cm` : "—"}</td>
                      <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f1f5f9", textAlign: "left" }}>Blood Type:</th>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{selectedRecordForView.blood_type || "Unspecified"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Trimester Milestones Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", border: "1px solid #000", borderTop: "none" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 1st Trimester</th>
                      <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 2nd Trimester</th>
                      <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of 3rd Trimester</th>
                      <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "center", width: "25%" }}>End of Postpartum / Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{selectedRecordForView.end_1st_trim || "—"}</td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{selectedRecordForView.end_2nd_trim || "—"}</td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{selectedRecordForView.end_3rd_trim || "—"}</td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>
                        {selectedRecordForView.end_postpartum || "—"}{selectedRecordForView.period ? ` (${selectedRecordForView.period})` : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 2: PRENATAL CHECKUP & CLINICAL VISITS LEDGER */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "4px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  II. Prenatal Clinical Visits &amp; Progress Monitoring Ledger
                </div>
                {(() => {
                  let visits: PrenatalVisit[] = [];
                  if (Array.isArray(selectedRecordForView.prenatal_visits)) visits = selectedRecordForView.prenatal_visits;
                  else if (typeof selectedRecordForView.prenatal_visits === "string") {
                    try { visits = JSON.parse(selectedRecordForView.prenatal_visits); } catch (e) {}
                  }

                  return (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", border: "1px solid #000" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "45px" }}>Visit #</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "80px" }}>Date of Visit</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "55px" }}>AOG</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "65px" }}>BP</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "65px" }}>Weight (kg)</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "70px" }}>Fundic Ht (cm)</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "70px" }}>FHR (bpm)</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", width: "85px" }}>Presentation</th>
                          <th style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "left" }}>Clinical Findings / Treatment / Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.length > 0 ? (
                          visits.map((v, i) => (
                            <tr key={i}>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", fontWeight: "bold" }}>{v.visit_number || i + 1}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.visit_date || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.aog || v.aog_weeks || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center", fontWeight: "600" }}>{v.blood_pressure || v.bp || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.weight || v.weight_kg ? `${v.weight || v.weight_kg} kg` : "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.fundic_height || v.fundic_height_cm ? `${v.fundic_height || v.fundic_height_cm} cm` : "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.fhr || v.fhb_bpm ? `${v.fhr || v.fhb_bpm} bpm` : "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px", textAlign: "center" }}>{v.presentation || "—"}</td>
                              <td style={{ border: "1px solid #000", padding: "4px 5px" }}>{v.notes || v.findings || v.remarks || "—"}</td>
                            </tr>
                          ))
                        ) : (
                          [1, 2, 3, 4].map((num) => (
                            <tr key={num}>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center", color: "#64748b" }}>{num}</td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px", textAlign: "center" }}></td>
                              <td style={{ border: "1px solid #000", padding: "6px 5px" }}></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* SECTION 3: MATERNAL CLINICAL RISK FACTORS EVALUATION */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ backgroundColor: "#1e293b", color: "#ffffff", padding: "4px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  III. Maternal Risk Factors Clinical Assessment Matrix
                </div>
                {(() => {
                  let risks: string[] = [];
                  if (Array.isArray(selectedRecordForView.risk_factors)) risks = selectedRecordForView.risk_factors;
                  else if (typeof selectedRecordForView.risk_factors === "string") {
                    try { risks = JSON.parse(selectedRecordForView.risk_factors); } catch (e) {}
                  }

                  return (
                    <>
                      {/* Summary of Active Risks */}
                      <div style={{ border: "1px solid #000", borderBottom: "none", padding: "4px 8px", background: risks.length > 0 ? "#fff1f2" : "#f0fdf4", fontSize: "9.5px" }}>
                        <strong>Identified Clinical Risks: </strong>
                        {risks.length > 0 ? (
                          <span style={{ color: "#b91c1c", fontWeight: "bold" }}>
                            {risks.join(" • ")}
                          </span>
                        ) : (
                          <span style={{ color: "#15803d", fontWeight: "bold" }}>
                            ✓ No High-Risk Clinical Factors Identified (Low-Risk Pregnancy Status)
                          </span>
                        )}
                      </div>

                      {/* 3-Column Risk Factors Checklist Table */}
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5px", border: "1px solid #000" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "34%" }}>Risk Factors (Group 1)</th>
                            <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "33%" }}>Risk Factors (Group 2)</th>
                            <th style={{ border: "1px solid #000", padding: "3px 5px", textAlign: "left", width: "33%" }}>Risk Factors (Group 3)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.max(RISK_FACTORS_COLUMN_1.length, RISK_FACTORS_COLUMN_2.length, RISK_FACTORS_COLUMN_3.length) }).map((_, rIdx) => {
                            const rf1 = RISK_FACTORS_COLUMN_1[rIdx];
                            const rf2 = RISK_FACTORS_COLUMN_2[rIdx];
                            const rf3 = RISK_FACTORS_COLUMN_3[rIdx];

                            const isChecked1 = rf1 ? risks.includes(rf1) : false;
                            const isChecked2 = rf2 ? risks.includes(rf2) : false;
                            const isChecked3 = rf3 ? risks.includes(rf3) : false;

                            return (
                              <tr key={rIdx}>
                                <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked1 ? "#fee2e2" : "transparent" }}>
                                  {rf1 ? (
                                    <span style={{ fontWeight: isChecked1 ? "bold" : "normal" }}>
                                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked1 ? "[✓] " : "[  ] "}</span>
                                      {rf1}
                                    </span>
                                  ) : null}
                                </td>
                                <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked2 ? "#fee2e2" : "transparent" }}>
                                  {rf2 ? (
                                    <span style={{ fontWeight: isChecked2 ? "bold" : "normal" }}>
                                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked2 ? "[✓] " : "[  ] "}</span>
                                      {rf2}
                                    </span>
                                  ) : null}
                                </td>
                                <td style={{ border: "1px solid #000", padding: "2px 4px", backgroundColor: isChecked3 ? "#fee2e2" : "transparent" }}>
                                  {rf3 ? (
                                    <span style={{ fontWeight: isChecked3 ? "bold" : "normal" }}>
                                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{isChecked3 ? "[✓] " : "[  ] "}</span>
                                      {rf3}
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              {/* Remarks Summary */}
              {selectedRecordForView.remarks && (
                <div style={{ marginBottom: "10px", border: "1px solid #000", padding: "5px 8px", fontSize: "9.5px" }}>
                  <strong>Additional Clinical Instructions / Midwife Remarks: </strong>
                  <span>{selectedRecordForView.remarks}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="print-footer-signatures" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", paddingTop: "14px", marginTop: "12px", borderTop: "1.5px solid #000" }}>
                <div style={{ textAlign: "left", width: "45%" }}>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>Certified Correct by:</div>
                  <div style={{ marginTop: "24px", borderBottom: "1.5px solid #000", width: "100%" }}></div>
                  <div style={{ fontSize: "9.5px", fontWeight: "bold", marginTop: "2px" }}>Attending Barangay Health Worker (BHW)</div>
                  <div style={{ fontSize: "8.5px", color: "#475569" }}>Barangay Subukin Health Center</div>
                </div>
                <div style={{ textAlign: "right", width: "45%" }}>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>Approved &amp; Verified by:</div>
                  <div style={{ marginTop: "24px", borderBottom: "1.5px solid #000", width: "100%", marginLeft: "auto" }}></div>
                  <div style={{ fontSize: "9.5px", fontWeight: "bold", marginTop: "2px" }}>Barangay Health Supervisor / Public Health Midwife</div>
                  <div style={{ fontSize: "8.5px", color: "#475569" }}>Rural Health Unit • Municipality of San Juan</div>
                </div>
              </div>

              {/* Official Seal / Legal Footer Note */}
              <div style={{ marginTop: "10px", paddingTop: "4px", borderTop: "1px dotted #94a3b8", textAlign: "center", fontSize: "8px", color: "#64748b" }}>
                CONFIDENTIAL PATIENT MEDICAL RECORD • BARANGAY HEALTH WORKER HEALTH INFORMATION MANAGEMENT SYSTEM (BHW-HIMS) • BARANGAY SUBUKIN, SAN JUAN, BATANGAS
              </div>

              <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between no-print">
                <span className="text-[10px] text-slate-500">Maternal Record ID: {selectedRecordForView.id}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handlePrintModal} className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                    <Printer className="h-3.5 w-3.5" /> Print Record
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setViewRecordModalOpen(false)}>
                    Close
                  </Button>
                  {!isMidwife && (
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={() => {
                        setViewRecordModalOpen(false);
                        if (selectedRecordForView) handleEdit(selectedRecordForView);
                      }} 
                      className="bg-primary text-primary-foreground text-xs"
                    >
                      Edit Record
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* RESET CONFIRMATION DIALOG */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Reset Maternal Care Form?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to reset the form? All unsaved prenatal and maternal care entries will be cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setResetConfirmOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleResetForm} 
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
              Delete Maternal Care Record?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this maternal care record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} className="text-xs">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} 
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

export default MaternalCareForm;
