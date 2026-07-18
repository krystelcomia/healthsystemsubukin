import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";

const PhilPenHealthForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0],
    bp: "", height: "", weight: "", smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false,
  });

  useEffect(() => { supabase.from("residents").select("id, full_name").order("full_name").then(({ data }) => setResidents(data || [])); }, []);

  const bmi = form.height && form.weight ? (Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1) : "—";
  const handleChange = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) { toast.error(t("consultation.selectResident")); return; }
    const { error } = await supabase.from("philpen_health").insert({
      resident_id: form.resident_id, address_sitio: form.address, age: Number(form.age) || null, birthdate: form.birthdate || null,
      record_date: form.currentDate, bp: form.bp, height: form.height, weight: form.weight, bmi: bmi !== "—" ? bmi : null,
      smokes: form.smokes, drinks_alcohol: form.drinksAlcohol, high_blood_pressure: form.highBloodPressure, diabetes_symptoms: form.diabetesSymptoms,
    });
    if (error) { toast.error("Failed to save"); return; }
    const selectedResident = residents.find(r => r.id === form.resident_id);
    const resName = selectedResident ? selectedResident.full_name : form.resident_id;
    logActivity("submit_philpen", { entity_type: "philpen_health", description: `Saved PhilPen health record for resident: ${resName}` });
    toast.success("PhilPen health record saved!");
    setForm({ resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0], bp: "", height: "", weight: "", smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false });
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />{t("philpen.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("philpen.desc")}</p>
      </div>
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("philpen.personalDetails")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>{t("consultation.resident")} *</Label><Select value={form.resident_id} onValueChange={(v) => handleChange("resident_id", v)}><SelectTrigger><SelectValue placeholder={t("consultation.selectResident")} /></SelectTrigger><SelectContent>{residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("philpen.address")}</Label><Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder={t("philpen.address")} /></div>
              <div className="space-y-2"><Label>{t("consultation.age")}</Label><Input type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("consultation.birthdate")}</Label><Input type="date" value={form.birthdate} onChange={(e) => handleChange("birthdate", e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("philpen.currentDate")}</Label><Input type="date" value={form.currentDate} onChange={(e) => handleChange("currentDate", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>{t("philpen.bp")}</Label><Input value={form.bp} onChange={(e) => handleChange("bp", e.target.value)} placeholder="120/80" /></div>
              <div className="space-y-2"><Label>{t("consultation.height")}</Label><Input value={form.height} onChange={(e) => handleChange("height", e.target.value)} placeholder="cm" /></div>
              <div className="space-y-2"><Label>{t("consultation.weight")}</Label><Input value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="kg" /></div>
              <div className="space-y-2"><Label>{t("philpen.bmi")}</Label><div className="h-10 flex items-center px-3 rounded-md bg-secondary text-secondary-foreground font-semibold">{bmi}</div></div>
            </div>
            <div className="pt-4 space-y-4">
              <h3 className="font-heading font-semibold text-foreground">{t("philpen.healthQuestions")}</h3>
              {[
                { key: "smokes", label: t("philpen.smoke") },
                { key: "drinksAlcohol", label: t("philpen.alcohol") },
                { key: "highBloodPressure", label: t("philpen.highBP") },
                { key: "diabetesSymptoms", label: t("philpen.diabetes") },
              ].map((q) => (
                <div key={q.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <Label className="text-sm">{q.label}</Label>
                  <Switch checked={form[q.key as keyof typeof form] as boolean} onCheckedChange={(v) => handleChange(q.key, v)} />
                </div>
              ))}
            </div>
            <div className="pt-4 flex gap-3"><Button type="submit">{t("philpen.saveRecord")}</Button><Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0], bp: "", height: "", weight: "", smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false })}>{t("common.clear")}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhilPenHealthForm;
