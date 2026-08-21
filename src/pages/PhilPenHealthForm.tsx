import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, Save, Printer, RefreshCw, HeartPulse, CheckCircle2, Search, Eye, Pencil, History, Calendar, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import { calculateAge, getFamilyOnlyResidents } from "@/lib/residentLinker";
import { SUBUKIN_SITIOS, getDatabaseSitios } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";
import barangayLogo from "@/assets/barangay-logo.png";
import {
  allowOnlyNumbers,
  allowNumbersAndDecimal,
  allowNumbersAndSlash,
} from "@/lib/inputValidation";

// Input sanitizers
const sanitizeDigitsOnly = (val: string) => val.replace(/[^0-9]/g, "");
const sanitizeDecimalNumber = (val: string) => {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return `${parts[0]}.${parts.slice(1).join("")}`;
  return cleaned;
};
const sanitizeDateString = (val: string) => val.replace(/[^0-9-]/g, "");
const sanitizeBpString = (val: string) => val.replace(/[^0-9/\s]/g, "");

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface Resident {
  id: string;
  full_name: string;
  age?: number;
  birthday?: string;
  sitio?: string;
  address?: string;
}

const PhilPenHealthForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);

  // History state
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("philpen_health")
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setHistoryRecords(data);
      }
    } catch (err) {
      console.error("Error fetching PhilPen history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    getDatabaseSitios().then(sits => setSitioOptions(sits));
    getFamilyOnlyResidents().then((data) => setResidents(data || []));
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyRecords;
    const q = historySearch.toLowerCase().trim();
    return historyRecords.filter((rec) => {
      const name = (rec.residents?.full_name || "").toLowerCase();
      const date = (rec.record_date || rec.date_of_assessment || "").toLowerCase();
      const addr = (rec.address_sitio || rec.address || "").toLowerCase();
      const bp = (rec.bp || "").toLowerCase();
      return name.includes(q) || date.includes(q) || addr.includes(q) || bp.includes(q);
    });
  }, [historyRecords, historySearch]);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    resident_id: "",
    address: "",
    age: "",
    birthdate: "",
    currentDate: getTodayDate(),
    bp: "",
    height: "",
    weight: "",
    
    // Checklist Answers
    smokes: false,
    smokes_no: false,
    smokes_remarks: "",
    
    drinks_alcohol: false,
    drinks_alcohol_no: false,
    drinks_remarks: "",
    
    high_bp: false,
    high_bp_no: false,
    bp_remarks_bp: "",
    bp_remarks_meds: "",
    bp_remarks_chest: "",
    
    diabetes: false,
    diabetes_no: false,
    
    // Diabetes symptoms sub-checklists
    diabetes_palakain: false,
    diabetes_palakain_no: false,
    diabetes_palaging_gutom: false,
    diabetes_palaging_gutom_no: false,
    diabetes_madalas_umihi: false,
    diabetes_madalas_umihi_no: false,
    diabetes_laging_uhaw: false,
    diabetes_laging_uhaw_no: false,
    
    diabetes_remarks: ""
  });

  useEffect(() => {
    getFamilyOnlyResidents().then((data) => setResidents(data || []));
  }, []);

  // Calculate BMI
  const bmi = form.height && form.weight 
    ? (Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1) 
    : "";

  const handleResidentChange = (residentId: string) => {
    const res = residents.find(r => r.id === residentId);
    if (!res) return;

    let computedAge = "";
    if (res.birthday) {
      const birth = new Date(res.birthday);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      computedAge = String(age);
    } else if (res.age) {
      computedAge = String(res.age);
    }

    setForm(prev => ({
      ...prev,
      resident_id: residentId,
      address: res.sitio || res.address || "",
      age: computedAge,
      birthdate: res.birthday || ""
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleToggle = (yesField: string, noField: string, choice: "yes" | "no") => {
    setForm(prev => ({
      ...prev,
      [yesField]: choice === "yes",
      [noField]: choice === "no"
    }));
  };

  const handleReset = () => {
    setForm({
      resident_id: "",
      address: "",
      age: "",
      birthdate: "",
      currentDate: getTodayDate(),
      bp: "",
      height: "",
      weight: "",
      smokes: false,
      smokes_no: false,
      smokes_remarks: "",
      drinks_alcohol: false,
      drinks_alcohol_no: false,
      drinks_remarks: "",
      high_bp: false,
      high_bp_no: false,
      bp_remarks_bp: "",
      bp_remarks_meds: "",
      bp_remarks_chest: "",
      diabetes: false,
      diabetes_no: false,
      diabetes_palakain: false,
      diabetes_palakain_no: false,
      diabetes_palaging_gutom: false,
      diabetes_palaging_gutom_no: false,
      diabetes_madalas_umihi: false,
      diabetes_madalas_umihi_no: false,
      diabetes_laging_uhaw: false,
      diabetes_laging_uhaw_no: false,
      diabetes_remarks: ""
    });
    toast.success("Form cleared successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) {
      toast.error(t("consultation.selectResident"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("philpen_health").insert({
      resident_id: form.resident_id,
      address_sitio: form.address,
      age: Number(form.age) || null,
      birthdate: form.birthdate || null,
      record_date: form.currentDate || new Date().toISOString().split("T")[0],
      bp: form.bp,
      height: form.height,
      weight: form.weight,
      bmi: bmi !== "—" ? bmi : null,
      
      // Boolean mapping
      smokes: form.smokes,
      drinks_alcohol: form.drinks_alcohol,
      high_blood_pressure: form.high_bp,
      diabetes_symptoms: form.diabetes,
      
      // Store extra details as schema-less properties (fully supported in mock database local storage)
      smokes_remarks: form.smokes_remarks,
      drinks_remarks: form.drinks_remarks,
      bp_remarks_bp: form.bp_remarks_bp,
      bp_remarks_meds: form.bp_remarks_meds,
      bp_remarks_chest: form.bp_remarks_chest,
      diabetes_palakain: form.diabetes_palakain,
      diabetes_palaging_gutom: form.diabetes_palaging_gutom,
      diabetes_madalas_umihi: form.diabetes_madalas_umihi,
      diabetes_laging_uhaw: form.diabetes_laging_uhaw,
      diabetes_remarks: form.diabetes_remarks
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to save health checklist");
    } else {
      const selectedResident = residents.find(r => r.id === form.resident_id);
      const resName = selectedResident ? selectedResident.full_name : form.resident_id;
      logActivity("submit_philpen", {
        entity_type: "philpen_health",
        description: `Recorded a health checklist report for resident: ${resName}`
      });
      toast.success("Health check checklist saved successfully!");
      handleReset();
      fetchHistory();
    }
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

  return (
    <div className="w-full space-y-6">
      <style>{`
        .check-cell {
          width: 50px;
          text-align: center;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.15s;
        }
        .check-cell:hover {
          background-color: hsl(var(--primary) / 0.1);
        }
        .print-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px dashed hsl(var(--border));
          padding: 2px 4px;
          outline: none;
          transition: border-bottom-color 0.2s;
        }
        .print-input:focus {
          border-bottom-style: solid;
          border-bottom-color: hsl(var(--primary));
        }
        input[type="date"]:invalid::-webkit-datetime-edit,
        input[type="date"]:invalid::-webkit-datetime-edit-fields-wrapper,
        input[type="date"]:invalid::-webkit-datetime-edit-text,
        input[type="date"]:invalid::-webkit-datetime-edit-month-field,
        input[type="date"]:invalid::-webkit-datetime-edit-day-field,
        input[type="date"]:invalid::-webkit-datetime-edit-year-field {
          color: transparent !important;
        }
        input[type="date"]:focus::-webkit-datetime-edit,
        input[type="date"]:valid::-webkit-datetime-edit,
        input[type="date"]:focus::-webkit-datetime-edit-fields-wrapper,
        input[type="date"]:valid::-webkit-datetime-edit-fields-wrapper,
        input[type="date"]:focus::-webkit-datetime-edit-text,
        input[type="date"]:valid::-webkit-datetime-edit-text,
        input[type="date"]:focus::-webkit-datetime-edit-month-field,
        input[type="date"]:valid::-webkit-datetime-edit-month-field,
        input[type="date"]:focus::-webkit-datetime-edit-day-field,
        input[type="date"]:valid::-webkit-datetime-edit-day-field,
        input[type="date"]:focus::-webkit-datetime-edit-year-field,
        input[type="date"]:valid::-webkit-datetime-edit-year-field {
          color: inherit !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 1 !important;
          cursor: pointer;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          body:not(.printing-modal) #philpen-print-area,
          body:not(.printing-modal) #philpen-print-area *:not(.no-print):not(.no-print *) {
            visibility: visible !important;
          }
          body:not(.printing-modal) #philpen-print-area .no-print,
          body:not(.printing-modal) #philpen-print-area .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          body:not(.printing-modal) #philpen-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          body:not(.printing-modal) #philpen-print-area * {
            color: #000000 !important;
            border-color: #000000 !important;
          }
          body.printing-modal #philpen-modal-printable,
          body.printing-modal #philpen-modal-printable *:not(.no-print):not(.no-print *) {
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
            background: white !important;
          }
          body.printing-modal #philpen-modal-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 15px !important;
            margin: 0 !important;
          }
          ::placeholder, .print-input::placeholder {
            color: transparent !important;
            opacity: 0 !important;
          }
          #philpen-print-area input[type="date"]:invalid::-webkit-datetime-edit,
          #philpen-print-area input[type="date"]:invalid::-webkit-datetime-edit-fields-wrapper {
            color: transparent !important;
            opacity: 0 !important;
          }
          .print-input {
            border-bottom: 1px solid #000000 !important;
            padding: 2px 4px !important;
            color: #000000 !important;
          }
          select, select * {
            display: none !important;
          }
          .print-only { display: flex !important; }
          .header-seal img { height: 80px !important; mix-blend-mode: multiply !important; }
          #philpen-print-area table td, #philpen-print-area table th { padding: 3px 5px !important; font-size: 11px !important; }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight">
              PhilPen Health Assessment Form
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              PhilPEN Risk Assessment & Lifestyle Health Checklist for Barangay Subukin registry.
            </p>
          </div>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <Card 
        id="philpen-print-area" 
        className="border border-border/60 shadow-md bg-card text-card-foreground rounded-2xl overflow-hidden w-full"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <CardContent className="p-6 md:p-8 space-y-6">
          
          {/* Official Barangay Printable Header */}
          <div 
            className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6 text-center"
            style={{ display: "none", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "4px double #000", paddingBottom: "16px", marginBottom: "20px", textAlign: "center" }}
          >
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Top Personal Fields Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 pb-4 border-b border-border/60">
              
              {/* Left Side Group */}
              <div className="md:col-span-8 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Name:</span>
                  <div className="flex-1 no-print">
                    <Select value={form.resident_id} onValueChange={handleResidentChange}>
                      <SelectTrigger className="h-8 border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 shadow-none focus:ring-0 focus:border-primary text-sm font-normal transition-colors">
                        <SelectValue placeholder="Select a resident..." />
                      </SelectTrigger>
                      <SelectContent>
                        {residents.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Print representation of name select */}
                  <span className="hidden print:inline border-b border-slate-400 flex-1 px-1 text-sm font-normal min-h-6">
                    {residents.find(r => r.id === form.resident_id)?.full_name || ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Address/Sitio:</span>
                  <input 
                    type="text"
                    value={form.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    className="print-input flex-1 text-sm font-normal"
                    placeholder=""
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Age:</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={form.age}
                    onKeyDown={allowOnlyNumbers}
                    onChange={(e) => handleFieldChange("age", sanitizeDigitsOnly(e.target.value))}
                    className="print-input flex-1 text-sm font-normal"
                    placeholder=""
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Birthdate:</span>
                  <input 
                    type="text"
                    value={form.birthdate}
                    onChange={(e) => {
                      const bday = sanitizeDateString(e.target.value);
                      const computed = calculateAge(bday);
                      setForm(prev => ({ ...prev, birthdate: bday, age: computed > 0 ? String(computed) : prev.age }));
                    }}
                    className="print-input flex-1 text-sm font-normal"
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Date:</span>
                  <div className="flex-1 no-print border-b border-border/80 dark:border-slate-600 flex items-center">
                    <input 
                      type="date"
                      value={form.currentDate}
                      onChange={(e) => handleFieldChange("currentDate", e.target.value)}
                      className="w-36 bg-transparent border-0 outline-none p-1 text-sm font-normal cursor-pointer"
                    />
                  </div>
                  <span className="hidden print:inline border-b border-slate-400 flex-1 px-1 text-sm font-normal min-h-6">
                    {form.currentDate || ""}
                  </span>
                </div>
              </div>

              {/* Right Side Group */}
              <div className="md:col-span-4 space-y-3.5 md:border-l md:border-border/60 md:pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">BP:</span>
                  <input 
                    type="text"
                    value={form.bp}
                    onKeyDown={allowNumbersAndSlash}
                    onChange={(e) => handleFieldChange("bp", sanitizeBpString(e.target.value))}
                    className="print-input flex-1 text-center text-sm font-normal"
                    placeholder="120/80"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Ht:</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.height}
                    onKeyDown={allowNumbersAndDecimal}
                    onChange={(e) => handleFieldChange("height", sanitizeDecimalNumber(e.target.value))}
                    className="print-input flex-1 text-center text-sm font-normal"
                    placeholder="cm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">Wt:</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.weight}
                    onKeyDown={allowNumbersAndDecimal}
                    onChange={(e) => handleFieldChange("weight", sanitizeDecimalNumber(e.target.value))}
                    className="print-input flex-1 text-center text-sm font-normal"
                    placeholder="kg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-foreground shrink-0 text-sm font-bold">BMI:</span>
                  <div className="flex-1 font-mono text-sm font-normal text-center text-primary border-b border-dashed border-border/80 min-h-[28px] flex items-center justify-center">
                    {bmi || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse border border-border text-left text-sm">
                <thead>
                  <tr className="bg-primary/10 text-primary border-b-2 border-primary/30 font-heading">
                    <th className="border border-border p-2.5 font-bold text-left w-[55%]">
                      Description/Question
                    </th>
                    <th className="border border-border p-2.5 font-bold text-center w-[10%]">
                      Yes
                    </th>
                    <th className="border border-border p-2.5 font-bold text-center w-[10%]">
                      No
                    </th>
                    <th className="border border-border p-2.5 font-bold text-left w-[25%]">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* Row 1: Naninigarilyo */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      1. Naninigarilyo?
                    </td>
                    <td 
                      onClick={() => handleToggle("smokes", "smokes_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.smokes ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("smokes", "smokes_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.smokes_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
                        <span className="shrink-0 font-medium">Ilang stick kada araw:</span>
                        <input 
                          type="text"
                          value={form.smokes_remarks}
                          onChange={(e) => handleFieldChange("smokes_remarks", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="sticks/day..."
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: Manginginom */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      2. Manginginom?
                    </td>
                    <td 
                      onClick={() => handleToggle("drinks_alcohol", "drinks_alcohol_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.drinks_alcohol ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("drinks_alcohol", "drinks_alcohol_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.drinks_alcohol_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1">
                      <input 
                        type="text"
                        value={form.drinks_remarks}
                        onChange={(e) => handleFieldChange("drinks_remarks", e.target.value)}
                        className="print-input text-foreground text-xs"
                        placeholder="Remarks..."
                      />
                    </td>
                  </tr>

                  {/* Row 3: Tumataas ba ang BP */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      3. Tumataas ba ang BP?
                    </td>
                    <td 
                      onClick={() => handleToggle("high_bp", "high_bp_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.high_bp ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("high_bp", "high_bp_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.high_bp_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-2 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• If yes, ano BP mo:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_bp}
                          onChange={(e) => handleFieldChange("bp_remarks_bp", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="e.g. 130/90"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• Ano gamot iniinom:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_meds}
                          onChange={(e) => handleFieldChange("bp_remarks_meds", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="Medications..."
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• Naninikip ba dibdib mo:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_chest}
                          onChange={(e) => handleFieldChange("bp_remarks_chest", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="Yes/No..."
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: May sintomas ba ng diabetes */}
                  <tr>
                    <td className="border border-border p-3 font-semibold text-foreground bg-muted/10">
                      4. May sintomas ba ng diabetes?
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes", "diabetes_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold bg-muted/10"
                    >
                      {form.diabetes ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes", "diabetes_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold bg-muted/10"
                    >
                      {form.diabetes_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/10">
                      <input 
                        type="text"
                        value={form.diabetes_remarks}
                        onChange={(e) => handleFieldChange("diabetes_remarks", e.target.value)}
                        className="print-input text-foreground text-xs"
                        placeholder="Remarks..."
                      />
                    </td>
                  </tr>

                  {/* Sub-row: Palakain */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Palakain
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palakain", "diabetes_palakain_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_palakain ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palakain", "diabetes_palakain_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_palakain_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Palaging gutom */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Palaging gutom
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palaging_gutom", "diabetes_palaging_gutom_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_palaging_gutom ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palaging_gutom", "diabetes_palaging_gutom_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_palaging_gutom_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Madalas umihi sa madaling araw */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Madalas umihi sa madaling araw?
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_madalas_umihi", "diabetes_madalas_umihi_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_madalas_umihi ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_madalas_umihi", "diabetes_madalas_umihi_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_madalas_umihi_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Laging uhaw */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Laging uhaw
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_laging_uhaw", "diabetes_laging_uhaw_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_laging_uhaw ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_laging_uhaw", "diabetes_laging_uhaw_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_laging_uhaw_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Printable Official Footer Signatures */}
            <div className="print-only pt-8 mt-6 border-t border-slate-300 flex justify-between text-xs text-slate-800">
              <div>
                Certified Correct: ___________________________<br />
                <span className="text-[10px] text-slate-600">Attending Barangay Health Worker</span>
              </div>
              <div>
                Approved By: ___________________________<br />
                <span className="text-[10px] text-slate-600">Barangay Health Supervisor / Midwife</span>
              </div>
            </div>

            {/* Bottom Form Actions Row - Hidden in Print */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-6 no-print border-t border-border/40">
              <Button 
                type="submit" 
                disabled={loading} 
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-200 px-6"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? "Saving..." : "Save Record"}
              </Button>

              <Button 
                type="button" 
                onClick={handleReset}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-medium px-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
              
              <Button 
                type="button" 
                onClick={handlePrint}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold px-5"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* SAVED PHILPEN HEALTH RECORDS HISTORY */}
      <div className="no-print pt-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold font-heading">
                  PhilPen Health Checklist History
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  View, load, or re-print completed community health risk assessments.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold shrink-0">
                {filteredHistory.length} Record(s)
              </Badge>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search resident, date, BP..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading history records...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                {historySearch ? "No PhilPen records match your search." : "No PhilPen records recorded yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Resident Name</TableHead>
                      <TableHead>Address / Sitio</TableHead>
                      <TableHead>BP / BMI</TableHead>
                      <TableHead>Risk Factors (Smoking, Alcohol, High BP, Diabetes)</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((rec) => {
                      const resName = rec.residents?.full_name || "—";
                      const riskBadges = [];
                      if (rec.smokes) riskBadges.push("Smoker");
                      if (rec.drinks_alcohol) riskBadges.push("Alcohol");
                      if (rec.high_blood_pressure) riskBadges.push("High BP");
                      if (rec.diabetes_symptoms) riskBadges.push("Diabetes");

                      return (
                        <TableRow key={rec.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-xs font-semibold text-primary whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {rec.record_date || (rec.created_at ? new Date(rec.created_at).toLocaleDateString() : "—")}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {resName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.address_sitio || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground">{rec.bp || "—"}</span>
                            {rec.bmi && <span className="text-muted-foreground ml-1">({rec.bmi} BMI)</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {riskBadges.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {riskBadges.map((badge, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                                    {badge}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">None detected</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedRecordForView(rec);
                                  setViewModalOpen(true);
                                }}
                                title="View & Print Full Record"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setForm({
                                    resident_id: rec.resident_id || "",
                                    address: rec.address_sitio || "",
                                    age: rec.age ? String(rec.age) : "",
                                    birthdate: rec.birthdate || "",
                                    currentDate: rec.record_date || getTodayDate(),
                                    bp: rec.bp || "",
                                    height: rec.height || "",
                                    weight: rec.weight || "",
                                    smokes: !!rec.smokes,
                                    smokes_no: !rec.smokes,
                                    smokes_remarks: rec.smokes_remarks || "",
                                    drinks_alcohol: !!rec.drinks_alcohol,
                                    drinks_alcohol_no: !rec.drinks_alcohol,
                                    drinks_remarks: rec.drinks_remarks || "",
                                    high_bp: !!rec.high_blood_pressure,
                                    high_bp_no: !rec.high_blood_pressure,
                                    bp_remarks_bp: rec.bp_remarks_bp || "",
                                    bp_remarks_meds: rec.bp_remarks_meds || "",
                                    bp_remarks_chest: rec.bp_remarks_chest || "",
                                    diabetes: !!rec.diabetes_symptoms,
                                    diabetes_no: !rec.diabetes_symptoms,
                                    diabetes_palakain: !!rec.diabetes_palakain,
                                    diabetes_palakain_no: !rec.diabetes_palakain,
                                    diabetes_palaging_gutom: !!rec.diabetes_palaging_gutom,
                                    diabetes_palaging_gutom_no: !rec.diabetes_palaging_gutom,
                                    diabetes_madalas_umihi: !!rec.diabetes_madalas_umihi,
                                    diabetes_madalas_umihi_no: !rec.diabetes_madalas_umihi,
                                    diabetes_laging_uhaw: !!rec.diabetes_laging_uhaw,
                                    diabetes_laging_uhaw_no: !rec.diabetes_laging_uhaw,
                                    diabetes_remarks: rec.diabetes_remarks || ""
                                  });
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                  toast.info(`Loaded PhilPen checklist for ${resName}`);
                                }}
                                title="Load into Form"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
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

      {/* VIEW & PRINT RECORD DETAIL DIALOG */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 max-h-[90vh] overflow-y-auto">
          {selectedRecordForView && (
            <div className="space-y-5" id="philpen-modal-printable">
              {/* Official Barangay Printable Header Seal */}
              <div 
                className="header-seal flex flex-col items-center justify-center border-b-[4px] border-double border-slate-900 pb-4 mb-4 text-center"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "4px double #000", paddingBottom: "14px", marginBottom: "16px", textAlign: "center" }}
              >
                <div className="flex items-center justify-center gap-6 md:gap-8" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px" }}>
                  <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                  <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                  <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                </div>
                <div className="mt-3 text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    PhilPen Community Health Risk Assessment Record
                  </h3>
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Patient Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="col-span-2">
                    <span className="text-slate-500 text-[10px] block">Patient Name:</span>
                    <strong className="text-sm text-slate-900 dark:text-slate-100">
                      {selectedRecordForView.residents?.full_name || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Assessment Date:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedRecordForView.record_date || (selectedRecordForView.created_at ? new Date(selectedRecordForView.created_at).toLocaleDateString() : "—")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Address / Sitio:</span>
                    <span className="font-semibold">{selectedRecordForView.address_sitio || "Subukin"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Age:</span>
                    <span className="font-semibold">{selectedRecordForView.age ? `${selectedRecordForView.age} yrs` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Birthdate:</span>
                    <span>{selectedRecordForView.birthdate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Blood Pressure (BP):</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRecordForView.bp || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">BMI:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRecordForView.bmi || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Health Risk Questions Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Health Screening Questionnaire &amp; Findings
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Health Condition / Risk Factor</th>
                        <th className="p-2.5 w-20 text-center">Status</th>
                        <th className="p-2.5">Remarks / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="p-2.5 font-medium">1. Naninigarilyo ka ba? (Smoking)</td>
                        <td className="p-2.5 text-center">
                          {selectedRecordForView.smokes ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300">Oo (Yes)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">Hindi (No)</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{selectedRecordForView.smokes_remarks || "—"}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">2. Umiinom ka ba ng alak? (Alcohol Consumption)</td>
                        <td className="p-2.5 text-center">
                          {selectedRecordForView.drinks_alcohol ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300">Oo (Yes)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">Hindi (No)</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{selectedRecordForView.drinks_remarks || "—"}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">3. Mayroon ka bang mataas na presyon ng dugo? (High Blood Pressure)</td>
                        <td className="p-2.5 text-center">
                          {selectedRecordForView.high_blood_pressure ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300">Oo (Yes)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">Hindi (No)</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          BP: {selectedRecordForView.bp_remarks_bp || selectedRecordForView.bp || "—"} • Umiinom ng gamot: {selectedRecordForView.bp_remarks_meds || "—"} • Masakit ang dibdib: {selectedRecordForView.bp_remarks_chest || "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">
                          4. Mayroon ka bang sintomas ng Diabetes? (Diabetes Symptoms)
                          <div className="text-[11px] text-slate-500 mt-1 pl-3 space-y-0.5">
                            <div>• Palakain: {selectedRecordForView.diabetes_palakain ? "Oo" : "Hindi"}</div>
                            <div>• Palaging gutom: {selectedRecordForView.diabetes_palaging_gutom ? "Oo" : "Hindi"}</div>
                            <div>• Madalas umihi: {selectedRecordForView.diabetes_madalas_umihi ? "Oo" : "Hindi"}</div>
                            <div>• Laging uhaw: {selectedRecordForView.diabetes_laging_uhaw ? "Oo" : "Hindi"}</div>
                          </div>
                        </td>
                        <td className="p-2.5 text-center align-top">
                          {selectedRecordForView.diabetes_symptoms ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300">Oo (Yes)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">Hindi (No)</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 align-top">{selectedRecordForView.diabetes_remarks || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-300 dark:border-slate-700 flex justify-between text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <p>Certified Correct:</p>
                  <div className="mt-4 border-b border-slate-400 w-44"></div>
                  <p className="text-[10px] text-slate-500 mt-1">Attending Barangay Health Worker</p>
                </div>
                <div>
                  <p>Approved By:</p>
                  <div className="mt-4 border-b border-slate-400 w-44"></div>
                  <p className="text-[10px] text-slate-500 mt-1">Barangay Health Supervisor / Midwife</p>
                </div>
              </div>

              <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between no-print">
                <span className="text-[10px] text-slate-500">PhilPen Record ID: {selectedRecordForView.id}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrintModal}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Record
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewModalOpen(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhilPenHealthForm;
