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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Edit3,
  ChevronRight,
  ChevronLeft,
  Check,
  ListChecks,
  ImageIcon,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFamilyOnlyResidents, calculateAge, ensureResidentExists } from "@/lib/residentLinker";
import { 
  allowOnlyNumbers, 
  allowNumbersAndDecimal, 
  allowNumbersAndSlash, 
  allowOnlyLetters, 
  sanitizeNumbers, 
  sanitizeNumbersAndDecimal, 
  sanitizeNumbersAndSlash, 
  sanitizeLetters 
} from "@/lib/inputValidation";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";
import { convertPaperFormToDigital } from "@/lib/formConverter";

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
  "Convert the uploaded form into a digital format. Use lines instead of boxes for the fields. Restrict input so that letters cannot be entered when only numbers are required, and vice versa, unless both are needed. Replicate everything from the form exactly—including the layout and the specific text—to create the digital version.";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-7 text-xs w-full font-medium";

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

/* ──────────────────────────────────────────────────────────────
   WIZARD STEP INDICATOR
   ────────────────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: "Upload & Configure", icon: ImageIcon },
  { num: 2, label: "Review & Edit Fields", icon: ListChecks },
  { num: 3, label: "Preview & Deploy",    icon: Rocket },
] as const;

const StepIndicator = ({ current, onStepClick, canGoTo }: { current: number; onStepClick: (s: number) => void; canGoTo: (s: number) => boolean }) => (
  <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto select-none no-print">
    {STEPS.map((step, idx) => {
      const done = current > step.num;
      const active = current === step.num;
      const reachable = canGoTo(step.num);
      const Icon = step.icon;
      return (
        <React.Fragment key={step.num}>
          {idx > 0 && (
            <div className={`flex-1 h-0.5 transition-colors duration-300 ${done ? "bg-primary" : "bg-border"}`} />
          )}
          <button
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onStepClick(step.num)}
            className={`flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
              active
                ? "scale-105"
                : reachable
                  ? "opacity-80 hover:opacity-100 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : active
                    ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={`text-[11px] font-semibold leading-tight text-center whitespace-nowrap ${active ? "text-primary" : done ? "text-primary" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </button>
        </React.Fragment>
      );
    })}
  </div>
);

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────── */
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
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [residents, setResidents] = useState<any[]>([]);
  const [deleteTemplateConfirmId, setDeleteTemplateConfirmId] = useState<string | null>(null);

  // Wizard step: 1 = Upload, 2 = Edit Fields, 3 = Preview & Deploy
  const [currentStep, setCurrentStep] = useState<number>(1);

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
        setDraftFields((activeForm.fields || []).map(f => f.type === "date" ? { ...f, value: f.value || getTodayDate() } : f));
        setImageData(activeForm.imagePreview || null);
        // Jump straight to preview for existing forms
        setCurrentStep(3);
      }
    } else {
      // In Add New Form section, clear upload fields so next form can be uploaded cleanly
      fullReset();
    }
  }, [formId]);

  /* ── File / image handling ── */
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
      setDraftTitle(customTitleInput.trim());
      setDraftDesc("");
      setDraftFields([]);
      setSelectedResidentId("");
      runScanWithImage(result);
    };
    reader.readAsDataURL(file);
  };

  /* ── AI scan ── */
  const runScanWithImage = async (img: string) => {
    setScanning(true);
    try {
      const result = await convertPaperFormToDigital(img, hint || DEFAULT_CONVERSION_PROMPT, customTitleInput);

      const assignedTitle = customTitleInput.trim() || result.title || "Custom Health Form";
      setDraftTitle(assignedTitle);
      setCustomTitleInput(assignedTitle);
      setDraftDesc(result.description || "Digital replica generated from uploaded paper form.");
      
      if (result.fields && result.fields.length > 0) {
        setDraftFields(result.fields.map(f => f.type === "date" ? { ...f, value: f.value || getTodayDate() } : f));
        // Auto-advance to Step 2 after successful conversion
        setCurrentStep(2);
        toast.success(`Digital replica created for "${assignedTitle}"! Review the fields below.`);
      } else {
        toast.error("No fields were extracted from the uploaded form. Please try again with a clearer image.");
      }
    } catch (e: any) {
      const msg = e?.message || e?.error || "Unknown error";
      toast.error(`Conversion failed: ${msg}`);
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

  /* ── Field editing helpers ── */
  const updateField = (idx: number, patch: Partial<DynField>) => {
    setDraftFields((prev) => prev.map((f, i) => {
      if (i === idx) {
        const updated = { ...f, ...patch };
        if (updated.type === "date" && !updated.value) {
          updated.value = getTodayDate();
        }
        return updated;
      }
      return f;
    }));
  };

  const removeField = (idx: number) => setDraftFields((prev) => prev.filter((_, i) => i !== idx));

  const addField = () => setDraftFields((prev) => [...prev, { label: "New Field", type: "text", value: "" }]);

  const resetDraft = () => {
    setDraftFields(prev => prev.map(f => ({ ...f, value: f.type === "date" ? getTodayDate() : "" })));
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
    setSelectedResidentId("");
    setCurrentStep(1);
  };

  /* ── Deploy / delete ── */
  const handleDeployForm = () => {
    if (!draftTitle.trim()) {
      toast.error("Please assign a title to the form before deploying.");
      return;
    }

    const newForm: CustomForm = {
      id: formId || `custom-${Date.now()}`,
      title: draftTitle,
      description: draftDesc || "Official digital record for Barangay Subukin health registry.",
      fields: draftFields,
      imagePreview: imageData || undefined,
      createdAt: new Date().toISOString(),
    };

    const existing = loadForms();
    const updated = formId ? existing.map((f) => (f.id === formId ? newForm : f)) : [newForm, ...existing];

    saveForms(updated);
    setSavedForms(updated);
    
    // Clear upload and draft state for fresh upload
    fullReset();

    toast.success(`Form "${newForm.title}" deployed successfully! Added to health forms.`);
    navigate(`/forms/custom/${newForm.id}`);
  };

  const handleSaveRecord = async () => {
    // 1. Find resident Name or primary identifier
    const nameField = draftFields.find(f => {
      const l = f.label.toLowerCase();
      return (l === "name" || l === "full name" || l === "pangalan" || l === "applicant name" || l === "patient name") ||
             (l.includes("name") && !l.includes("mother") && !l.includes("father") && !l.includes("asawa") && !l.includes("spouse") && !l.includes("child") && !l.includes("anak"));
    });

    const birthdayField = draftFields.find(f => f.label.toLowerCase().includes("birth") || f.label.toLowerCase().includes("dob"));
    const ageField = draftFields.find(f => f.label.toLowerCase() === "age" || f.label.toLowerCase().includes("edad"));
    const sitioField = draftFields.find(f => f.label.toLowerCase().includes("address") || f.label.toLowerCase().includes("sitio") || f.label.toLowerCase().includes("tirahan"));
    const genderField = draftFields.find(f => f.label.toLowerCase().includes("gender") || f.label.toLowerCase().includes("sex") || f.label.toLowerCase().includes("kasarian"));
    const motherField = draftFields.find(f => f.label.toLowerCase().includes("mother") || f.label.toLowerCase().includes("ina"));
    const fatherField = draftFields.find(f => f.label.toLowerCase().includes("father") || f.label.toLowerCase().includes("ama"));

    let targetResidentId = selectedResidentId;
    let targetResidentName = "";

    const selectedRes = residents.find(r => r.id === selectedResidentId);
    if (selectedRes) {
      targetResidentName = selectedRes.full_name;
    } else if (nameField && nameField.value.trim()) {
      targetResidentName = nameField.value.trim();
      targetResidentId = await ensureResidentExists({
        fullName: targetResidentName,
        birthday: birthdayField?.value || undefined,
        age: ageField?.value || undefined,
        sitio: sitioField?.value || "Subukin",
        gender: genderField?.value || "Male",
        motherName: motherField?.value || undefined,
        fatherName: fatherField?.value || undefined,
      }) || "";
      if (targetResidentId) {
        setSelectedResidentId(targetResidentId);
      }
    }

    if (!targetResidentId && !targetResidentName) {
      toast.error("Please link a resident or enter the resident's full name before saving.");
      return;
    }

    // 2. Check for missing required fields (excluding optional remarks/work history textarea)
    const emptyRequiredFields = draftFields.filter(f => {
      if (f.type === "checkbox") return false;
      if (f.type === "textarea") return false;
      const l = f.label.toLowerCase();
      if (l.includes("optional") || l.includes("remarks") || l.includes("history")) return false;
      return !f.value || !f.value.trim();
    });

    if (emptyRequiredFields.length > 0) {
      const firstMissing = emptyRequiredFields[0];
      toast.error(`Incomplete form: Please fill in "${firstMissing.label}" before saving.`);
      return;
    }

    // 3. Update resident profile with demographic data entered into the form
    if (targetResidentId) {
      const updates: any = {};
      if (birthdayField?.value) updates.birthday = birthdayField.value;
      if (ageField?.value && Number(ageField.value) > 0) updates.age = Number(ageField.value);
      if (sitioField?.value) updates.sitio = sitioField.value.split(",")[0].trim();
      if (genderField?.value) updates.gender = genderField.value;
      if (Object.keys(updates).length > 0) {
        await supabase.from("residents").update(updates).eq("id", targetResidentId);
      }
    }

    // 4. Save the form record linked to the resident
    const record = {
      id: `rec-${Date.now()}`,
      formId: formId || "custom",
      formTitle: draftTitle,
      residentId: targetResidentId || undefined,
      resident_id: targetResidentId || undefined,
      resident_name: targetResidentName,
      fields: draftFields,
      savedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    
    const existingRecords = JSON.parse(localStorage.getItem("bhw_custom_form_records") || "[]");
    existingRecords.unshift(record);
    localStorage.setItem("bhw_custom_form_records", JSON.stringify(existingRecords));

    // Dispatch system events
    window.dispatchEvent(new Event("resident-records-updated"));
    window.dispatchEvent(new Event("custom-form-records-updated"));

    toast.success(`Form data saved under resident: ${targetResidentName}!`);
  };

  const handleDeleteForm = (id: string) => {
    const updated = savedForms.filter((f) => f.id !== id);
    saveForms(updated);
    setSavedForms(updated);
    toast.success("Form deleted.");
    if (formId === id) {
      navigate("/forms/add-new");
    }
  };

  const deleteSaved = (id: string) => {
    const updated = savedForms.filter((f) => f.id !== id);
    saveForms(updated);
    setSavedForms(updated);
    toast.success("Form deleted.");
    if (formId === id) {
      navigate("/forms/add-new");
    }
  };

  /* ── Resident auto-fill ── */
  const handleSelectResident = (residentId: string) => {
    setSelectedResidentId(residentId);
    const res = residents.find(r => r.id === residentId);
    if (res) {
      const calcAge = res.age ? Number(res.age) : (res.birthday ? calculateAge(res.birthday) : 0);
      const isAdult = calcAge >= 18;
      const isMarried = (res.civil_status || "").toLowerCase().includes("married") || (res.status || "").toLowerCase().includes("married");

      setDraftFields(prev => prev.map(f => {
        const lbl = f.label.toLowerCase();
        
        // Exact / Generic Name (not spouse/child/mother/father)
        if (
          (lbl === "name" || lbl === "full name" || lbl === "pangalan" || lbl === "applicant name" || lbl === "patient name") ||
          (lbl.includes("first name") && !lbl.includes("mother") && !lbl.includes("father") && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child"))
        ) {
          if (lbl === "name" || lbl === "full name" || lbl === "applicant name" || lbl === "patient name") {
            return { ...f, value: res.full_name || f.value };
          }
          return { ...f, value: res.first_name || f.value };
        }
        if (lbl.includes("middle name") && !lbl.includes("mother") && !lbl.includes("father") && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.middle_name || f.value };
        }
        if ((lbl.includes("surname") || lbl.includes("last name")) && !lbl.includes("asawa") && !lbl.includes("anak") && !lbl.includes("spouse") && !lbl.includes("child")) {
          return { ...f, value: res.last_name || f.value };
        }
        if (lbl.includes("address") || lbl.includes("tirahan")) {
          const addr = res.sitio ? `${res.sitio}, Subukin, San Juan, Batangas` : "Subukin, San Juan, Batangas";
          return { ...f, value: addr };
        }
        if (lbl.includes("contact") || lbl.includes("phone") || lbl.includes("telephone") || lbl.includes("cellphone")) {
          return { ...f, value: res.contact_number || res.cellphone || f.value };
        }
        if (lbl.includes("birth") || lbl.includes("dob")) {
          return { ...f, value: res.birthday || f.value };
        }
        if (lbl === "age" || lbl === "edad" || lbl.includes("age:")) {
          return { ...f, value: calcAge > 0 ? String(calcAge) : f.value };
        }
        if (lbl.includes("gender") || lbl.includes("sex") || lbl.includes("kasarian")) {
          return { ...f, value: res.gender || f.value };
        }
        if (lbl.includes("mother") || lbl.includes("ina")) {
          return { ...f, value: res.mother_name || f.value };
        }
        if (lbl.includes("father") || lbl.includes("ama")) {
          return { ...f, value: res.father_name || f.value };
        }
        if (lbl.includes("philhealth") || lbl.includes("social security") || lbl.includes("ssn")) {
          return { ...f, value: res.philhealth_number || res.id_number || f.value };
        }
        if (lbl.includes("above 18") || lbl.includes("18 yrs")) {
          return { ...f, value: isAdult ? "true" : "false" };
        }
        if (lbl.includes("kasal") || lbl.includes("married")) {
          return { ...f, value: isMarried ? "true" : "false" };
        }
        return f;
      }));
      toast.success(`Auto-filled resident details for: ${res.full_name}`);
    }
  };

  /* ── Input restriction helpers ── */
  const isNumberOnlyField = (field: DynField): boolean => {
    if (field.type === "number") return true;
    const l = field.label.toLowerCase();
    return (
      l.includes("number") ||
      l.includes("cellphone") ||
      l.includes("phone") ||
      l.includes("telephone") ||
      l.includes("philhealth") ||
      l.includes("social security") ||
      l.includes("ssn") ||
      l.includes("salary") ||
      l.includes("contact") ||
      l.includes("zip") ||
      l.includes("age") ||
      l.includes("edad") ||
      l.includes("weight") ||
      l.includes("height") ||
      l.includes("bp") ||
      l.includes("pulse") ||
      l.includes("temperature")
    );
  };

  const isLetterOnlyField = (field: DynField): boolean => {
    if (field.type !== "text") return false;
    if (isNumberOnlyField(field)) return false;
    const l = field.label.toLowerCase();
    if (
      l.includes("address") ||
      l.includes("tirahan") ||
      l.includes("email") ||
      l.includes("education") ||
      l.includes("natapos") ||
      l.includes("remark") ||
      l.includes("history") ||
      l.includes("id") ||
      l.includes("code")
    ) {
      return false;
    }
    return (
      l.includes("name") ||
      l.includes("pangalan") ||
      l.includes("position") ||
      l.includes("applying for") ||
      l.includes("occupation") ||
      l.includes("trabaho") ||
      l.includes("citizenship") ||
      l.includes("nationality") ||
      l.includes("asawa") ||
      l.includes("spouse") ||
      l.includes("mother") ||
      l.includes("father") ||
      l.includes("ina") ||
      l.includes("ama") ||
      l.includes("surname") ||
      l.includes("child") ||
      l.includes("anak") ||
      l.includes("sex") ||
      l.includes("gender") ||
      l.includes("kasal")
    );
  };

  const handleFieldKeyDown = (field: DynField, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isNumberOnlyField(field)) {
      const l = field.label.toLowerCase();
      if (l.includes("salary") || l.includes("weight") || l.includes("height")) {
        allowNumbersAndDecimal(e);
      } else if (l.includes("bp")) {
        allowNumbersAndSlash(e);
      } else {
        allowOnlyNumbers(e);
      }
    } else if (isLetterOnlyField(field)) {
      allowOnlyLetters(e);
    }
  };

  const handleFieldChange = (idx: number, field: DynField, rawValue: string) => {
    let val = rawValue;
    if (isNumberOnlyField(field)) {
      const l = field.label.toLowerCase();
      if (l.includes("salary") || l.includes("weight") || l.includes("height")) {
        val = sanitizeNumbersAndDecimal(val);
      } else if (l.includes("bp")) {
        val = sanitizeNumbersAndSlash(val);
      } else {
        val = sanitizeNumbers(val);
      }
    } else if (isLetterOnlyField(field)) {
      val = sanitizeLetters(val);
    }
    updateField(idx, { value: val });
  };

  /* ── Section header renderer ── */
  const renderSectionHeader = (field: DynField, idx: number) => {
    const prevSection = idx > 0 ? draftFields[idx - 1]?.section : undefined;
    if (field.section && field.section !== prevSection) {
      return (
        <div className="md:col-span-2 pt-4 pb-1 border-b-2 border-primary/40 dark:border-primary/50 mb-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-primary font-heading">
            {field.section}
          </p>
        </div>
      );
    }
    return null;
  };

  /* ── Wizard navigation helpers ── */
  const canGoToStep = (step: number): boolean => {
    if (step === 1) return true;
    if (step === 2) return draftFields.length > 0;
    if (step === 3) return draftFields.length > 0;
    return false;
  };

  const goNext = () => {
    if (currentStep === 1) {
      // Step 1 → 2: require fields to exist (conversion must have run)
      if (draftFields.length === 0) {
        toast.error("Please upload and convert a paper form first before proceeding.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (draftFields.length === 0) {
        toast.error("You need at least one field to preview the form.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only {
          display: none;
        }
        @media print {
          @page {
            size: auto;
            margin: 8mm 10mm;
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
          .print-only {
            display: flex !important;
          }
          /* Fit full sheet of bond paper */
          #digital-replica-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background: white !important;
            padding: 10px 15px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: black !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            overflow: visible !important;
          }
          html, body {
            height: 100% !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Official Barangay 3-seal header */
          .header-seal {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 20px !important;
            border-bottom: 4px double #000000 !important;
            padding-bottom: 12px !important;
            margin-bottom: 14px !important;
            text-align: center !important;
          }
          .header-seal img {
            height: 70px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }
          #digital-replica-print-area input.print-title-input {
            border: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            text-align: center !important;
            text-transform: uppercase !important;
            padding: 0 !important;
            margin-bottom: 8px !important;
            height: auto !important;
            width: 100% !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }
          #digital-replica-print-area label,
          #digital-replica-print-area p,
          #digital-replica-print-area span,
          #digital-replica-print-area input {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            opacity: 1 !important;
            font-size: 11px !important;
          }
          #digital-replica-print-area label {
            font-weight: 700 !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            margin-bottom: 2px !important;
          }
          #digital-replica-print-area input {
            height: 22px !important;
            font-size: 11px !important;
            padding: 1px 3px !important;
            border-bottom: 1px solid #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #digital-replica-print-area textarea {
            display: block !important;
            width: 100% !important;
            min-height: 44px !important;
            border-bottom: 1px solid #000000 !important;
            background: transparent !important;
            font-size: 11px !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }
          #digital-replica-print-area .grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            column-gap: 20px !important;
            row-gap: 8px !important;
            padding-top: 2px !important;
          }
          #digital-replica-print-area .border-b-2 {
            padding-top: 8px !important;
            padding-bottom: 2px !important;
            margin-bottom: 4px !important;
            border-bottom: 2px solid #000000 !important;
          }
          #digital-replica-print-area .border-b-2 p {
            font-size: 11.5px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            color: #000000 !important;
          }
          /* Hide placeholder text when printing */
          #digital-replica-print-area ::placeholder,
          #digital-replica-print-area input::placeholder,
          #digital-replica-print-area textarea::placeholder,
          ::placeholder,
          ::-webkit-input-placeholder,
          ::-moz-placeholder,
          :-ms-input-placeholder,
          input::placeholder,
          textarea::placeholder {
            display: none !important;
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

      {/* ─── Header Banner ─── */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            {formId ? <FileText className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {formId ? draftTitle : "Manual-to-Digital Form Converter & Deployer"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 max-w-2xl">
              {formId
                ? (draftDesc || "Official digital record for Barangay Subukin health registry.")
                : "Scan any paper form to convert it into an accurate digital format. Assign custom titles, model layout after existing system forms, and deploy directly to Health Forms."}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Wizard Step Indicator ─── */}
      {!formId && (
        <StepIndicator
          current={currentStep}
          onStepClick={(s) => { if (canGoToStep(s)) setCurrentStep(s); }}
          canGoTo={canGoToStep}
        />
      )}

      {/* ═══════════════════════════════════════════════════════
         STEP 1 — UPLOAD & CONFIGURE
         ═══════════════════════════════════════════════════════ */}
      {currentStep === 1 && !formId && (
        <Card className="border-border/50 shadow-sm no-print animate-in fade-in-0 slide-in-from-right-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2 text-foreground">
              <ScanLine className="h-5 w-5 text-primary" />
              Step 1 — Upload Paper Form & Configure Conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Image Upload Area */}
            <div
              className="relative aspect-[16/7] rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-primary/70 hover:bg-muted/50 transition-all group"
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

            {/* Camera / File Buttons */}
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
                placeholder="Enter form title..."
                className="text-xs h-9 bg-background font-medium"
              />
            </div>

            {/* AI Conversion Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" /> Manual-to-Digital AI Conversion Prompt
                </Label>
                <span className="text-[10px] text-muted-foreground font-semibold text-primary">System Model Aligned</span>
              </div>
              <Textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Enter instructions for AI conversion..."
                rows={4}
                className="text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground italic">
                Inputs will be rendered on underline lines rather than boxes; letter input is restricted when only numbers are required, and vice versa, unless both are needed. Replicates everything from the form exactly into a digital version.
              </p>
            </div>

            {/* Convert Button & Start Over */}
            <div className="flex flex-col gap-2 pt-1">
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

            {/* Next (if fields already exist from a previous conversion) */}
            {draftFields.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <Button type="button" onClick={goNext} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
                  Continue to Review Fields <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
         STEP 2 — REVIEW & EDIT FIELDS
         ═══════════════════════════════════════════════════════ */}
      {currentStep === 2 && draftFields.length > 0 && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-300">
          {/* Title & Badge Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-xl shadow-xs no-print">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold px-2.5 py-0.5">
                {draftFields.length} Field(s) Extracted
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

            {/* Resident Selector */}
            <div className="w-full sm:w-64">
              <Select value={selectedResidentId} onValueChange={handleSelectResident}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Link Resident to Auto-fill" />
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

          {/* Field Editor Card */}
          <Card className="border-border/50 shadow-sm no-print">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                Step 2 — Review & Edit Extracted Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Review the fields extracted from your paper form below. You can rename fields, change their types, remove unwanted fields, or add new ones.
              </p>

              {/* Description input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Form Description (optional)</Label>
                <Input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="Brief description of this form..." className="text-xs" />
              </div>

              {/* Fields List */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Extracted Fields</Label>
                {draftFields.map((f, i) => {
                  const prevSection = i > 0 ? draftFields[i - 1]?.section : undefined;
                  const showSection = f.section && f.section !== prevSection;
                  return (
                    <React.Fragment key={i}>
                      {showSection && (
                        <div className="pt-3 pb-1 border-b border-primary/40 mt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            {f.section}
                          </p>
                        </div>
                      )}
                      <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
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
                    </React.Fragment>
                  );
                })}

                <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" /> Add Field
                </Button>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50">
                {!formId && (
                  <Button type="button" variant="outline" size="sm" onClick={goBack} className="gap-1.5 text-xs">
                    <ChevronLeft className="h-4 w-4" /> Back to Upload
                  </Button>
                )}
                <div className="flex-1" />
                <Button type="button" onClick={goNext} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-6">
                  Preview & Deploy <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         STEP 3 — PREVIEW & DEPLOY (DIGITAL REPLICA)
         ═══════════════════════════════════════════════════════ */}
      {currentStep === 3 && draftFields.length > 0 && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-300">
          <Card id="digital-replica-print-area" className="border border-slate-300 dark:border-slate-700 shadow-md bg-card text-card-foreground">
            <CardContent className="p-6 md:p-8 space-y-6">

              {/* Official Barangay Printable Header */}
              <div className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-3 mb-4 text-center">
                <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
                <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" />
                <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply" />
              </div>

              {/* Form Title Banner & Resident Linker */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-border/50">
                <div className="flex-1">
                  <h1 className="text-base md:text-lg font-bold font-heading uppercase text-foreground tracking-wide print-title-heading">
                    {draftTitle || "Health Form Record"}
                  </h1>
                  {draftDesc && (
                    <p className="text-xs text-muted-foreground no-print mt-0.5">
                      {draftDesc}
                    </p>
                  )}
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

              {/* Preserved Form Fields Grid (Clean Underline Line Inputs) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                {draftFields.map((field, idx) => (
                  <React.Fragment key={idx}>
                    {renderSectionHeader(field, idx)}
                    <div
                      className={`space-y-1 ${
                        field.type === "textarea" ? "md:col-span-2 no-print" : ""
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
                          placeholder=""
                          className="text-xs leading-relaxed border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 shadow-none w-full"
                        />
                      ) : (
                        <Input
                          type={field.type === "date" ? "date" : "text"}
                          value={field.type === "date" && !field.value ? getTodayDate() : field.value}
                          onKeyDown={(e) => handleFieldKeyDown(field, e)}
                          onChange={(e) => handleFieldChange(idx, field, e.target.value)}
                          placeholder=""
                          className={lineInputClass}
                        />
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Bottom Signature & Action Bar */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 no-print">
                  <p className="font-bold text-slate-900 dark:text-slate-100">Barangay Subukin Health Center Services</p>
                  <p className="italic text-[11px]">Inputs modeled on lines with official header seal in printable format.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 no-print w-full md:w-auto justify-end">
                  {formId ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetDraft}
                        className="gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" /> Reset
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
                        onClick={handleSaveRecord}
                        size="sm"
                        className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm px-6"
                      >
                        <Save className="h-4 w-4" /> Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
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
                        className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm px-5"
                      >
                        <Rocket className="h-4 w-4" /> Deploy Form
                      </Button>
                    </>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Back to Edit button below the card (for non-formId flows) */}
          {!formId && (
            <div className="flex items-center gap-3 no-print">
              <Button type="button" variant="outline" size="sm" onClick={goBack} className="gap-1.5 text-xs">
                <ChevronLeft className="h-4 w-4" /> Back to Edit Fields
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={fullReset} className="gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Start Over
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── DEPLOYED CUSTOM FORMS LIST (Only shown on Add New Form wizard, NOT on deployed forms) ─── */}
      {!formId && (
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 text-muted-foreground"
                          onClick={() => {
                            setDraftTitle(f.title);
                            setCustomTitleInput(f.title);
                            setDraftDesc(f.description);
                            setDraftFields(f.fields);
                            setImageData(f.imagePreview || null);
                            setCurrentStep(2);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Settings2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTemplateConfirmId(f.id)}
                          title="Delete Template"
                        >
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
      )}

      {/* Delete Form Template Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateConfirmId} onOpenChange={() => setDeleteTemplateConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Form Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom form template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTemplateConfirmId) {
                  deleteSaved(deleteTemplateConfirmId);
                  setDeleteTemplateConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddNewForm;