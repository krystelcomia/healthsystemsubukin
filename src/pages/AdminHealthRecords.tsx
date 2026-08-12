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

  const [printContent, setPrintContent] = useState<{ title: string; html: string; orientation: string } | null>(null);

  const getFormPrintOrientation = (formId: string) => {
    if (formId === "child_health") {
      return "legal landscape";
    }
    if (formId === "family_planning") {
      return "legal portrait";
    }
    return "A4 portrait";
  };

  const triggerInSystemPrint = (title: string, html: string, orientation: string) => {
    setPrintContent({ title, html, orientation });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintBlankForm = (form: FormMeta) => {
    const orientation = getFormPrintOrientation(form.id);

    if (form.id === "consultation") {
      const html = `
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:10px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          PATIENT IDENTIFICATION &amp; SCHEDULE
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 12;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Resident *</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Sitio</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Date</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Birthdate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Age</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          VITAL SIGNS &amp; PHYSICAL MEASUREMENTS
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Temp (&deg;C)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Pulse Rate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Resp. Rate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Height (cm)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Weight (kg)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          CLINICAL DIAGNOSIS &amp; COMPLAINT
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 12;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Consultation Cause / Complaint</div>
            <div style="border-bottom:1.5px solid #000;min-height:80px;"></div>
          </div>
        </div>

        <div style="margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#000000;">
          <div>Certified Correct: ___________________________<br/><span style="font-size:9px;color:#666666;">Attending Barangay Health Worker</span></div>
          <div>Approved By: ___________________________<br/><span style="font-size:9px;color:#666666;">Barangay Health Supervisor / Midwife</span></div>
        </div>
      `;
      triggerInSystemPrint(`Blank Form — ${form.title}`, html, orientation);
      return;
    }

    if (form.id === "family_data") {
      const html = `
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          HOUSEHOLD &amp; LOCATION IDENTIFICATION
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Family Number *</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Sitio</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Father's Name (Household Head)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Mother's Name</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;"></div>
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;padding:8px 12px;border-radius:4px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;">Generated File Folder Name:</div>
          <div style="font-family:monospace;font-size:12px;font-weight:700;color:#78350f;margin-top:2px;">FN - Father's Name</div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          INITIAL FAMILY MEMBERS
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:12px;margin-bottom:20px;font-size:11px;">
          <thead>
            <tr style="background:#f3f4f6;border-bottom:2px solid #000;">
              <th style="border:1px solid #000;padding:6px;text-align:center;width:30px;">#</th>
              <th style="border:1px solid #000;padding:6px;text-align:left;">Full Name</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;">Birthday</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;width:50px;">Age</th>
              <th style="border:1px solid #000;padding:6px;text-align:left;">Role</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;">Gender</th>
            </tr>
          </thead>
          <tbody>
            ${[1, 2, 3, 4, 5, 6].map(i => `
              <tr>
                <td style="border:1px solid #000;padding:8px;text-align:center;">${i}</td>
                <td style="border:1px solid #000;padding:8px;"></td>
                <td style="border:1px solid #000;padding:8px;"></td>
                <td style="border:1px solid #000;padding:8px;"></td>
                <td style="border:1px solid #000;padding:8px;"></td>
                <td style="border:1px solid #000;padding:8px;"></td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;">
          <div>Certified Correct: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Health Worker</span></div>
          <div>Approved By: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Midwife / Supervisor</span></div>
        </div>
      `;
      triggerInSystemPrint(`Blank Form — ${form.title}`, html, orientation);
      return;
    }

    if (form.id === "philpen_health" || form.id === "philpen") {
      const html = `
        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-top:8px;margin-bottom:14px;border-bottom:1.5px solid #000000;padding-bottom:12px;">
          <div style="grid-column:span 7;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Name:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Address/Sitio:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Age:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Birthdate:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Date:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
          </div>

          <div style="grid-column:span 5;display:flex;flex-direction:column;gap:8px;border-left:1px solid #000000;padding-left:16px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">BP:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">Ht:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">Wt:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">BMI:</span>
              <div style="border-bottom:1px dashed #000;flex:1;min-height:20px;"></div>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:12px;margin-bottom:20px;font-size:11px;">
          <thead>
            <tr style="background:#fdf2f4;border-bottom:2px solid #000;">
              <th style="border:1px solid #000;padding:6px 8px;text-align:left;width:55%;">Description/Question</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:10%;">Yes</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:10%;">No</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:left;width:25%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">1. Naninigarilyo?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;">Ilang stick kada araw: ________</td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">2. Manginginom?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">3. Tumataas ba ang BP?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;font-size:10px;">
                &bull; If yes, ano BP mo: _______<br/>
                &bull; Ano gamot iniinom: _______<br/>
                &bull; Naninikip ba dibdib mo: _______
              </td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="border:1px solid #000;padding:6px 8px;font-weight:700;">4. May sintomas ba ng diabetes?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:6px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Palakain</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Palaging gutom</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Madalas umihi sa madaling araw?</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Laging uhaw</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;text-align:center;"></td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;color:#000000;">
          <div>Certified Correct: ___________________________<br/><span style="font-size:9px;color:#666666;">Attending Barangay Health Worker</span></div>
          <div>Approved By: ___________________________<br/><span style="font-size:9px;color:#666666;">Barangay Health Supervisor / Midwife</span></div>
        </div>
      `;
      triggerInSystemPrint(`Blank Form — ${form.title}`, html, orientation);
      return;
    }

    const html = `
      <div style="text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;margin:16px 0;letter-spacing:1px;">${form.title}</div>
      <p style="text-align:center;font-style:italic;margin-bottom:20px;color:#666;">Official Barangay Health Assessment & Registration Document</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="border:1px solid #ccc;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:4px;">Resident / Patient Full Name</div>
          <div style="border-bottom:1px solid #000;min-height:20px;display:block;margin-top:2px;"></div>
        </div>
        <div style="border:1px solid #ccc;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:4px;">Date of Filing</div>
          <div style="border-bottom:1px solid #000;min-height:20px;display:block;margin-top:2px;"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="border:1px solid #ccc;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:4px;">Sitio / Address</div>
          <div style="border-bottom:1px solid #000;min-height:20px;display:block;margin-top:2px;"></div>
        </div>
        <div style="border:1px solid #ccc;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:4px;">Attending Health Worker / Midwife</div>
          <div style="border-bottom:1px solid #000;min-height:20px;display:block;margin-top:2px;"></div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead>
          <tr>
            <th style="width:40px;border:1px solid #000;padding:8px;text-align:left;background:#f3f4f6;">#</th>
            ${form.columns.map(c => `<th style="border:1px solid #000;padding:8px;text-align:left;background:#f3f4f6;text-transform:uppercase;">${c.replace(/_/g, " ")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `
            <tr>
              <td style="border:1px solid #000;padding:8px;">${i}</td>
              ${form.columns.map(() => `<td style="border:1px solid #000;padding:8px;"></td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:24px;border:1px solid #ccc;padding:10px;border-radius:4px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:4px;">Remarks / Diagnostic Notes</div>
        <div style="border-bottom:1px solid #000;min-height:60px;display:block;margin-top:2px;"></div>
      </div>

      <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;">
        <div>Certified Correct: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Health Worker</span></div>
        <div>Approved By: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Midwife / Supervisor</span></div>
      </div>
    `;
    triggerInSystemPrint(`Blank Form — ${form.title}`, html, orientation);
  };

  const handlePrintRecordsLedger = () => {
    if (!selectedForm) return;
    const orientation = getFormPrintOrientation(selectedForm.id);
    const cols = selectedForm.columns;

    const html = `
      <div style="text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;margin-bottom:16px;">${selectedForm.title} &mdash; Submissions Archive</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;background:#f5f3ff;">#</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;background:#f5f3ff;">Resident Name</th>
            ${cols.map(c => `<th style="border:1px solid #000;padding:6px 10px;text-align:left;background:#f5f3ff;text-transform:capitalize;">${c.replace(/_/g, " ")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${filteredFormRecords.map((r, i) => {
            const name = r.residents?.full_name || r.patient_name || (r.first_name ? `${r.first_name} ${r.surname || ""}` : "—");
            return `<tr>
              <td style="border:1px solid #000;padding:6px 10px;">${i + 1}</td>
              <td style="border:1px solid #000;padding:6px 10px;font-weight:bold;">${name}</td>
              ${cols.map(c => `<td style="border:1px solid #000;padding:6px 10px;">${r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}</td>`).join("")}
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div style="text-align:right;font-size:10px;color:#6b7280;margin-top:20px;">Report Generated: ${new Date().toLocaleString()} &bull; Total Entries: ${filteredFormRecords.length}</div>
    `;
    triggerInSystemPrint(`${selectedForm.title} Records`, html, orientation);
  };

  const handlePrintSingleFilledRecord = () => {
    if (!selectedRecord || !selectedForm) return;
    const orientation = getFormPrintOrientation(selectedForm.id);
    const resName = selectedRecord.residents?.full_name || selectedRecord.patient_name || (selectedRecord.first_name ? `${selectedRecord.first_name} ${selectedRecord.surname || ""}` : "Unlinked Resident");

    if (selectedForm.id === "consultation") {
      const html = `
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:10px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          PATIENT IDENTIFICATION &amp; SCHEDULE
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 12;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Resident *</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${resName}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Sitio</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.sitio || ""}</div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Date</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.consultation_date || (selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "")}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Birthdate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.birthdate || ""}</div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Age</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.age || ""}</div>
          </div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          VITAL SIGNS &amp; PHYSICAL MEASUREMENTS
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Temp (&deg;C)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.temperature || ""}</div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Pulse Rate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.pulse_rate || ""}</div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Resp. Rate</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.respiration_rate || ""}</div>
          </div>
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Height (cm)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.height || ""}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 3;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Weight (kg)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.weight || ""}</div>
          </div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          CLINICAL DIAGNOSIS &amp; COMPLAINT
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 12;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Consultation Cause / Complaint</div>
            <div style="border-bottom:1.5px solid #000;min-height:80px;font-size:12px;font-weight:500;white-space:pre-wrap;">${selectedRecord.consultation_cause || ""}</div>
          </div>
        </div>

        <div style="margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#000000;">
          <div>Certified Correct: ___________________________<br/><span style="font-size:9px;color:#666666;">Attending Barangay Health Worker</span></div>
          <div>Approved By: ___________________________<br/><span style="font-size:9px;color:#666666;">Barangay Health Supervisor / Midwife</span></div>
        </div>
      `;
      triggerInSystemPrint(`Filled Record — ${resName}`, html, orientation);
      return;
    }

    if (selectedForm.id === "family_data") {
      const membersList = Array.isArray(selectedRecord.members_detail)
        ? selectedRecord.members_detail
        : typeof selectedRecord.members_detail === "string"
        ? (JSON.parse(selectedRecord.members_detail || "[]") as any[])
        : [];

      const html = `
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          HOUSEHOLD &amp; LOCATION IDENTIFICATION
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Family Number *</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.family_number || "—"}</div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Sitio</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.sitio || "—"}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-bottom:14px;">
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Father's Name (Household Head)</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.father_name || "—"}</div>
          </div>
          <div style="grid-column:span 6;">
            <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:4px;">Mother's Name</div>
            <div style="border-bottom:1.5px solid #000;min-height:24px;font-size:12px;font-weight:600;">${selectedRecord.mother_name || "—"}</div>
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;padding:8px 12px;border-radius:4px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;">Generated File Folder Name:</div>
          <div style="font-family:monospace;font-size:12px;font-weight:700;color:#78350f;margin-top:2px;">${selectedRecord.family_number || "FN"} - ${selectedRecord.father_name || "Father's Name"}</div>
        </div>

        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#000000;border-bottom:1.5px solid #000000;padding-bottom:4px;margin-top:18px;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#000;stroke-width:2;fill:none;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          INITIAL FAMILY MEMBERS
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:12px;margin-bottom:20px;font-size:11px;">
          <thead>
            <tr style="background:#f3f4f6;border-bottom:2px solid #000;">
              <th style="border:1px solid #000;padding:6px;text-align:center;width:30px;">#</th>
              <th style="border:1px solid #000;padding:6px;text-align:left;">Full Name</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;">Birthday</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;width:50px;">Age</th>
              <th style="border:1px solid #000;padding:6px;text-align:left;">Role</th>
              <th style="border:1px solid #000;padding:6px;text-align:center;">Gender</th>
            </tr>
          </thead>
          <tbody>
            ${membersList.length === 0 ? `
              <tr>
                <td colspan="6" style="border:1px solid #000;padding:12px;text-align:center;color:#666;font-style:italic;">No family members listed</td>
              </tr>
            ` : membersList.map((m: any, i: number) => `
              <tr>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${i + 1}</td>
                <td style="border:1px solid #000;padding:6px;font-weight:bold;">${m.full_name || "—"}</td>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${m.birthday || "—"}</td>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${m.age || "—"}</td>
                <td style="border:1px solid #000;padding:6px;">${m.relationship || "—"}</td>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${m.gender || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;">
          <div>Certified Correct: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Health Worker</span></div>
          <div>Approved By: ______________________<br/><span style="font-size:9px;color:#666;">Barangay Midwife / Supervisor</span></div>
        </div>
      `;
      triggerInSystemPrint(`Filled Record — ${selectedRecord.family_number || "Family Data"}`, html, orientation);
      return;
    }

    if (selectedForm.id === "philpen_health" || selectedForm.id === "philpen") {
      const html = `
        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:16px;margin-top:8px;margin-bottom:14px;border-bottom:1.5px solid #000000;padding-bottom:12px;">
          <div style="grid-column:span 7;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Name:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${resName}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Address/Sitio:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.address || selectedRecord.sitio || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Age:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.age || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Birthdate:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.birthdate || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:95px;">Date:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.record_date || (selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "")}</div>
            </div>
          </div>

          <div style="grid-column:span 5;display:flex;flex-direction:column;gap:8px;border-left:1px solid #000000;padding-left:16px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">BP:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.bp || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">Ht:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.height || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">Wt:</span>
              <div style="border-bottom:1px solid #000;flex:1;min-height:20px;font-weight:600;">${selectedRecord.weight || ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <span style="font-weight:700;width:45px;">BMI:</span>
              <div style="border-bottom:1px dashed #000;flex:1;min-height:20px;font-weight:700;">${selectedRecord.bmi || ""}</div>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:12px;margin-bottom:20px;font-size:11px;">
          <thead>
            <tr style="background:#fdf2f4;border-bottom:2px solid #000;">
              <th style="border:1px solid #000;padding:6px 8px;text-align:left;width:55%;">Description/Question</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:10%;">Yes</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:10%;">No</th>
              <th style="border:1px solid #000;padding:6px 8px;text-align:left;width:25%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">1. Naninigarilyo?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.smokes ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.smokes_no ? "✓" : (!selectedRecord.smokes ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:6px;">${selectedRecord.smokes_remarks ? `Ilang stick kada araw: ${selectedRecord.smokes_remarks}` : ""}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">2. Manginginom?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.drinks_alcohol ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.drinks_alcohol_no ? "✓" : (!selectedRecord.drinks_alcohol ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:6px;">${selectedRecord.drinks_remarks || ""}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:6px 8px;font-weight:600;">3. Tumataas ba ang BP?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.high_bp ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.high_bp_no ? "✓" : (!selectedRecord.high_bp ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:6px;font-size:10px;">
                ${selectedRecord.bp_remarks_bp ? `&bull; If yes, ano BP mo: ${selectedRecord.bp_remarks_bp}<br/>` : ""}
                ${selectedRecord.bp_remarks_meds ? `&bull; Ano gamot iniinom: ${selectedRecord.bp_remarks_meds}<br/>` : ""}
                ${selectedRecord.bp_remarks_chest ? `&bull; Naninikip ba dibdib mo: ${selectedRecord.bp_remarks_chest}` : ""}
              </td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="border:1px solid #000;padding:6px 8px;font-weight:700;">4. May sintomas ba ng diabetes?</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.diabetes ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_no ? "✓" : (!selectedRecord.diabetes ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:6px;">${selectedRecord.diabetes_remarks || ""}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Palakain</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_palakain ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_palakain_no ? "✓" : (!selectedRecord.diabetes_palakain ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Palaging gutom</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_palaging_gutom ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_palaging_gutom_no ? "✓" : (!selectedRecord.diabetes_palaging_gutom ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Madalas umihi sa madaling araw?</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_madalas_umihi ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_madalas_umihi_no ? "✓" : (!selectedRecord.diabetes_madalas_umihi ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
            <tr>
              <td style="border:1px solid #000;padding:5px 8px 5px 20px;">&bull; Laging uhaw</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_laging_uhaw ? "✓" : ""}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;">${selectedRecord.diabetes_laging_uhaw_no ? "✓" : (!selectedRecord.diabetes_laging_uhaw ? "✓" : "")}</td>
              <td style="border:1px solid #000;padding:5px;"></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;color:#000000;">
          <div>Certified Correct: ___________________________<br/><span style="font-size:9px;color:#666666;">Attending Barangay Health Worker</span></div>
          <div>Approved By: ___________________________<br/><span style="font-size:9px;color:#666666;">Barangay Health Supervisor / Midwife</span></div>
        </div>
      `;
      triggerInSystemPrint(`Filled Record — ${resName}`, html, orientation);
      return;
    }

    const html = `
      <div style="font-size:18px;font-weight:bold;text-align:center;margin:14px 0;text-transform:uppercase;">${selectedForm.title} Entry Sheet</div>
      
      <div style="border:1px solid #999;padding:14px;margin-bottom:14px;border-radius:4px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#666;">Patient / Resident Name</div>
        <div style="font-size:14px;font-weight:bold;margin-top:2px;">${resName}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div style="border:1px solid #999;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#666;">Submission Date</div>
          <div style="font-size:12px;font-weight:bold;margin-top:2px;">${selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "—"}</div>
        </div>
        <div style="border:1px solid #999;padding:10px;border-radius:4px;">
          <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#666;">Sitio / Location</div>
          <div style="font-size:12px;font-weight:bold;margin-top:2px;">${selectedRecord.sitio || "Subukin"}</div>
        </div>
      </div>

      <div style="border:1px solid #999;padding:14px;border-radius:4px;">
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#666;margin-bottom:8px;">Recorded Attributes</div>
        ${selectedForm.columns.map(c => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;">
            <span style="text-transform:capitalize;color:#555;">${c.replace(/_/g, " ")}:</span>
            <strong>${selectedRecord[c] === true ? "Yes" : selectedRecord[c] === false ? "No" : selectedRecord[c] || "—"}</strong>
          </div>
        `).join("")}
      </div>

      <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;">
        <div>Health Worker Inspector: ____________________</div>
        <div>Barangay Supervisor: ____________________</div>
      </div>
    `;
    triggerInSystemPrint(`Filled Record — ${resName}`, html, orientation);
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

              {selectedForm.id === "family_data" ? (
                <div className="space-y-4 text-xs">
                  <Card className="border-border/60 bg-card p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Family Number *</span>
                        <strong className="text-foreground text-sm font-mono font-bold">{selectedRecord.family_number || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Sitio</span>
                        <strong className="text-foreground text-sm font-semibold">{selectedRecord.sitio || "Subukin"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Father (Head)</span>
                        <strong className="text-foreground text-sm font-semibold">{selectedRecord.father_name || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Mother</span>
                        <strong className="text-foreground text-sm font-semibold">{selectedRecord.mother_name || "—"}</strong>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs space-y-0.5 mt-2">
                      <span className="text-amber-800 dark:text-amber-400 font-semibold uppercase text-[10px] block">
                        Generated File Folder Name:
                      </span>
                      <span className="font-mono font-bold text-amber-900 dark:text-amber-300 text-xs md:text-sm">
                        {`${selectedRecord.family_number || "FN"} - ${selectedRecord.father_name || "Father's Name"}`}
                      </span>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                      Initial Family Members
                    </h4>
                    <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/50">
                            <th className="p-2.5 text-center w-8">#</th>
                            <th className="p-2.5 font-semibold">Full Name</th>
                            <th className="p-2.5 font-semibold text-center">Birthday</th>
                            <th className="p-2.5 font-semibold text-center w-12">Age</th>
                            <th className="p-2.5 font-semibold">Role</th>
                            <th className="p-2.5 font-semibold text-center">Gender</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const mems = Array.isArray(selectedRecord.members_detail)
                              ? selectedRecord.members_detail
                              : typeof selectedRecord.members_detail === "string"
                              ? (JSON.parse(selectedRecord.members_detail || "[]") as any[])
                              : [];
                            if (mems.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-muted-foreground italic">
                                    No family members listed
                                  </td>
                                </tr>
                              );
                            }
                            return mems.map((m: any, idx: number) => (
                              <tr key={idx} className="border-b border-border/30">
                                <td className="p-2.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                                <td className="p-2.5 font-bold text-foreground">{m.full_name || "—"}</td>
                                <td className="p-2.5 text-center">{m.birthday || "—"}</td>
                                <td className="p-2.5 text-center">{m.age || "—"}</td>
                                <td className="p-2.5">{m.relationship || "—"}</td>
                                <td className="p-2.5 text-center">{m.gender || "—"}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : selectedForm.id === "philpen_health" || selectedForm.id === "philpen" ? (
                <div className="space-y-4 text-xs">
                  <Card className="border-border/60 bg-card p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Resident Name</span>
                        <strong className="text-foreground text-sm font-bold">{selectedRecord.residents?.full_name || selectedRecord.patient_name || selectedRecord.first_name || "Unlinked Resident"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Address / Sitio</span>
                        <strong className="text-foreground text-sm font-semibold">{selectedRecord.address || selectedRecord.sitio || "Subukin"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Age / Birthdate</span>
                        <strong className="text-foreground text-sm font-semibold">{selectedRecord.age || "—"} yrs ({selectedRecord.birthdate || "—"})</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase font-bold text-[10px] block">Record Date</span>
                        <strong className="text-foreground text-sm font-mono">{selectedRecord.record_date || (selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : "—")}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40 text-center">
                      <div className="bg-muted/30 p-2 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block font-bold">BP</span>
                        <span className="font-mono font-extrabold text-foreground">{selectedRecord.bp || "—"}</span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block font-bold">HEIGHT</span>
                        <span className="font-mono font-extrabold text-foreground">{selectedRecord.height ? `${selectedRecord.height} cm` : "—"}</span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block font-bold">WEIGHT</span>
                        <span className="font-mono font-extrabold text-foreground">{selectedRecord.weight ? `${selectedRecord.weight} kg` : "—"}</span>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 p-2 rounded-lg">
                        <span className="text-[10px] text-primary block font-bold">BMI</span>
                        <span className="font-mono font-extrabold text-primary">{selectedRecord.bmi || "—"}</span>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                      Risk Assessment Checklist &amp; Remarks
                    </h4>
                    <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/50">
                            <th className="p-2.5 font-semibold w-[55%]">Description / Question</th>
                            <th className="p-2.5 font-semibold text-center w-[12%]">Yes</th>
                            <th className="p-2.5 font-semibold text-center w-[12%]">No</th>
                            <th className="p-2.5 font-semibold w-[21%]">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/30">
                            <td className="p-2.5 font-medium">1. Naninigarilyo?</td>
                            <td className="p-2.5 text-center font-bold text-primary">{selectedRecord.smokes ? "✓" : ""}</td>
                            <td className="p-2.5 text-center font-bold text-muted-foreground">{selectedRecord.smokes_no ? "✓" : (!selectedRecord.smokes ? "✓" : "")}</td>
                            <td className="p-2.5">{selectedRecord.smokes_remarks ? `Sticks: ${selectedRecord.smokes_remarks}` : "—"}</td>
                          </tr>
                          <tr className="border-b border-border/30">
                            <td className="p-2.5 font-medium">2. Manginginom?</td>
                            <td className="p-2.5 text-center font-bold text-primary">{selectedRecord.drinks_alcohol ? "✓" : ""}</td>
                            <td className="p-2.5 text-center font-bold text-muted-foreground">{selectedRecord.drinks_alcohol_no ? "✓" : (!selectedRecord.drinks_alcohol ? "✓" : "")}</td>
                            <td className="p-2.5">{selectedRecord.drinks_remarks || "—"}</td>
                          </tr>
                          <tr className="border-b border-border/30">
                            <td className="p-2.5 font-medium">3. Tumataas ba ang BP?</td>
                            <td className="p-2.5 text-center font-bold text-primary">{selectedRecord.high_bp ? "✓" : ""}</td>
                            <td className="p-2.5 text-center font-bold text-muted-foreground">{selectedRecord.high_bp_no ? "✓" : (!selectedRecord.high_bp ? "✓" : "")}</td>
                            <td className="p-2.5 text-[11px]">
                              {selectedRecord.bp_remarks_bp && <div>• BP: {selectedRecord.bp_remarks_bp}</div>}
                              {selectedRecord.bp_remarks_meds && <div>• Meds: {selectedRecord.bp_remarks_meds}</div>}
                              {selectedRecord.bp_remarks_chest && <div>• Chest: {selectedRecord.bp_remarks_chest}</div>}
                              {!selectedRecord.bp_remarks_bp && !selectedRecord.bp_remarks_meds && !selectedRecord.bp_remarks_chest && "—"}
                            </td>
                          </tr>
                          <tr className="border-b border-border/30 bg-muted/20 font-semibold">
                            <td className="p-2.5">4. May sintomas ba ng diabetes?</td>
                            <td className="p-2.5 text-center font-bold text-primary">{selectedRecord.diabetes ? "✓" : ""}</td>
                            <td className="p-2.5 text-center font-bold text-muted-foreground">{selectedRecord.diabetes_no ? "✓" : (!selectedRecord.diabetes ? "✓" : "")}</td>
                            <td className="p-2.5">{selectedRecord.diabetes_remarks || "—"}</td>
                          </tr>
                          <tr className="border-b border-border/20 text-muted-foreground">
                            <td className="p-2 pl-6">&bull; Palakain</td>
                            <td className="p-2 text-center font-bold text-primary">{selectedRecord.diabetes_palakain ? "✓" : ""}</td>
                            <td className="p-2 text-center font-bold">{selectedRecord.diabetes_palakain_no ? "✓" : (!selectedRecord.diabetes_palakain ? "✓" : "")}</td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="border-b border-border/20 text-muted-foreground">
                            <td className="p-2 pl-6">&bull; Palaging gutom</td>
                            <td className="p-2 text-center font-bold text-primary">{selectedRecord.diabetes_palaging_gutom ? "✓" : ""}</td>
                            <td className="p-2 text-center font-bold">{selectedRecord.diabetes_palaging_gutom_no ? "✓" : (!selectedRecord.diabetes_palaging_gutom ? "✓" : "")}</td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="border-b border-border/20 text-muted-foreground">
                            <td className="p-2 pl-6">&bull; Madalas umihi sa madaling araw?</td>
                            <td className="p-2 text-center font-bold text-primary">{selectedRecord.diabetes_madalas_umihi ? "✓" : ""}</td>
                            <td className="p-2 text-center font-bold">{selectedRecord.diabetes_madalas_umihi_no ? "✓" : (!selectedRecord.diabetes_madalas_umihi ? "✓" : "")}</td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="text-muted-foreground">
                            <td className="p-2 pl-6">&bull; Laging uhaw</td>
                            <td className="p-2 text-center font-bold text-primary">{selectedRecord.diabetes_laging_uhaw ? "✓" : ""}</td>
                            <td className="p-2 text-center font-bold">{selectedRecord.diabetes_laging_uhaw_no ? "✓" : (!selectedRecord.diabetes_laging_uhaw ? "✓" : "")}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden In-System Print Container */}
      {printContent && (
        <div id="admin-in-system-print" className="hidden print:block text-black bg-white p-6">
          <div className="flex items-center justify-center gap-6 border-b-[4px] border-double border-slate-900 pb-3 mb-4 text-center header-seal">
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 object-contain mix-blend-multiply" />
            <img src={headerTextImg} alt="Header Text" className="h-16 object-contain mix-blend-multiply" />
            <img src={barangayLogo} alt="Subukin Logo" className="h-16 object-contain mix-blend-multiply" />
          </div>
          <div dangerouslySetInnerHTML={{ __html: printContent.html }} />
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #admin-in-system-print, #admin-in-system-print * { visibility: visible !important; }
              #admin-in-system-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              @page { size: ${printContent.orientation}; margin: 5mm; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default AdminHealthRecords;
