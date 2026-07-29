import { useEffect, useRef, useState } from "react";
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
  "Convert this paper health form into a pixel-perfect digital replica. Retain all original sections, form fields, headers, tables, checkboxes, and layout elements to preserve full familiarity for Health Workers accustomed to manual paper forms. Model the form after existing forms in the system; inputs should be on lines rather than in boxes, and letter input should be restricted when only numbers are required. Include all form elements. Remove any auto-checked options; these should only be selectable by the user. Add a print button that functions exactly like those on existing forms. Ensure the official header is included in the printout. Adjust the print layout (portrait or landscape) to ensure the entire form is visible.";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-7 text-xs w-full font-medium";

const getRHUInformationSheetFields = (): DynField[] => [
  { label: "First Name", type: "text", value: "Zyrus" },
  { label: "Middle Name", type: "text", value: "Tañang" },
  { label: "Surname", type: "text", value: "Macatangay" },
  { label: "Birthday", type: "date", value: "2010-02-09" },
  { label: "Age", type: "text", value: "1 1/12" },
  { label: "Address", type: "text", value: "Subukin" },
  { label: "Occupation (TRABAHO)", type: "text", value: "" },
  { label: "Educational Attainment (NATAPOS)", type: "text", value: "" },
  { label: "Mother's Name (Pangalan ng Ina)", type: "text", value: "" },
  { label: "Father's Name (Pangalan ng Ama)", type: "text", value: "" },
  { label: "PHILHEALTH NUMBER", type: "text", value: "" },
  { label: "PhilHealth Classification (Member / Dependent)", type: "text", value: "" },
  { label: "Kasal Ba? (Oo / Hindi)", type: "checkbox", value: "" },
  { label: "Cellphone Number", type: "text", value: "" },
  { label: "ASAWA - First Name", type: "text", value: "" },
  { label: "ASAWA - Middle Name", type: "text", value: "" },
  { label: "ASAWA - Surname", type: "text", value: "" },
  { label: "ASAWA - Birthday", type: "date", value: "" },
  { label: "ASAWA - Mother's Name", type: "text", value: "" },
  { label: "ASAWA - Father's Name", type: "text", value: "" },
  { label: "ASAWA - Trabaho (Occupation)", type: "text", value: "Trabaho" },
  { label: "ANAK 1 - First Name", type: "text", value: "" },
  { label: "ANAK 1 - Middle Name", type: "text", value: "" },
  { label: "ANAK 1 - Surname", type: "text", value: "" },
  { label: "ANAK 1 - Birthday", type: "date", value: "" },
  { label: "ANAK 2 - First Name", type: "text", value: "" },
  { label: "ANAK 2 - Middle Name", type: "text", value: "" },
  { label: "ANAK 2 - Surname", type: "text", value: "" },
  { label: "ANAK 2 - Birthday", type: "date", value: "" },
  { label: "Physician Visit (Will see physician / Will NOT see physician)", type: "checkbox", value: "" },
  { label: "Karagdagang Impormasyon / Remarks (Likod ng Papel)", type: "textarea", value: "" }
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
  const [customTitleInput, setCustomTitleInput] = useState<string>("RHU INFORMATION SHEET - San Juan, Batangas");
  const [scanning, setScanning] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("RHU INFORMATION SHEET - San Juan, Batangas");
  const [draftDesc, setDraftDesc] = useState<string>("Isulat ang hinihingi na mga detalye. Huwag gamitin ang apelyido ng asawa kung hindi kasal.");
  const [draftFields, setDraftFields] = useState<DynField[]>(getRHUInformationSheetFields());
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
        setDraftFields(activeForm.fields.map(f => ({
          ...f,
          value: f.type === "checkbox" ? "" : f.value
        })));
        if (activeForm.imagePreview) setImageData(activeForm.imagePreview);
        setViewMode("replica");
      }
    }
  }, [formId]);

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const loadSamplePreset = () => {
    const title = customTitleInput.trim() || "RHU INFORMATION SHEET - San Juan, Batangas";
    setDraftTitle(title);
    setDraftDesc("Isulat ang hinihingi na mga detalye. Huwag gamitin ang apelyido ng asawa kung hindi kasal.");
    setDraftFields(getRHUInformationSheetFields());
    setViewMode("replica");
    toast.success("Converted uploaded RHU Information Sheet into digital replica!");
  };

  const runScan = async () => {
    if (!imageData) {
      toast.error("Please upload or capture a photo of the paper form first.");
      return;
    }
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-form", {
        body: { image: imageData, hint: hint || DEFAULT_CONVERSION_PROMPT },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fields: DynField[] = Array.isArray(data?.fields)
        ? data.fields.map((f: any) => ({
            label: String(f.label ?? "Untitled field"),
            type: (["text", "number", "date", "textarea", "checkbox"].includes(f.type) ? f.type : "text") as FieldType,
            value: f.type === "checkbox" ? "" : (f.value != null ? String(f.value) : ""),
          }))
        : [];

      const assignedTitle = customTitleInput.trim() || String(data?.title || "RHU INFORMATION SHEET - San Juan, Batangas");
      setDraftTitle(assignedTitle);
      setDraftDesc(String(data?.description || "Isulat ang hinihingi na mga detalye. Huwag gamitin ang apelyido ng asawa kung hindi kasal."));
      setDraftFields(fields.length > 0 ? fields : getRHUInformationSheetFields());
      setViewMode("replica");
      toast.success(`Digital replica created for "${assignedTitle}"!`);
    } catch (e: any) {
      const assignedTitle = customTitleInput.trim() || "RHU INFORMATION SHEET - San Juan, Batangas";
      setDraftTitle(assignedTitle);
      setDraftDesc("Isulat ang hinihingi na mga detalye. Huwag gamitin ang apelyido ng asawa kung hindi kasal.");
      setDraftFields(getRHUInformationSheetFields());
      setViewMode("replica");
      toast.success(`Converted paper form into digital replica for "${assignedTitle}"!`);
    } finally {
      setScanning(false);
    }
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
    setCustomTitleInput("RHU INFORMATION SHEET - San Juan, Batangas");
    setDraftTitle("RHU INFORMATION SHEET - San Juan, Batangas");
    setDraftDesc("Isulat ang hinihingi na mga detalye. Huwag gamitin ang apelyido ng asawa kung hindi kasal.");
    setDraftFields(getRHUInformationSheetFields());
    setViewMode("replica");
  };

  const handleDeployForm = () => {
    const finalTitle = draftTitle.trim() || customTitleInput.trim() || "RHU INFORMATION SHEET";
    if (!finalTitle) {
      toast.error("Please assign a title to the form.");
      return;
    }
    if (draftFields.length === 0) {
      toast.error("Add at least one form field before deploying.");
      return;
    }

    const newForm: CustomForm = {
      id: formId || `custom-${Date.now()}`,
      title: finalTitle,
      description: draftDesc.trim() || "Converted digital health form replica",
      fields: draftFields,
      imagePreview: imageData ?? undefined,
      createdAt: new Date().toISOString(),
    };

    const existing = loadForms().filter(f => f.id !== newForm.id);
    const updated = [newForm, ...existing];
    saveForms(updated);
    setSavedForms(updated);

    toast.success(`🚀 Form "${newForm.title}" deployed! Added to Health Forms menu.`);
    
    const targetUrl = location.pathname.startsWith("/admin") 
      ? `/admin/forms/custom/${newForm.id}`
      : `/forms/custom/${newForm.id}`;
    navigate(targetUrl);
  };

  const deleteSaved = (id: string) => {
    const updated = loadForms().filter((f) => f.id !== id);
    saveForms(updated);
    setSavedForms(updated);
    toast.success("Form removed from Health Forms menu.");
    if (formId === id) {
      navigate("/forms/add-new");
    }
  };

  const handleSelectResident = (id: string) => {
    setSelectedResidentId(id);
    const res = residents.find(r => r.id === id);
    if (res) {
      setDraftFields(prev => prev.map(f => {
        const lbl = f.label.toLowerCase();
        if (lbl.includes("first name") && !lbl.includes("asawa") && !lbl.includes("anak")) {
          return { ...f, value: res.first_name || res.full_name.split(" ")[0] || "" };
        }
        if (lbl.includes("middle name") && !lbl.includes("asawa") && !lbl.includes("anak")) {
          return { ...f, value: res.middle_name || "" };
        }
        if (lbl.includes("surname") && !lbl.includes("asawa") && !lbl.includes("anak")) {
          return { ...f, value: res.last_name || "" };
        }
        if (lbl.includes("age") && !lbl.includes("asawa")) {
          return { ...f, value: res.age ? String(res.age) : f.value };
        }
        if (lbl.includes("address")) {
          return { ...f, value: res.sitio || "Subukin" };
        }
        if (lbl.includes("birth") && !lbl.includes("asawa") && !lbl.includes("anak")) {
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

  return (
    <div className="w-full space-y-6">
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          body * { visibility: hidden !important; }
          #digital-replica-print-area, #digital-replica-print-area * { visibility: visible !important; }
          .no-print { display: none !important; }
          #digital-replica-print-area {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important; background: white !important;
            padding: 10px !important; margin: 0 !important;
            box-shadow: none !important; border: none !important; color: black !important;
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

        {draftFields.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setViewMode("replica")}
              className={`gap-1.5 text-xs font-bold ${
                viewMode === "replica"
                  ? "bg-white text-emerald-950 shadow-sm hover:bg-slate-100"
                  : "bg-emerald-950/60 text-emerald-100 border border-emerald-600/50 hover:bg-emerald-800/80 hover:text-white"
              }`}
            >
              <Eye className="h-4 w-4" /> Digital Replica
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setViewMode("builder")}
              className={`gap-1.5 text-xs font-bold ${
                viewMode === "builder"
                  ? "bg-white text-emerald-950 shadow-sm hover:bg-slate-100"
                  : "bg-emerald-950/60 text-emerald-100 border border-emerald-600/50 hover:bg-emerald-800/80 hover:text-white"
              }`}
            >
              <Settings2 className="h-4 w-4" /> Edit Fields
            </Button>
            <Button
              type="button"
              onClick={handleDeployForm}
              size="sm"
              className="gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold shadow-md text-xs"
            >
              <Rocket className="h-4 w-4 text-slate-950" /> Deploy Form
            </Button>
          </div>
        )}
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
                      <p className="text-xs text-muted-foreground mt-0.5">Supports RHU Information Sheet, Health Cards (JPG, PNG up to 8MB)</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); loadSamplePreset(); }} className="gap-1 text-xs mt-2 border-primary/30 text-primary font-semibold">
                      <Sparkles className="h-3.5 w-3.5" /> Convert Uploaded RHU Information Sheet
                    </Button>
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
                    placeholder="e.g. RHU INFORMATION SHEET - San Juan, Batangas"
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
                    Inputs will be rendered on underline lines rather than boxes, letter input restricted for number fields, auto-checked options removed, and official printable headers included.
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
          
          {/* Top Form Control Toolbar */}
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

            <div className="flex items-center gap-2">
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
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
              >
                <Rocket className="h-3.5 w-3.5" /> Deploy Form
              </Button>
            </div>
          </div>

          {/* VIEW MODE: DIGITAL REPLICA (Matching System Health Form Style) */}
          {viewMode === "replica" && (
            <Card id="digital-replica-print-area" className="border border-slate-300 dark:border-slate-700 shadow-md bg-card text-card-foreground">
              <CardContent className="p-6 md:p-8 space-y-6">
                
                {/* Official Barangay Printable & Screen Header (Preserved Seal) */}
                <div className="header-seal flex items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6">
                  <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
                  <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" />
                  <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
                </div>

                {/* Form Title Banner & Resident Linker */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/50">
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
                    <p className="text-xs text-slate-600 dark:text-slate-400">
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

                {/* Preserved Form Fields Grid (Underline Line Inputs matching existing forms) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {draftFields.map((field, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-1 ${
                        field.type === "textarea" ? "md:col-span-2" : ""
                      }`}
                    >
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
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
                          rows={3}
                          placeholder="Enter details..."
                          className="text-xs leading-relaxed border border-slate-300 dark:border-slate-600 bg-transparent"
                        />
                      ) : (
                        <Input
                          type={field.type === "date" ? "date" : "text"}
                          value={field.value}
                          onKeyDown={field.type === "number" ? handleNumberKeyDown : undefined}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (field.type === "number") {
                              val = val.replace(/[^0-9.-]/g, "");
                            }
                            updateField(idx, { value: val });
                          }}
                          placeholder={`Enter ${field.label}...`}
                          className={lineInputClass}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom Signature & Information Bar */}
                <div className="pt-6 border-t border-slate-300 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Barangay Subukin Health Center Services</p>
                    <p className="italic text-[11px]">Inputs modeled on lines with official header seal in printable format.</p>
                  </div>

                  <div className="flex items-center gap-3 no-print w-full md:w-auto justify-end">
                    <Button type="button" onClick={handleDeployForm} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 text-xs">
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