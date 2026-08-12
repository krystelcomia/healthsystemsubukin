import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ClipboardList,
  Stethoscope,
  Activity,
  Bug,
  HeartPulse,
  Baby,
  Syringe,
  FileText,
  Printer,
  Eye,
  Search,
  Layers,
  Sparkles,
  ChevronRight,
  RefreshCw,
  X,
  FileCheck,
  Building2,
  Calendar,
  User,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

interface FormMeta {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  table: string;
  color: string;
  badgeBg: string;
  columns: string[];
}

const BASE_FORM_GALLERY: FormMeta[] = [
  {
    id: "family_data",
    title: "Family Data Form",
    category: "Demographics & Census",
    description: "Official household census form recording family structures, heads of households, and sitios.",
    icon: ClipboardList,
    table: "family_data",
    color: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    columns: ["family_number", "father_name", "mother_name", "num_males", "num_females", "total_members"],
  },
  {
    id: "consultations",
    title: "Medical Consultation Form",
    category: "Primary Health Care",
    description: "Tracks individual patient consultations, complaints, vital signs, and health assessments.",
    icon: Stethoscope,
    table: "consultations",
    color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    columns: ["consultation_date", "consultation_cause", "temperature", "pulse_rate", "weight", "height"],
  },
  {
    id: "philpen_health",
    title: "PhilPen Risk Assessment Form",
    category: "Non-Communicable Diseases",
    description: "Screening form for hypertension, diabetes, and lifestyle risk factors under DOH PhilPen protocol.",
    icon: Activity,
    table: "philpen_health",
    color: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    columns: ["record_date", "bp", "bmi", "weight", "height", "smokes", "drinks_alcohol"],
  },
  {
    id: "dengue_prevention",
    title: "Dengue Larval Inspection Form",
    category: "Environmental Sanitation",
    description: "Community surveillance form for breeding container inspections and vector prevention.",
    icon: Bug,
    table: "dengue_prevention",
    color: "border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/5",
    badgeBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    columns: ["household_name", "container_type", "has_larvae", "action_plan"],
  },
  {
    id: "maternal_care",
    title: "Maternal Health & Prenatal Form",
    category: "Maternal & Child Health",
    description: "Obstetric scoring, trimester checkups, risk factor identification, and prenatal care tracking.",
    icon: HeartPulse,
    table: "maternal_care",
    color: "border-pink-500/30 text-pink-600 dark:text-pink-400 bg-pink-500/5",
    badgeBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    columns: ["family_number", "patient_last_name", "patient_first_name", "age", "sitio", "blood_type"],
  },
  {
    id: "child_health",
    title: "Child Health & Immunization Form",
    category: "Pediatric Care",
    description: "Integrated Management of Childhood Illness (IMCI), growth monitoring, and vaccine records.",
    icon: Baby,
    table: "child_health",
    color: "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    columns: ["fn_number", "first_name", "surname", "dob", "sex", "mother_name", "father_name"],
  },
  {
    id: "family_planning",
    title: "Family Planning Service Form",
    category: "Reproductive Health",
    description: "Contraceptive method counseling, supply distribution, and reproductive health monitoring.",
    icon: Syringe,
    table: "family_planning",
    color: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    columns: ["method", "start_date", "remarks"],
  },
];

const AdminHealthRecords = () => {
  const { t } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Form Submissions Modal State
  const [selectedForm, setSelectedForm] = useState<FormMeta | null>(null);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [formRecords, setFormRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");

  // Single Record View Modal State
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [singleRecordModalOpen, setSingleRecordModalOpen] = useState(false);

  // Custom forms
  const [customForms, setCustomForms] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bhw_custom_forms") || "[]");
      setCustomForms(stored);
    } catch {
      setCustomForms([]);
    }
    fetchFormCounts();
  }, []);

  const fetchFormCounts = async () => {
    setLoadingCounts(true);
    const newCounts: Record<string, number> = {};

    for (const form of BASE_FORM_GALLERY) {
      try {
        const { count } = await (supabase.from as any)(form.table).select("id", { count: "exact", head: true });
        newCounts[form.id] = count || 0;
      } catch {
        newCounts[form.id] = 0;
      }
    }
    setCounts(newCounts);
    setLoadingCounts(false);
  };

  const handleOpenFormRecords = async (form: FormMeta) => {
    setSelectedForm(form);
    setRecordsModalOpen(true);
    setLoadingRecords(true);
    setRecordSearch("");

    try {
      const { data } = await (supabase.from as any)(form.table)
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });
      setFormRecords(data || []);
    } catch {
      toast.error("Failed to load form entries");
    }
    setLoadingRecords(false);
  };

  const handleViewSingleRecord = (record: any) => {
    setSelectedRecord(record);
    setSingleRecordModalOpen(true);
  };

  const getFormPrintOrientation = (formId: string) => {
    if (formId === "child_health") {
      return { size: "legal landscape", margin: "5mm" };
    }
    if (formId === "family_planning") {
      return { size: "legal portrait", margin: "6mm" };
    }
    if (formId === "dengue_prevention" || formId === "maternal_care") {
      return { size: "A4 portrait", margin: "4mm" };
    }
    return { size: "A4 portrait", margin: "5mm" };
  };

  const handlePrintBlankForm = (form: FormMeta) => {
    const win = window.open("", "_blank");
    if (!win) return;

    const { size, margin } = getFormPrintOrientation(form.id);

    win.document.write(`<!DOCTYPE html><html><head><title>Blank Form — ${form.title}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; padding:25px; color:#111; font-size:12px; }
        .header-seal { display:flex; align-items:center; justify-content:center; gap:24px; border-bottom:4px double #000; padding-bottom:14px; margin-bottom:20px; text-align:center; }
        .header-seal img { height:75px; width:auto; object-fit:contain; mix-blend-mode:multiply; }
        .form-title { font-size:18px; font-weight:bold; text-align:center; margin:16px 0; text-transform:uppercase; letter-spacing:1px; }
        .grid-section { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .field-group { border:1px solid #ccc; padding:10px; border-radius:4px; }
        .field-label { font-size:10px; font-weight:bold; text-transform:uppercase; color:#555; margin-bottom:4px; }
        .line-fill { border-bottom:1px solid #000; min-height:20px; display:block; margin-top:2px; }
        table { width:100%; border-collapse:collapse; margin-top:16px; }
        th, td { border:1px solid #000; padding:8px; text-align:left; font-size:11px; }
        th { background:#f3f4f6; font-weight:bold; text-transform:uppercase; }
        .footer { margin-top:40px; display:flex; justify-content:space-between; font-size:11px; }
        @page { size: ${size}; margin: ${margin}; }
      </style>
    </head><body>
      <div class="header-seal">
        <img src="${sanjuanLogo}" alt="San Juan Seal" />
        <img src="${headerTextImg}" alt="Header Text" />
        <img src="${barangayLogo}" alt="Barangay Subukin Logo" />
      </div>
      <div class="form-title">${form.title}</div>
      <p style="text-align:center;font-style:italic;margin-bottom:20px;color:#666;">Official Barangay Health Assessment & Registration Document</p>
      
      <div class="grid-section">
        <div class="field-group">
          <div class="field-label">Resident / Patient Full Name</div>
          <div class="line-fill"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Filing</div>
          <div class="line-fill"></div>
        </div>
      </div>

      <div class="grid-section">
        <div class="field-group">
          <div class="field-label">Sitio / Address</div>
          <div class="line-fill"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Attending Health Worker / Midwife</div>
          <div class="line-fill"></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            ${form.columns.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `
            <tr>
              <td>${i}</td>
              ${form.columns.map(() => `<td></td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:24px;" class="field-group">
        <div class="field-label">Remarks / Diagnostic Notes</div>
        <div class="line-fill" style="min-height:60px;"></div>
      </div>

      <div class="footer">
        <div>Certified Correct: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Health Worker</span></div>
        <div>Approved By: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Midwife / Supervisor</span></div>
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const handlePrintRecordsLedger = () => {
    if (!selectedForm) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const { size, margin } = getFormPrintOrientation(selectedForm.id);
    const cols = selectedForm.columns;

    win.document.write(`<!DOCTYPE html><html><head><title>${selectedForm.title} Records</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; padding:25px; color:#1a1a1a; font-size:12px; }
        .header-seal { display:flex; align-items:center; justify-content:center; gap:24px; border-bottom:4px double #000; padding-bottom:14px; margin-bottom:20px; text-align:center; }
        .header-seal img { height:75px; width:auto; object-fit:contain; mix-blend-mode:multiply; }
        .report-title { text-align:center; font-size:18px; font-weight:bold; text-transform:uppercase; margin-bottom:16px; color:#111; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th, td { border:1px solid #d1d5db; padding:6px 10px; text-align:left; font-size:11px; }
        th { background:#f5f3ff; color:#4f46e5; font-weight:600; text-transform:capitalize; }
        .footer { text-align:right; font-size:10px; color:#6b7280; margin-top:20px; }
        @page { size: ${size}; margin: ${margin}; }
      </style>
    </head><body>
      <div class="header-seal">
        <img src="${sanjuanLogo}" alt="San Juan Seal" />
        <img src="${headerTextImg}" alt="Header Text" />
        <img src="${barangayLogo}" alt="Barangay Subukin Logo" />
      </div>
      <div class="report-title">${selectedForm.title} &mdash; Submissions Archive</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Resident Name</th>
            ${cols.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredFormRecords.map((r, i) => {
            const name = r.residents?.full_name || r.patient_name || (r.first_name ? `${r.first_name} ${r.surname || ""}` : "—");
            return `<tr>
              <td>${i + 1}</td>
              <td>${name}</td>
              ${cols.map(c => `<td>${r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}</td>`).join("")}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="footer">Report Generated: ${new Date().toLocaleString()} &bull; Total Entries: ${filteredFormRecords.length}</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const handlePrintSingleFilledRecord = () => {
    if (!selectedRecord || !selectedForm) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const { size, margin } = getFormPrintOrientation(selectedForm.id);
    const resName = selectedRecord.residents?.full_name || selectedRecord.patient_name || (selectedRecord.first_name ? `${selectedRecord.first_name} ${selectedRecord.surname || ""}` : "Unlinked Resident");

    win.document.write(`<!DOCTYPE html><html><head><title>Filled Record — ${resName}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; padding:25px; color:#111; font-size:12px; }
        .header-seal { display:flex; align-items:center; justify-content:center; gap:24px; border-bottom:4px double #000; padding-bottom:14px; margin-bottom:20px; text-align:center; }
        .header-seal img { height:75px; width:auto; object-fit:contain; mix-blend-mode:multiply; }
        .title { font-size:18px; font-weight:bold; text-align:center; margin:14px 0; text-transform:uppercase; }
        .card { border:1px solid #999; padding:14px; margin-bottom:14px; border-radius:4px; }
        .label { font-size:10px; font-weight:bold; text-transform:uppercase; color:#666; }
        .val { font-size:13px; font-weight:bold; margin-top:2px; color:#000; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @page { size: ${size}; margin: ${margin}; }
      </style>
    </head><body>
      <div class="header-seal">
        <img src="${sanjuanLogo}" alt="San Juan Seal" />
        <img src="${headerTextImg}" alt="Header Text" />
        <img src="${barangayLogo}" alt="Barangay Subukin Logo" />
      </div>
      <div class="title">${selectedForm.title} Entry Sheet</div>
      
      <div class="card">
        <div class="label">Patient / Resident Name</div>
        <div class="val">${resName}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="label">Submission Date</div>
          <div class="val">${selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "—"}</div>
        </div>
        <div class="card">
          <div class="label">Sitio / Location</div>
          <div class="val">${selectedRecord.sitio || "Subukin"}</div>
        </div>
      </div>
      <div class="title">${selectedForm.title} Entry Sheet</div>
      
      <div class="card">
        <div class="label">Patient / Resident Name</div>
        <div class="val">${resName}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="label">Submission Date</div>
          <div class="val">${selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "—"}</div>
        </div>
        <div class="card">
          <div class="label">Sitio / Location</div>
          <div class="val">${selectedRecord.sitio || "Subukin"}</div>
        </div>
      </div>

      <div class="card">
        <div class="label">Detailed Record Values</div>
        <div style="margin-top:8px;">
          ${selectedForm.columns.map(c => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;">
              <span style="text-transform:capitalize;color:#555;">${c.replace(/_/g, " ")}:</span>
              <strong>${selectedRecord[c] === true ? "Yes" : selectedRecord[c] === false ? "No" : selectedRecord[c] || "—"}</strong>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;">
        <div>Health Worker Inspector: ____________________</div>
        <div>Barangay Supervisor: ____________________</div>
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const filteredForms = BASE_FORM_GALLERY.filter(
    (f) =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFormRecords = formRecords.filter((r) => {
    const resName = r.residents?.full_name || r.patient_name || r.first_name || r.father_name || "";
    return resName.toLowerCase().includes(recordSearch.toLowerCase());
  });

  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-sidebar-background p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md bg-white/10 text-white border-white/20">
              <Layers className="h-3.5 w-3.5" />
              System Forms Gallery
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-white">
              View Forms & Templates
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Browse all official barangay health forms. You can inspect submitted entries or generate clean printable blank form templates in read-only mode.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3.5 py-1.5 text-xs font-semibold">
              <FileCheck className="h-3.5 w-3.5 mr-1.5" />
              {BASE_FORM_GALLERY.length + customForms.length} Active Forms
            </Badge>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search forms by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-10 text-xs bg-card"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground self-start sm:self-center">
          Showing <strong className="text-foreground">{filteredForms.length}</strong> standard form template(s)
        </p>
      </div>

      {/* Forms Grid Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredForms.map((form) => {
          const FormIcon = form.icon;
          const totalSubmissions = counts[form.id] ?? 0;
          return (
            <Card key={form.id} className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div>
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-xl border ${form.color} shrink-0`}>
                      <FormIcon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[11px] font-semibold ${form.badgeBg}`}>
                      {loadingCounts ? "..." : `${totalSubmissions} Record${totalSubmissions !== 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">{form.category}</span>
                    <CardTitle className="text-base font-heading font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
                      {form.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 text-xs text-muted-foreground leading-relaxed">
                  {form.description}
                </CardContent>
              </div>

              <div className="p-4 pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintBlankForm(form)}
                    className="text-xs h-8 gap-1 hover:bg-primary/10 hover:text-primary border-border/80"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Blank Form
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenFormRecords(form)}
                    className="text-xs h-8 gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Records
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Custom Forms Section */}
      {customForms.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/60">
          <h2 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Custom Created Health Forms ({customForms.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customForms.map((cf) => (
              <Card key={cf.id} className="border-border/60 shadow-xs p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{cf.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{cf.fields?.length || 0} custom fields</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Viewing custom form template: ${cf.title}`)}
                  className="text-xs h-7 gap-1"
                >
                  <Eye className="h-3 w-3" /> Inspect
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ================= FORM SUBMISSIONS DIALOG ================= */}
      <Dialog open={recordsModalOpen} onOpenChange={setRecordsModalOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 bg-card border-border shadow-xl">
          {selectedForm && (
            <div className="space-y-4">
              <DialogHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between gap-4">
                <div>
                  <Badge variant="outline" className={`text-[10px] mb-1 font-semibold ${selectedForm.badgeBg}`}>
                    {selectedForm.category}
                  </Badge>
                  <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                    {selectedForm.title} Submissions
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Read-only view of all recorded entries for this form.
                  </DialogDescription>
                </div>

                <Button size="sm" variant="outline" onClick={handlePrintRecordsLedger} className="gap-1.5 text-xs shrink-0">
                  <Printer className="h-3.5 w-3.5" /> Print Records Ledger
                </Button>
              </DialogHeader>

              {/* Modal Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by resident name..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="pl-9 text-xs h-8"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Showing <strong>{filteredFormRecords.length}</strong> entry/entries
                </span>
              </div>

              {/* Records Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/50 text-muted-foreground font-semibold">
                        <th className="p-3 text-left w-12">#</th>
                        <th className="p-3 text-left">Resident Name</th>
                        {selectedForm.columns.map((c) => (
                          <th key={c} className="p-3 text-left capitalize">
                            {c.replace(/_/g, " ")}
                          </th>
                        ))}
                        <th className="p-3 text-center w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRecords ? (
                        <tr>
                          <td colSpan={selectedForm.columns.length + 3} className="p-8 text-center text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                            Loading form submissions...
                          </td>
                        </tr>
                      ) : filteredFormRecords.length === 0 ? (
                        <tr>
                          <td colSpan={selectedForm.columns.length + 3} className="p-8 text-center text-muted-foreground italic">
                            No records found for this form.
                          </td>
                        </tr>
                      ) : (
                        filteredFormRecords.map((r, i) => {
                          const name = r.residents?.full_name || r.patient_name || (r.first_name ? `${r.first_name} ${r.surname || ""}` : "Unlinked Resident");
                          return (
                            <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                              <td className="p-3 font-bold text-foreground">{name}</td>
                              {selectedForm.columns.map((c) => (
                                <td key={c} className="p-3 text-foreground">
                                  {r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}
                                </td>
                              ))}
                              <td className="p-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewSingleRecord(r)}
                                  className="h-7 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary"
                                >
                                  <Eye className="h-3 w-3" /> Inspect Sheet
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= SINGLE FILLED RECORD INSPECTOR MODAL ================= */}
      <Dialog open={singleRecordModalOpen} onOpenChange={setSingleRecordModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-card border-border shadow-xl">
          {selectedRecord && selectedForm && (
            <div className="space-y-4">
              <DialogHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between">
                <div>
                  <Badge variant="outline" className={`text-[10px] mb-1 font-semibold ${selectedForm.badgeBg}`}>
                    Readonly Patient Document Sheet
                  </Badge>
                  <DialogTitle className="text-lg font-heading font-bold text-foreground">
                    {selectedForm.title} Entry
                  </DialogTitle>
                </div>

                <Button size="sm" onClick={handlePrintSingleFilledRecord} className="gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </Button>
              </DialogHeader>

              <Card className="border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Patient Name</span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedRecord.residents?.full_name || selectedRecord.patient_name || selectedRecord.first_name || "Unlinked Resident"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
                  <span>Record Date / Timestamp</span>
                  <span className="font-mono text-foreground">
                    {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString() : "—"}
                  </span>
                </div>
              </Card>

              {/* Data attributes list */}
              <div className="space-y-2 border border-border/60 rounded-xl p-4 bg-card">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3">
                  Recorded Attributes
                </h4>
                <div className="space-y-2 divide-y divide-border/30">
                  {selectedForm.columns.map((col) => (
                    <div key={col} className="flex items-center justify-between text-xs pt-2">
                      <span className="capitalize text-muted-foreground font-medium">{col.replace(/_/g, " ")}:</span>
                      <strong className="text-foreground">
                        {selectedRecord[col] === true ? "Yes" : selectedRecord[col] === false ? "No" : selectedRecord[col] || "—"}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHealthRecords;
