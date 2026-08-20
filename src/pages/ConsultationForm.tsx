import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Stethoscope, Printer, RefreshCw, UserCheck, Activity, FileText, CheckCircle2 } from "lucide-react";
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

  useEffect(() => { 
    getFamilyOnlyResidents().then((data) => setResidents(data || [])); 
  }, []);

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
          #consultation-print-area, #consultation-print-area *:not(.no-print):not(.no-print *) {
            visibility: visible !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          #consultation-print-area .no-print, #consultation-print-area .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          #consultation-print-area {
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
    </div>
  );
};

export default ConsultationForm;
