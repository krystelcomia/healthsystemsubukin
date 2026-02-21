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

const PhilPenHealthForm = () => {
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0],
    bp: "", height: "", weight: "",
    smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false,
  });

  useEffect(() => {
    supabase.from("residents").select("id, full_name").order("full_name").then(({ data }) => setResidents(data || []));
  }, []);

  const bmi = form.height && form.weight ? (Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1) : "—";

  const handleChange = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) { toast.error("Please select a resident"); return; }
    const { error } = await supabase.from("philpen_health").insert({
      resident_id: form.resident_id,
      address_sitio: form.address,
      age: Number(form.age) || null,
      birthdate: form.birthdate || null,
      record_date: form.currentDate,
      bp: form.bp,
      height: form.height,
      weight: form.weight,
      bmi: bmi !== "—" ? bmi : null,
      smokes: form.smokes,
      drinks_alcohol: form.drinksAlcohol,
      high_blood_pressure: form.highBloodPressure,
      diabetes_symptoms: form.diabetesSymptoms,
    });
    if (error) { toast.error("Failed to save record"); return; }
    toast.success("PhilPen health record saved!");
    setForm({ resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0], bp: "", height: "", weight: "", smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          PhilPen Health Form
        </h1>
        <p className="text-muted-foreground mt-1">Community health screening and assessment.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Personal Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Resident *</Label>
              <Select value={form.resident_id} onValueChange={(v) => handleChange("resident_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a resident" /></SelectTrigger>
                <SelectContent>{residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Address / Sitio</Label><Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Address" /></div>
              <div className="space-y-2"><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="0" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Birthdate</Label><Input type="date" value={form.birthdate} onChange={(e) => handleChange("birthdate", e.target.value)} /></div>
              <div className="space-y-2"><Label>Current Date</Label><Input type="date" value={form.currentDate} onChange={(e) => handleChange("currentDate", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>BP</Label><Input value={form.bp} onChange={(e) => handleChange("bp", e.target.value)} placeholder="120/80" /></div>
              <div className="space-y-2"><Label>Height (cm)</Label><Input value={form.height} onChange={(e) => handleChange("height", e.target.value)} placeholder="cm" /></div>
              <div className="space-y-2"><Label>Weight (kg)</Label><Input value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="kg" /></div>
              <div className="space-y-2"><Label>BMI</Label><div className="h-10 flex items-center px-3 rounded-md bg-secondary text-secondary-foreground font-semibold">{bmi}</div></div>
            </div>

            <div className="pt-4 space-y-4">
              <h3 className="font-heading font-semibold text-foreground">Health Questions</h3>
              {[
                { key: "smokes", label: "Do you smoke?" },
                { key: "drinksAlcohol", label: "Do you drink alcohol?" },
                { key: "highBloodPressure", label: "Do you have high blood pressure?" },
                { key: "diabetesSymptoms", label: "Do you have symptoms of diabetes?" },
              ].map((q) => (
                <div key={q.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <Label className="text-sm">{q.label}</Label>
                  <Switch checked={form[q.key as keyof typeof form] as boolean} onCheckedChange={(v) => handleChange(q.key, v)} />
                </div>
              ))}
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Record</Button>
              <Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", address: "", age: "", birthdate: "", currentDate: new Date().toISOString().split("T")[0], bp: "", height: "", weight: "", smokes: false, drinksAlcohol: false, highBloodPressure: false, diabetesSymptoms: false })}>Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhilPenHealthForm;
