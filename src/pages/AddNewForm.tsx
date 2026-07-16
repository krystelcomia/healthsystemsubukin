import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Camera, Upload, Loader2, FileCheck2, Trash2, Plus, ScanLine, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [imageData, setImageData] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [scanning, setScanning] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftFields, setDraftFields] = useState<DynField[]>([]);
  const [savedForms, setSavedForms] = useState<CustomForm[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedForms(loadForms());
  }, []);

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

  const runScan = async () => {
    if (!imageData) {
      toast.error("Please upload or take a picture of the form first.");
      return;
    }
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-form", {
        body: { image: imageData, hint },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fields: DynField[] = Array.isArray(data?.fields)
        ? data.fields.map((f: any) => ({
            label: String(f.label ?? "Untitled field"),
            type: (["text", "number", "date", "textarea", "checkbox"].includes(f.type) ? f.type : "text") as FieldType,
            value: f.value != null ? String(f.value) : "",
          }))
        : [];
      setDraftTitle(String(data?.title || "Scanned Form"));
      setDraftDesc(String(data?.description || ""));
      setDraftFields(fields);
      toast.success(`Extracted ${fields.length} field${fields.length === 1 ? "" : "s"}.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to scan form.");
    } finally {
      setScanning(false);
    }
  };

  const updateField = (idx: number, patch: Partial<DynField>) => {
    setDraftFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeField = (idx: number) => setDraftFields((prev) => prev.filter((_, i) => i !== idx));
  const addField = () => setDraftFields((prev) => [...prev, { label: "New field", type: "text", value: "" }]);

  const resetDraft = () => {
    setImageData(null);
    setHint("");
    setDraftTitle("");
    setDraftDesc("");
    setDraftFields([]);
  };

  const saveDraft = () => {
    if (!draftTitle.trim()) {
      toast.error("Please give the form a title.");
      return;
    }
    if (draftFields.length === 0) {
      toast.error("Add at least one field before saving.");
      return;
    }
    const newForm: CustomForm = {
      id: crypto.randomUUID(),
      title: draftTitle.trim(),
      description: draftDesc.trim(),
      fields: draftFields,
      imagePreview: imageData ?? undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [newForm, ...loadForms()];
    saveForms(next);
    setSavedForms(next);
    toast.success("Form saved to Health Forms.");
    resetDraft();
  };

  const deleteSaved = (id: string) => {
    const next = loadForms().filter((f) => f.id !== id);
    saveForms(next);
    setSavedForms(next);
    toast.success("Form removed.");
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Add New Form
        </h1>
        <p className="text-muted-foreground mt-1">
          Snap a picture of any paper health form and let AI turn it into a digital form you can fill out and save.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Step 1 — Capture the paper form
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="relative aspect-[4/3] rounded-lg border-2 border-dashed border-border/60 bg-secondary/40 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imageData ? (
                <img src={imageData} alt="Form preview" className="h-full w-full object-contain" />
              ) : (
                <div className="text-center px-4">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload / drop image</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, up to 8MB</p>
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

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Take Photo
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
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
              <div className="space-y-2">
                <Label>Optional hint for the AI</Label>
                <Textarea
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. This is a nutrition monitoring form for children under 5."
                  rows={3}
                />
              </div>
              <Button type="button" onClick={runScan} disabled={!imageData || scanning} className="w-full">
                {scanning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning form...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Convert to Digital Form</>
                )}
              </Button>
              {imageData && (
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={resetDraft}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Start over
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(draftTitle || draftFields.length > 0) && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" /> Step 2 — Review & Fill the Digital Form
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Form Title</Label>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {draftFields.map((f, i) => (
                <div key={i} className="rounded-md border border-border/60 p-3 bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={f.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      className="flex-1 h-8 text-sm font-medium"
                    />
                    <select
                      value={f.type}
                      onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="textarea">Long text</option>
                      <option value="checkbox">Yes / No</option>
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeField(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {f.type === "textarea" ? (
                    <Textarea value={f.value} onChange={(e) => updateField(i, { value: e.target.value })} rows={2} />
                  ) : f.type === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={f.value === "true"}
                        onCheckedChange={(v) => updateField(i, { value: v ? "true" : "false" })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {f.value === "true" ? "Yes" : "No"}
                      </span>
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={f.value}
                      onChange={(e) => updateField(i, { value: e.target.value })}
                    />
                  )}
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="h-4 w-4 mr-2" /> Add field
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={saveDraft}>
                <FileCheck2 className="h-4 w-4 mr-2" /> Save Digital Form
              </Button>
              <Button type="button" variant="outline" onClick={resetDraft}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">Saved Custom Forms</CardTitle>
          <Badge variant="secondary">{savedForms.length}</Badge>
        </CardHeader>
        <CardContent>
          {savedForms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom forms yet. Scan a paper form above to create your first digital form.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedForms.map((f) => (
                <div key={f.id} className="rounded-md border border-border/60 p-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.description || `${f.fields.length} field${f.fields.length === 1 ? "" : "s"}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(f.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteSaved(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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