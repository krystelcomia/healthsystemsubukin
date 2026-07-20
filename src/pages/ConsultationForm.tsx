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

const ConsultationForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<{ id: string; full_name: string; sitio?: string; age?: number; birthday?: string }[]>([]);
  const [customResidentName, setCustomResidentName] = useState("");
  const [form, setForm] = useState({
    resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0],
    temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "",
  });

  useEffect(() => { 
    supabase.from("residents").select("id, full_name, sitio, age, birthday").order("full_name").then(({ data }) => setResidents(data || [])); 
  }, []);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSelectResident = (id: string) => {
    if (id === "new_custom") {
      setForm(prev => ({ ...prev, resident_id: "new_custom" }));
      return;
    }
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
    let targetId = form.resident_id;

    if (targetId === "new_custom" || !targetId) {
      if (!customResidentName.trim()) {
        toast.error(t("consultation.selectResident"));
        return;
      }
      const linkedId = await ensureResidentExists({
        fullName: customResidentName,
        sitio: form.sitio,
        age: form.age,
        birthday: form.birthdate,
      });
      if (linkedId) targetId = linkedId;
    }

    if (!targetId) { toast.error(t("consultation.selectResident")); return; }

    const { error } = await supabase.from("consultations").insert({
      resident_id: targetId, birthdate: form.birthdate || null, age: Number(form.age) || null, sitio: form.sitio,
      consultation_date: form.date, temperature: form.temperature, pulse_rate: form.pulseRate, respiration_rate: form.respirationRate, height: form.height, weight: form.weight, consultation_cause: form.consultationCause,
    });
    if (error) { toast.error("Failed to save consultation"); return; }
    const selectedResident = residents.find(r => r.id === targetId);
    const resName = selectedResident ? selectedResident.full_name : customResidentName || targetId;
    logActivity("submit_consultation", { entity_type: "consultation", description: `Recorded a health consultation for resident: ${resName}` });
    toast.success("Consultation recorded and linked to resident records!");
    setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0], temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" });
    setCustomResidentName("");
  };

  return (
    <div className="w-full space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("consultation.patientInfo")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("consultation.resident")} *</Label>
                <Select value={form.resident_id} onValueChange={handleSelectResident}>
                  <SelectTrigger><SelectValue placeholder={t("consultation.selectResident")} /></SelectTrigger>
                  <SelectContent>
                    {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                    <SelectItem value="new_custom">+ Add / Type New Resident Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.resident_id === "new_custom" && (
                <div className="space-y-2">
                  <Label>Resident Full Name *</Label>
                  <Input 
                    value={customResidentName} 
                    onChange={(e) => setCustomResidentName(e.target.value)} 
                    placeholder="Enter resident full name" 
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("consultation.sitio")}</Label><Input value={form.sitio} onChange={(e) => handleChange("sitio", e.target.value)} placeholder="Sitio / Area" /></div>
              <div className="space-y-2"><Label>{t("consultation.date")}</Label><Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>{t("consultation.birthdate")}</Label><Input type="date" value={form.birthdate} onChange={(e) => handleChange("birthdate", e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("consultation.age")}</Label><Input type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>{t("consultation.temp")}</Label><Input value={form.temperature} onChange={(e) => handleChange("temperature", e.target.value)} placeholder="36.5" /></div>
              <div className="space-y-2"><Label>{t("consultation.pulseRate")}</Label><Input value={form.pulseRate} onChange={(e) => handleChange("pulseRate", e.target.value)} placeholder="bpm" /></div>
              <div className="space-y-2"><Label>{t("consultation.respRate")}</Label><Input value={form.respirationRate} onChange={(e) => handleChange("respirationRate", e.target.value)} placeholder="bpm" /></div>
              <div className="space-y-2"><Label>{t("consultation.height")}</Label><Input value={form.height} onChange={(e) => handleChange("height", e.target.value)} placeholder="cm" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>{t("consultation.weight")}</Label><Input value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="kg" /></div></div>
            <div className="space-y-2"><Label>{t("consultation.cause")}</Label><Textarea value={form.consultationCause} onChange={(e) => handleChange("consultationCause", e.target.value)} placeholder={t("consultation.causeDesc")} rows={3} /></div>
            <div className="pt-4 flex gap-3"><Button type="submit">{t("consultation.saveConsultation")}</Button><Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0], temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "" })}>{t("common.clear")}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultationForm;
