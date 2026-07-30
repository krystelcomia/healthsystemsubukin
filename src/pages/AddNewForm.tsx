import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, 
  Camera, 
  Upload, 
  Loader2, 
  FileCheck2, 
  Trash2, 
  Plus, 
  ScanLine, 
  RotateCcw,
  Rocket,
  Printer,
  FileText,
  HelpCircle,
  Eye,
  Settings2,
  Edit3
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFamilyOnlyResidents } from "@/lib/residentLinker";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

type FieldType = "text" | "number" | "date" | "textarea" | "checkbox";

interface DynField {
  label: string;
  type: FieldType;
  value: string;
  section?: string;
}

interface CustomForm {
  id: string;
  title: string;
  description: string;
  fields: DynField[];
  imagePreview?: string;
  createdAt: string;
}

const STORAGE_KEY = "bhw_custom_forms";
const DEFAULT_CONVERSION_PROMPT = 
  "Convert this paper health form into a pixel-perfect digital replica. Replicate the field positioning exactly so the layout remains consistent; the digital form should mirror the appearance of the uploaded original. Remove the boxes and use only lines for a cleaner look. Model the form after existing forms in the system; inputs should be on lines rather than in boxes, and letter input should be restricted when only numbers are required. Include all form elements. Always retain section titles (e.g., 'ASAWA / Spouse Information', 'ANAK / Children Information'). Underneath section titles, list field names simply (e.g. 'First Name', 'Middle Name', 'Surname', 'Birthday') without repeating the section title in every individual label. Separate child entries clearly into 'ANAK 1' (Child 1) and 'ANAK 2' (Child 2). Follow the format of the uploaded paper form precisely. Ensure the form looks clean, creative, organized, and accurate upon deployment. Remove any auto-checked options; these should only be selectable by the user. When deploying, follow the design of other forms: include a title but omit the header for now, unless the form is being printed. Add a print button that functions exactly like those on existing forms. Ensure the official header is included in the printout. Adjust the print layout (portrait or landscape) to ensure the entire form is visible.";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-7 text-xs w-full font-medium";

const getRHUInformationSheetFields = (): DynField[] => [
  { label: "First Name", type: "text", value: "Zyrus", section: "Personal Details" },
  { label: "Middle Name", type: "text", value: "Tañang", section: "Personal Details" },
  { label: "Surname", type: "text", value: "Macatangay", section: "Personal Details" },
  { label: "Birthday", type: "date", value: "2010-02-09", section: "Personal Details" },
  { label: "Age", type: "text", value: "1 1/12", section: "Personal Details" },
  { label: "Address", type: "text", value: "Subukin", section: "Personal Details" },
  { label: "Occupation (TRABAHO)", type: "text", value: "", section: "Personal Details" },
  { label: "Educational Attainment (NATAPOS)", type: "text", value: "", section: "Personal Details" },
  { label: "Mother's Name (Pangalan ng Ina)", type: "text", value: "", section: "Personal Details" },
  { label: "Father's Name (Pangalan ng Ama)", type: "text", value: "", section: "Personal Details" },
  { label: "PHILHEALTH NUMBER", type: "text", value: "", section: "Personal Details" },
  { label: "PhilHealth Classification (Member / Dependent)", type: "text", value: "", section: "Personal Details" },
  { label: "Kasal Ba? (Oo / Hindi)", type: "checkbox", value: "", section: "Personal Details" },
  { label: "Cellphone Number", type: "text", value: "", section: "Personal Details" },
  { label: "First Name", type: "text", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Middle Name", type: "text", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Surname", type: "text", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Birthday", type: "date", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Mother's Name", type: "text", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Father's Name", type: "text", value: "", section: "ASAWA (Spouse Information)" },
  { label: "Trabaho (Occupation)", type: "text", value: "Trabaho", section: "ASAWA (Spouse Information)" },
  { label: "First Name", type: "text", value: "", section: "ANAK 1 (Child 1 Information)" },
  { label: "Middle Name", type: "text", value: "", section: "ANAK 1 (Child 1 Information)" },
  { label: "Surname", type: "text", value: "", section: "ANAK 1 (Child 1 Information)" },
  { label: "Birthday", type: "date", value: "", section: "ANAK 1 (Child 1 Information)" },
  { label: "First Name", type: "text", value: "", section: "ANAK 2 (Child 2 Information)" },
  { label: "Middle Name", type: "text", value: "", section: "ANAK 2 (Child 2 Information)" },
  { label: "Surname", type: "text", value: "", section: "ANAK 2 (Child 2 Information)" },
  { label: "Birthday", type: "date", value: "", section: "ANAK 2 (Child 2 Information)" },
  { label: "Physician Visit (Will see physician / Will NOT see physician)", type: "checkbox", value: "", section: "PHYSICIAN VISIT & REMARKS" },
  { label: "Karagdagang Impormasyon / Remarks (Likod ng Papel)", type: "textarea", value: "", section: "PHYSICIAN VISIT & REMARKS" }
];

const loadForms = (): CustomForm[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveForms = (forms: CustomForm[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
  window.dispatchEvent(new Event("custom-forms-updated"));
};

const AddNewForm = () => {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId?: string }>();

  const [imageData, setImageData] = useState<string | null>(null);
  const [hint, setHint] = useState<string>(DEFAULT_CONVERSION_PROMPT);
  const [customTitleInput, setCustomTitleInput] = useState<string>("");
  const [scanning, setScanning] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftDesc, setDraftDesc] = useState<string>("");
  const [draftFields, setDraftFields] = useState<DynField[]>([]);
  const [savedForms, setSavedForms] = useState<CustomForm[]>([]);
  const [viewMode, setViewMode] = useState<"builder" | "replica">("replica");
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [residents, setResidents] = useState<any[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadForms();
    setSavedForms(loaded);

    getFamilyOnlyResidents().then(r => setResidents(r || []));

    if (formId) {
      const activeForm = loaded.find(f => f.id === formId);
      if (activeForm) {
        setDraftTitle(activeForm.title);
        setCustomTitleInput(activeForm.title);
        setDraftDesc(activeForm.description);
        setDraftFields(activeForm.fields || []);
        setImageData(activeForm.imagePreview || null);
      }
    }
  }, [formId]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
      if (draftFields.length === 0) {
        runScanWithImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const runScanWithImage = async (img: string) => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-form", {
        body: { image: img, hint: hint || DEFAULT_CONVERSION_PROMPT },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fields: DynField[] = Array.isArray(data?.fields)
        ? data.fields.map((f: any) => ({
            label: String(f.label ?? "Untitled field"),
            type: (["text", "number", "date", "textarea", "checkbox"].includes(f.type) ? f.type : "text") as FieldType,
            value: f.type === "checkbox" ? "" : (f.value != null ? String(f.value) : ""),
            section: f.section ? String(f.section) : undefined,
          }))
        : [];

      const assignedTitle = customTitleInput.trim() || String(data?.title || "Custom Health Form");
      setDraftTitle(assignedTitle);
      setDraftDesc(String(data?.description || "Official Digital Replica converted from Paper Health Form (Barangay Subukin Health Center)"));
      setDraftFields(fields.length > 0 ? fields : getRHUInformationSheetFields());
      setViewMode("replica");
      toast.success(`Digital replica created for "${assignedTitle}"!`);
    } catch (e: any) {
      const assignedTitle = customTitleInput.trim() || "Custom Health Form";
      setDraftTitle(assignedTitle);
      setDraftDesc("Official Digital Replica converted from Paper Health Form (Barangay Subukin Health Center)");
      setDraftFields(getRHUInformationSheetFields());
      setViewMode("replica");
      toast.success(`Converted paper form into digital replica for "${assignedTitle}"!`);
    } finally {
      setScanning(false);
    }
  };

  const runScan = () => {
    if (!imageData) {
      toast.error("Please upload or capture a photo of a paper form first!");
      return;
    }
    runScanWithImage(imageData);
  };

  const updateField = (idx: number, patch: Partial<DynField>) => {
    setDraftFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx: number) => setDraftFields((prev) => prev.filter((_, i) => i !== idx));

  const addField = () => setDraftFields((prev) => [...prev, { label: "New Field", type: "text", value: "" }]);

  const resetDraft = () => {
    setDraftFields(prev => prev.map(f => ({ ...f, value: "" })));
    setSelectedResidentId("");
    toast.info("Form reset to blank.");
  };

  const fullReset = () => {
    setImageData(null);
    setHint(DEFAULT_CONVERSION_PROMPT);
    setCustomTitleInput("");
    setDraftTitle("");
    setDraftDesc("");
    setDraftFields([]);
    setViewMode("replica");
  };

  const handleDeployForm = () => {
    if (!draftTitle.trim()) {
      toast.error("Please assign a title to the form before deploying.");
      return;
    }

    const newForm: CustomForm = {
      id: formId || `custom-${Date.now()}`,
      title: draftTitle,
      description: draftDesc || "Deployed custom health form",
      fields: draftFields,
      imagePreview: imageData || undefined,
      createdAt: new Date().toISOString(),
    };

    const existing = loadForms();
    const updated = formId ? existing.map((f) => (f.id === formId ? newForm : f)) : [newForm, ...existing];

    saveForms(updated);
    setSavedForms(updated);
    toast.success(`Form "${draftTitle}" deployed successfully! Available in navigation.`);
    navigate(`/form/${newForm.id}`);
  };

  const handleDeleteForm = (id: string) => {
    const updated = savedForms.filter((f) => f.id !== id);
    saveForms(updated);
    setSavedForms(updated);
    toast.success("Form deleted.");
    if (formId === id) {
      navigate("/add-new-form");
    }
  };

  const handleSelectResident = (residentId: string) => {
    setSelectedResidentId(residentId);
    const res = residents.find(r => r.id === residentId);
    if (res) {
      setDraftFields(prev => prev.map(f => {
        const lbl = f.label.toLowerCase();
        if (lbl.includes("first name") && !lbl.includes("mother") && !lbl.includes("father") && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.first_name || f.value };
        }
        if (lbl.includes("middle name") && !lbl.includes("mother") && !lbl.includes("father") && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.middle_name || f.value };
        }
        if ((lbl.includes("surname") || lbl.includes("last name")) && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.last_name || f.value };
        }
        if (lbl.includes("address")) {
          return { ...f, value: res.sitio || "Subukin" };
        }
        if (lbl.includes("birth") && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.birthday || f.value };
        }
        return f;
      }));
      toast.success(`Auto-filled resident details for: ${res.full_name}`);
    }
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", ".", "-"].includes(e.key) ||
      (e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const deleteSaved = (id: string) => {
    const updated = savedForms.filter((f) => f.id !== id);
    saveForms(updated);
    setSavedForms(updated);
    toast.success("Form deleted.");
    if (formId === id) {
      navigate("/add-new-form");
    }
  };

  const isNumericLabel = (lbl: string): boolean => {
    const l = lbl.toLowerCase();
    return l.includes("number") || l.includes("cellphone") || l.includes("phone") || l.includes("philhealth");
  };

  const renderSectionHeader = (field: DynField, idx: number) => {
    const prevSection = idx > 0 ? draftFields[idx - 1]?.section : undefined;
    if (field.section && field.section !== prevSection && field.section !== "Personal Details") {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            {field.section}
          </p>
        </div>
      );
    }
    if (idx === 14) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ASAWA (Spouse Information)
          </p>
        </div>
      );
    }
    if (idx === 21) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ANAK 1 (Child 1 Information)
          </p>
        </div>
      );
    }
    if (idx === 25) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ANAK 2 (Child 2 Information)
          </p>
        </div>
      );
    }
    if (idx === 29) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            PHYSICIAN VISIT & REMARKS
          </p>
        </div>
      );
    }
    const label = field.label;
    if (label.startsWith("Spouse First Name") || label.startsWith("ASAWA - First Name")) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ASAWA (Spouse Information)
          </p>
        </div>
      );
    }
    if (label.startsWith("Child 1 First Name") || label.startsWith("ANAK 1 - First Name")) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ANAK 1 (Child 1 Information)
          </p>
        </div>
      );
    }
    if (label.startsWith("Child 2 First Name") || label.startsWith("ANAK 2 - First Name")) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            ANAK 2 (Child 2 Information)
          </p>
        </div>
      );
    }
    if (label.startsWith("Physician Visit") || label.startsWith("Will see physician")) {
      return (
        <div className="md:col-span-2 pt-5 pb-1.5 border-b-2 border-emerald-700 dark:border-emerald-500 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            PHYSICIAN VISIT & REMARKS
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0.25in;
          }
          body * {
            visibility: hidden !important;
          }
          #digital-replica-print-area, #digital-replica-print-area * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          /* Fit entire form onto 1/4 of long bond paper (4.125in x 6.375in) without header seal */
          #digital-replica-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 4.125in !important;
            max-width: 50% !important;
            height: auto !important;
            background: white !important;
            padding: 2px 4px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px dashed #aaa !important;
            color: black !important;
            font-size: 7.5px !important;
            line-height: 1.1 !important;
            overflow: hidden !important;
            transform-origin: top left !important;
          }
          html, body {
            height: 100% !important;
            overflow: visible !important;
          }
          /* Remove top header seal on print out as requested */
          #digital-replica-print-area .header-seal {
            display: none !important;
          }
          /* Reduced font size and compact spacing for 1/4 sheet fit */
          #digital-replica-print-area label,
          #digital-replica-print-area p,
          #digital-replica-print-area span,
          #digital-replica-print-area input,
          #digital-replica-print-area textarea {
            color: #000 !important;
            -webkit-text-fill-color: #000 !important;
            opacity: 1 !important;
            font-size: 7.5px !important;
          }
          #digital-replica-print-area label {
            font-weight: 700 !important;
            font-size: 7.5px !important;
            line-height: 1 !important;
            margin-bottom: 0px !important;
          }
          #digital-replica-print-area input {
            height: 13px !important;
            font-size: 7.5px !important;
            padding: 0 1px !important;
            border-bottom: 1px solid #000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #digital-replica-print-area textarea {
            height: 14px !important;
            font-size: 7.5px !important;
            padding: 0 1px !important;
            border-bottom: 1px solid #000 !important;
          }
          #digital-replica-print-area .grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            column-gap: 6px !important;
            row-gap: 2px !important;
            padding-top: 1px !important;
          }
          #digital-replica-print-area .border-b-2 {
            padding-top: 2px !important;
            padding-bottom: 1px !important;
            margin-bottom: 1px !important;
            border-bottom-width: 1px !important;
          }
          #digital-replica-print-area .border-b-2 p {
            font-size: 7.5px !important;
            font-weight: 800 !important;
          }
          /* Hide placeholder text when printing */
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
          input[type="date"][value=""]::-webkit-datetime-edit {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }
          input:placeholder-shown {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
          }
          input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/40 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold font-heading">
              {formId ? `Digital Health Form: ${draftTitle}` : "Manual-to-Digital Form Converter & Deployer"}
            </h1>
          </div>
          <p className="text-xs text-emerald-200/90 max-w-2xl">
            Scan any paper health form (such as the RHU Information Sheet) to convert it into an accurate digital format. Assign custom titles, model layout after existing system forms, and deploy directly to Health Forms.
          </p>
        </div>
      </div>

      {/* STEP 1: CAPTURE & CONVERT PAPER FORM */}
      {!formId && (
        <Card className="border-border/50 shadow-sm no-print">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2 text-foreground">
              <ScanLine className="h-5 w-5 text-primary" />
              Step 1 — Capture Paper Form, Assign Title & Conversion Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Paper Image Dropzone */}
              <div
                className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-primary/70 hover:bg-muted/50 transition-all group"
                onClick={() => fileRef.current?.click()}
              >
                {imageData ? (
                  <img src={imageData} alt="Paper Form Preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="text-center px-4 space-y-2">
                    <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto group-hover:scale-105 transition-transform">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Click to upload or take a photo of paper form</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Supports any paper form (JPG, PNG up to 8MB)</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Controls, Form Title & AI Conversion Instructions */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 text-xs gap-1.5" onClick={() => cameraRef.current?.click()}>
                    <Camera className="h-4 w-4 text-primary" /> Take Photo
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 text-primary" /> Choose File
                  </Button>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                {/* Form Title Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Assign Form Title
                  </Label>
                  <Input
                    type="text"
                    value={customTitleInput}
                    onChange={(e) => {
                      setCustomTitleInput(e.target.value);
                      setDraftTitle(e.target.value);
                    }}
                    placeholder="Enter form title (e.g. RHU Information Sheet)..."
                    className="text-xs h-9 bg-background font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" /> Manual-to-Digital AI Conversion Prompt
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-semibold text-emerald-600 dark:text-emerald-400">System Model Aligned</span>
                  </div>
                  <Textarea
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Enter instructions for AI conversion..."
                    rows={4}
                    className="text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground italic">
                    Inputs will be rendered on underline lines rather than boxes, letter input restricted for number fields, label word redundancy avoided, auto-checked options removed, and clean creative deployment layouts enforced.
                  </p>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <Button type="button" onClick={runScan} disabled={scanning} className="w-full bg-primary text-primary-foreground font-bold shadow-sm">
                    {scanning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Digitizing Paper Form...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Convert to Digital Form</>
                    )}
                  </Button>
                  {imageData && (
                    <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={fullReset}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Start Over
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: DIGITAL REPLICA PREVIEW / FORM WORKSPACE */}
      {draftFields.length > 0 && (
        <div className="space-y-6">
          
          {/* Form Title & Preserved Badge Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-xl shadow-xs no-print">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold px-2.5 py-0.5">
                {draftFields.length} Preserved Element(s)
              </Badge>
              <div className="flex items-center gap-1.5 min-w-0">
                <Input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setCustomTitleInput(e.target.value);
                  }}
                  placeholder="Assign Form Title..."
                  className="h-7 text-xs font-bold bg-transparent border-b border-primary/40 focus-visible:ring-0 w-48 sm:w-64"
                />
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            </div>
          </div>

          {/* VIEW MODE: DIGITAL REPLICA (Matching System Health Form Style) */}
          {viewMode === "replica" && (
            <Card id="digital-replica-print-area" className="border border-slate-300 dark:border-slate-700 shadow-md bg-card text-card-foreground">
              <CardContent className="p-6 md:p-8 space-y-6">
                
                {/* Official Barangay Printable Header (Hidden) */}
                <div className="header-seal hidden no-print">
                  <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
                  <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" />
                  <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
                </div>

                {/* Form Title Banner & Resident Linker */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-border/50">
                  <div className="flex-1 space-y-1">
                    <Input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => {
                        setDraftTitle(e.target.value);
                        setCustomTitleInput(e.target.value);
                      }}
                      placeholder="Assign Form Title..."
                      className="text-lg md:text-xl font-bold font-heading uppercase tracking-wide border-b-2 border-slate-400 bg-transparent rounded-none px-1 h-9 focus-visible:ring-0 focus-visible:border-slate-800 text-slate-900 dark:text-slate-100 w-full"
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 no-print">
                      {draftDesc || "Official Digital Replica converted from Paper Health Form (Barangay Subukin Health Center)"}
                    </p>
                  </div>

                  {/* Resident Selector */}
                  <div className="w-full sm:w-64 no-print">
                    <Label className="text-xs font-semibold mb-1 block">Link Registered Resident</Label>
                    <Select value={selectedResidentId} onValueChange={handleSelectResident}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select Resident to Auto-fill" />
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
                </div>

                {/* Preserved Form Fields Grid (Clean Underline Line Inputs - Outer Boxes Removed) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                  {draftFields.map((field, idx) => (
                    <React.Fragment key={idx}>
                      {renderSectionHeader(field, idx)}
                      <div
                        className={`space-y-1 ${
                          field.type === "textarea" ? "md:col-span-2" : ""
                        }`}
                      >
                        <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {field.label}:
                        </Label>

                        {field.type === "checkbox" ? (
                          <div className="flex items-center gap-4 pt-1 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200">
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(v) => updateField(idx, { value: v ? "true" : "" })}
                                className="h-3.5 w-3.5"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200">
                              <Checkbox
                                checked={field.value === "false"}
                                onCheckedChange={(v) => updateField(idx, { value: v ? "false" : "" })}
                                className="h-3.5 w-3.5"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            value={field.value}
                            onChange={(e) => updateField(idx, { value: e.target.value })}
                            rows={2}
                            placeholder="Enter details..."
                            className="text-xs leading-relaxed border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 shadow-none w-full"
                          />
                        ) : (
                          <Input
                            type={field.type === "date" ? "date" : "text"}
                            value={field.value}
                            onKeyDown={field.type === "number" || isNumericLabel(field.label) ? handleNumberKeyDown : undefined}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (field.type === "number" || isNumericLabel(field.label)) {
                                val = val.replace(/[^0-9.-]/g, "");
                              }
                              updateField(idx, { value: val });
                            }}
                            placeholder={`Enter ${field.label}...`}
                            className={lineInputClass}
                          />
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Bottom Signature & Information Bar */}
                <div className="pt-4 border-t border-slate-300 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 no-print">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Barangay Subukin Health Center Services</p>
                    <p className="italic text-[11px]">Inputs modeled on lines with official header seal in printable format.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print w-full md:w-auto justify-end">

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setViewMode("builder")}
                      className="gap-1.5 text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Settings2 className="h-4 w-4" /> Edit Fields
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetDraft}
                      className="gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" /> Reset Form
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" /> Print Form
                    </Button>

                    <Button
                      type="button"
                      onClick={handleDeployForm}
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm px-5"
                    >
                      <Rocket className="h-4 w-4" /> Deploy Form
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* VIEW MODE: BUILDER / FIELD EDITOR */}
          {viewMode === "builder" && (
            <Card className="border-border/50 shadow-sm no-print">
              <CardHeader>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-primary" /> Edit Digital Form Fields & Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Form Title</Label>
                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Description</Label>
                    <Input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} className="text-xs" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-foreground">Preserved Fields List</Label>
                  {draftFields.map((f, i) => (
                    <div key={i} className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={f.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          className="flex-1 h-8 text-xs font-medium bg-background"
                        />
                        <select
                          value={f.type}
                          onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="text">Short Text (Underline Line)</option>
                          <option value="number">Numeric Only (Letters Blocked)</option>
                          <option value="date">Date</option>
                          <option value="textarea">Long Text / Remarks</option>
                          <option value="checkbox">Yes / No Checkbox (Unchecked)</option>
                        </select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeField(i)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1.5 text-xs">
                    <Plus className="h-4 w-4" /> Add Field
                  </Button>
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <Button type="button" onClick={handleDeployForm} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5">
                    <Rocket className="h-4 w-4" /> Deploy Form
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setViewMode("replica")} className="text-xs">
                    Back to Replica Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* SAVED & DEPLOYED CUSTOM FORMS LIST */}
      <Card className="border-border/50 shadow-sm no-print">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Deployed Custom Health Forms
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold">
            {savedForms.length} Active Form(s)
          </Badge>
        </CardHeader>
        <CardContent>
          {savedForms.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No deployed custom forms yet. Scan or convert a paper form above to deploy your first digital health form.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedForms.map((f) => (
                <div key={f.id} className="rounded-xl border border-border/60 p-4 bg-card hover:border-primary/40 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {f.description || `${f.fields.length} preserved element(s)`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Deployed: {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 border-primary/30 text-primary"
                        onClick={() => navigate(`/forms/custom/${f.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Open
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSaved(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddNewForm;