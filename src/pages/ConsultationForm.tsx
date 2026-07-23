import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { ensureResidentExists } from "@/lib/residentLinker";
import { logActivity } from "@/lib/activityLogger";
import { calculateAge } from "@/lib/residentLinker";

const lineInputClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none h-9";
const lineSelectClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus:ring-0 focus:border-slate-800 dark:focus:border-slate-200 shadow-none h-9";
const lineTextareaClass = "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none px-1 focus-visible:ring-0 focus-visible:border-slate-800 dark:focus-visible:border-slate-200 shadow-none resize-y min-h-[60px]";

const ConsultationForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<{ id: string; full_name: string; sitio?: string; age?: number; birthday?: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0],
    temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "",
  });

  useEffect(() => { 
    supabase.from("residents").select("id, full_name, sitio, age, birthday").order("full_name").then(({ data }) => setResidents(data || [])); 
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
      consultation_date: form.date, temperature: form.temperature, pulse_rate: form.pulseRate, respiration_rate: form.respirationRate, height: form.height, weight: form.weight, consultation_cause: form.consultationCause,
    });
    if (error) { toast.error("Failed to save consultation"); return; }
    const selectedResident = residents.find(r => r.id === targetId);
    const resName = selectedResident ? selectedResident.full_name : targetId;
    logActivity("submit_consultation", { entity_type: "consultation", description: `Recorded a health consultation for resident: ${resName}` });
    toast.success("Consultation recorded and linked to resident records!");
    setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0], temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" });
  };

  return (
    <div className="w-full space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("consultation.resident")} *</Label>
                <Select value={form.resident_id} onValueChange={handleSelectResident}>
                  <SelectTrigger className={lineSelectClass}><SelectValue placeholder={t("consultation.selectResident")} /></SelectTrigger>
                  <SelectContent>
                    {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("consultation.sitio")}</Label><Input className={lineInputClass} value={form.sitio} onChange={(e) => handleChange("sitio", e.target.value)} placeholder="Sitio / Area" /></div>
              <div className="space-y-2"><Label>{t("consultation.date")}</Label><Input className={lineInputClass} type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>{t("consultation.birthdate")}</Label><Input className={lineInputClass} type="date" value={form.birthdate} onChange={(e) => {
                const bday = e.target.value;
                const computed = calculateAge(bday);
                setForm(prev => ({ ...prev, birthdate: bday, age: computed > 0 ? String(computed) : prev.age }));
              }} /></div>
              <div className="space-y-2"><Label>{t("consultation.age")}</Label><Input className={lineInputClass} type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>{t("consultation.temp")}</Label><Input className={lineInputClass} value={form.temperature} onChange={(e) => handleChange("temperature", e.target.value)} placeholder="36.5" /></div>
              <div className="space-y-2"><Label>{t("consultation.pulseRate")}</Label><Input className={lineInputClass} value={form.pulseRate} onChange={(e) => handleChange("pulseRate", e.target.value)} placeholder="bpm" /></div>
              <div className="space-y-2"><Label>{t("consultation.respRate")}</Label><Input className={lineInputClass} value={form.respirationRate} onChange={(e) => handleChange("respirationRate", e.target.value)} placeholder="bpm" /></div>
              <div className="space-y-2"><Label>{t("consultation.height")}</Label><Input className={lineInputClass} value={form.height} onChange={(e) => handleChange("height", e.target.value)} placeholder="cm" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>{t("consultation.weight")}</Label><Input className={lineInputClass} value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="kg" /></div></div>
            <div className="space-y-2"><Label>{t("consultation.cause")}</Label><Textarea className={lineTextareaClass} value={form.consultationCause} onChange={(e) => handleChange("consultationCause", e.target.value)} placeholder={t("consultation.causeDesc")} rows={3} /></div>
            <div className="pt-4 flex gap-3"><Button type="submit">{t("consultation.saveConsultation")}</Button><Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0], temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" })}>{t("common.clear")}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultationForm;
