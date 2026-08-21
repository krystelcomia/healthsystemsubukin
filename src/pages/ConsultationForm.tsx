import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Stethoscope, Printer, RefreshCw, UserCheck, Activity, FileText, CheckCircle2, Search, Eye, Pencil, History, Calendar, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { ensureResidentExists, getFamilyOnlyResidents, calculateAge } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";
import barangayLogo from "@/assets/barangay-logo.png";
import {
  allowOnlyNumbers,
  allowNumbersAndDecimal,
  allowOnlyLetters,
  sanitizeNumbers,
  sanitizeNumbersAndDecimal,
  sanitizeLetters,
  sanitizeDateString,
} from "@/lib/inputValidation";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-primary dark:focus-visible:border-primary shadow-none h-9 transition-colors placeholder:text-muted-foreground/50";
const lineSelectClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus:ring-0 focus:border-primary dark:focus:border-primary shadow-none h-9 transition-colors";
const lineTextareaClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-primary dark:focus-visible:border-primary shadow-none resize-y min-h-[70px] transition-colors placeholder:text-muted-foreground/50";

// Strict input sanitizers based on field requirements:
// 1. Integer numbers only (Age, Pulse Rate, Resp Rate) -> blocks all letters, symbols, decimals
const sanitizeDigitsOnly = (val: string) => val.replace(/[^0-9]/g, "");

// 2. Decimal numbers only (Temp, Height, Weight) -> blocks all letters and symbols except single decimal point
const sanitizeDecimalNumber = (val: string) => {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join("")}`;
  }
  return cleaned;
};

// 3. Date string format digits and hyphens (YYYY-MM-DD) -> blocks all letters
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ConsultationForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<{ id: string; full_name: string; sitio?: string; age?: number; birthday?: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", birthdate: "", age: "", sitio: "", date: getTodayDate(),
    temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "",
  });

  // History & past records state
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRecordForView, setSelectedRecordForView] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setHistoryRecords(data);
      }
    } catch (err) {
      console.error("Error fetching consultation history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { 
    getFamilyOnlyResidents().then((data) => setResidents(data || [])); 
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyRecords;
    const q = historySearch.toLowerCase().trim();
    return historyRecords.filter((rec) => {
      const name = (rec.residents?.full_name || "").toLowerCase();
      const date = (rec.consultation_date || "").toLowerCase();
      const sitio = (rec.sitio || "").toLowerCase();
      const cause = (rec.consultation_cause || "").toLowerCase();
      return name.includes(q) || date.includes(q) || sitio.includes(q) || cause.includes(q);
    });
  }, [historyRecords, historySearch]);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSelectResident = (id: string) => {
    const found = residents.find(r => r.id === id);
    if (found) {
      setForm(prev => ({
        ...prev,
        resident_id: id,
        sitio: found.sitio || prev.sitio,
        age: found.age ? String(found.age) : prev.age,
        birthdate: found.birthday || prev.birthdate,
      }));
    } else {
      setForm(prev => ({ ...prev, resident_id: id }));
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

  const handleReset = () => {
    setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: getTodayDate(), temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = form.resident_id;

    if (!targetId) { 
      toast.error(t("consultation.selectResident") || "Please select a resident."); 
      return; 
    }

    const hasInfo = Boolean(
      form.consultationCause?.trim() ||
      form.temperature?.trim() ||
      form.pulseRate?.trim() ||
      form.respirationRate?.trim() ||
      form.height?.trim() ||
      form.weight?.trim()
    );

    if (!hasInfo) {
      toast.error("Cannot save consultation without any information entered.");
      return;
    }

    const { error } = await supabase.from("consultations").insert({
      resident_id: targetId, birthdate: form.birthdate || null, age: Number(form.age) || null, sitio: form.sitio,
      consultation_date: form.date || getTodayDate(), temperature: form.temperature, pulse_rate: form.pulseRate, respiration_rate: form.respirationRate, height: form.height, weight: form.weight, consultation_cause: form.consultationCause,
    });
    if (error) { toast.error("Failed to save consultation"); return; }
    const selectedResident = residents.find(r => r.id === targetId);
    const resName = selectedResident ? selectedResident.full_name : targetId;
    logActivity("submit_consultation", { entity_type: "consultation", description: `Recorded a health consultation for resident: ${resName}` });
    toast.success("Consultation recorded and linked to resident records!");
    setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: getTodayDate(), temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" });
    fetchHistory();
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
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
          body * { visibility: hidden !important; }
          body:not(.printing-modal) #consultation-print-area,
          body:not(.printing-modal) #consultation-print-area *:not(.no-print):not(.no-print *) {
            visibility: visible !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          body:not(.printing-modal) #consultation-print-area .no-print,
          body:not(.printing-modal) #consultation-print-area .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          body:not(.printing-modal) #consultation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          body.printing-modal #consultation-modal-printable,
          body.printing-modal #consultation-modal-printable *:not(.no-print):not(.no-print *) {
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
          body.printing-modal #consultation-modal-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 15px !important;
            margin: 0 !important;
          }
          #consultation-print-area ::placeholder {
            color: transparent !important;
            opacity: 0 !important;
          }
          #consultation-print-area input[type="date"]:invalid::-webkit-datetime-edit,
          #consultation-print-area input[type="date"]:invalid::-webkit-datetime-edit-fields-wrapper {
            color: transparent !important;
            opacity: 0 !important;
          }
          #consultation-print-area input,
          #consultation-print-area textarea,
          #consultation-print-area span {
            border-bottom-color: #000000 !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          .header-seal img { height: 75px !important; mix-blend-mode: multiply !important; }
          #consultation-print-area table td, #consultation-print-area table th { padding: 3px 5px !important; font-size: 11px !important; }
          @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>

      {/* Dynamic Theme Banner */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {t("consultation.title") || "Consultation Record Form"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Record patient vitals, physical measurements, and clinical notes for Barangay Subukin health registry.
            </p>
          </div>
        </div>
      </div>

      {/* Main Consultation Form Card */}
      <Card id="consultation-print-area" className="border-border/60 shadow-md bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          
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
            
            {/* Section 1: Patient Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <UserCheck className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Patient Identification & Schedule
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Name</Label>
                  <div className="no-print">
                    <Select value={form.resident_id} onValueChange={handleSelectResident}>
                      <SelectTrigger className={lineSelectClass}>
                        <SelectValue placeholder={t("consultation.selectResident")} />
                      </SelectTrigger>
                      <SelectContent>
                        {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="hidden print:block border-b-2 border-slate-300 w-full min-h-[1.5rem] px-1 font-medium">
                    {residents.find(r => r.id === form.resident_id)?.full_name || ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.sitio")}</Label>
                  <Input className={lineInputClass} value={form.sitio} onChange={(e) => handleChange("sitio", e.target.value)} placeholder="Sitio / Area" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.date")}</Label>
                  <div className="no-print">
                    <Input className={lineInputClass} type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
                  </div>
                  <span className="hidden print:block border-b-2 border-slate-300 w-full min-h-[1.5rem] px-1 font-medium">
                    {form.date || ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.birthdate")}</Label>
                  <Input className={lineInputClass} type="text" value={form.birthdate} onChange={(e) => {
                    const bday = sanitizeDateString(e.target.value);
                    const computed = calculateAge(bday);
                    setForm(prev => ({ ...prev, birthdate: bday, age: computed > 0 ? String(computed) : prev.age }));
                  }} placeholder="YYYY-MM-DD" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.age")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="numeric" value={form.age} onKeyDown={allowOnlyNumbers} onChange={(e) => handleChange("age", sanitizeDigitsOnly(e.target.value))} placeholder="Age" />
                </div>
              </div>
            </div>

            {/* Section 2: Vitals & Physical Measurements */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Vital Signs & Physical Measurements
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.temp")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="decimal" value={form.temperature} onKeyDown={allowNumbersAndDecimal} onChange={(e) => handleChange("temperature", sanitizeDecimalNumber(e.target.value))} placeholder="36.5 °C" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.pulseRate")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="numeric" value={form.pulseRate} onKeyDown={allowOnlyNumbers} onChange={(e) => handleChange("pulseRate", sanitizeDigitsOnly(e.target.value))} placeholder="bpm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.respRate")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="numeric" value={form.respirationRate} onKeyDown={allowOnlyNumbers} onChange={(e) => handleChange("respirationRate", sanitizeDigitsOnly(e.target.value))} placeholder="bpm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.height")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="decimal" value={form.height} onKeyDown={allowNumbersAndDecimal} onChange={(e) => handleChange("height", sanitizeDecimalNumber(e.target.value))} placeholder="cm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("consultation.weight")}</Label>
                  <Input className={lineInputClass} type="text" inputMode="decimal" value={form.weight} onKeyDown={allowNumbersAndDecimal} onChange={(e) => handleChange("weight", sanitizeDecimalNumber(e.target.value))} placeholder="kg" />
                </div>
              </div>
            </div>

            {/* Section 3: Clinical Notes */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Clinical Diagnosis & Complaint
                </h3>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">{t("consultation.cause")}</Label>
                <Textarea 
                  className={lineTextareaClass} 
                  value={form.consultationCause} 
                  onChange={(e) => handleChange("consultationCause", e.target.value)} 
                  placeholder="Describe reason for consultation..." 
                  rows={3} 
                />
              </div>
            </div>

            {/* Printable Official Footer Signatures */}
            <div className="print-only pt-10 mt-8 border-t border-slate-300 flex justify-between text-xs text-slate-800">
              <div>
                Certified Correct: ___________________________<br />
                <span className="text-[10px] text-slate-600">Attending Barangay Health Worker</span>
              </div>
              <div>
                Approved By: ___________________________<br />
                <span className="text-[10px] text-slate-600">Barangay Health Supervisor / Midwife</span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-6 border-t border-border/40 flex flex-wrap items-center justify-end gap-3 no-print">
              <Button 
                type="submit" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-200 gap-2 px-6"
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Record
              </Button>

              <Button 
                type="button" 
                onClick={handleReset}
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 font-medium gap-2 px-4"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrint}
                className="border-primary/30 text-primary hover:bg-primary/10 font-semibold gap-2 px-5"
              >
                <Printer className="h-4 w-4" /> 
                Print
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SAVED CONSULTATION RECORDS HISTORY */}
      <div className="no-print pt-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold font-heading">
                  Consultation Records History
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  View, load, or re-print past patient consultation records.
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
                  placeholder="Search resident, date, sitio..."
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
                {historySearch ? "No consultation records match your search." : "No consultation records recorded yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Resident Name</TableHead>
                      <TableHead>Sitio</TableHead>
                      <TableHead>Age / Temp</TableHead>
                      <TableHead>Pulse / Resp</TableHead>
                      <TableHead className="max-w-[280px]">Diagnosis / Complaint</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((rec) => {
                      const resName = rec.residents?.full_name || "—";
                      return (
                        <TableRow key={rec.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-xs font-semibold text-primary whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {rec.consultation_date || new Date(rec.created_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {resName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.sitio || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {rec.age ? `${rec.age} yrs` : "—"} {rec.temperature ? `• ${rec.temperature}°C` : ""}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.pulse_rate ? `${rec.pulse_rate} bpm` : "—"} / {rec.respiration_rate ? `${rec.respiration_rate} bpm` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={rec.consultation_cause || ""}>
                            {rec.consultation_cause || "—"}
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
                                    birthdate: rec.birthdate || "",
                                    age: rec.age ? String(rec.age) : "",
                                    sitio: rec.sitio || "",
                                    date: rec.consultation_date || getTodayDate(),
                                    temperature: rec.temperature || "",
                                    pulseRate: rec.pulse_rate || "",
                                    respirationRate: rec.respiration_rate || "",
                                    height: rec.height || "",
                                    weight: rec.weight || "",
                                    consultationCause: rec.consultation_cause || "",
                                  });
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                  toast.info(`Loaded consultation record for ${resName}`);
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
        <DialogContent className="max-w-3xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 p-6 max-h-[90vh] overflow-y-auto">
          {selectedRecordForView && (
            <div className="space-y-5" id="consultation-modal-printable">
              <DialogHeader className="border-b pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={sanjuanLogo} alt="San Juan Logo" className="h-10 w-10 object-contain" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Republic of the Philippines • Municipality of San Juan
                      </h4>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        BARANGAY SUBUKIN HEALTH CENTER
                      </h3>
                      <p className="text-[11px] text-primary font-semibold">Official Patient Consultation Record</p>
                    </div>
                  </div>
                  <img src={barangayLogo} alt="Barangay Logo" className="h-10 w-10 object-contain" />
                </div>
              </DialogHeader>

              {/* Patient Demographics */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Patient Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Patient Full Name:</span>
                    <strong className="text-sm text-slate-900 dark:text-slate-100">
                      {selectedRecordForView.residents?.full_name || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Consultation Date:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedRecordForView.consultation_date || new Date(selectedRecordForView.created_at).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Sitio / Area:</span>
                    <span className="font-semibold">{selectedRecordForView.sitio || "Subukin"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Birthdate:</span>
                    <span>{selectedRecordForView.birthdate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Age:</span>
                    <span className="font-semibold">{selectedRecordForView.age ? `${selectedRecordForView.age} yrs old` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Vital Signs & Physical Measurements */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Vital Signs &amp; Measurements
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Body Temp:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRecordForView.temperature ? `${selectedRecordForView.temperature} °C` : "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Pulse Rate:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRecordForView.pulse_rate ? `${selectedRecordForView.pulse_rate} bpm` : "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Respiration Rate:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRecordForView.respiration_rate ? `${selectedRecordForView.respiration_rate} bpm` : "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Height:</span>
                    <span>{selectedRecordForView.height ? `${selectedRecordForView.height} cm` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Weight:</span>
                    <span>{selectedRecordForView.weight ? `${selectedRecordForView.weight} kg` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Clinical Diagnosis / Reason for Consultation
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedRecordForView.consultation_cause || "No specific complaints recorded."}
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
                <span className="text-[10px] text-slate-500">Record ID: {selectedRecordForView.id}</span>
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

export default ConsultationForm;
