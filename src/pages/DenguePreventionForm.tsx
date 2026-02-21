import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DenguePreventionForm = () => {
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", householdName: "", containerType: "", hasLarvae: false, actionPlan: "", signature: "",
  });

  useEffect(() => {
    supabase.from("residents").select("id, full_name").order("full_name").then(({ data }) => setResidents(data || []));
  }, []);

  const handleChange = (field: string, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) { toast.error("Please select a resident"); return; }
    const { error } = await supabase.from("dengue_prevention").insert({
      resident_id: form.resident_id,
      household_name: form.householdName,
      container_type: form.containerType,
      has_larvae: form.hasLarvae,
      action_plan: form.actionPlan,
      signature: form.signature,
    });
    if (error) { toast.error("Failed to save record"); return; }
    toast.success("Dengue prevention record saved!");
    setForm({ resident_id: "", householdName: "", containerType: "", hasLarvae: false, actionPlan: "", signature: "" });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Bug className="h-6 w-6 text-primary" />
          Dengue Prevention Form
        </h1>
        <p className="text-muted-foreground mt-1">Record larvae and mosquito breeding inspections.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Inspection Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Resident *</Label>
              <Select value={form.resident_id} onValueChange={(v) => handleChange("resident_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a resident" /></SelectTrigger>
                <SelectContent>{residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Name of Household</Label><Input value={form.householdName} onChange={(e) => handleChange("householdName", e.target.value)} placeholder="Household name" /></div>
            <div className="space-y-2"><Label>Type of Container / Breeding Area</Label><Input value={form.containerType} onChange={(e) => handleChange("containerType", e.target.value)} placeholder="e.g. Tire, Flower pot, etc." /></div>
            <div className="flex items-center justify-between py-2"><Label>Kiti-Kiti (Larvae Present)</Label><Switch checked={form.hasLarvae} onCheckedChange={(v) => handleChange("hasLarvae", v)} /></div>
            <div className="space-y-2"><Label>Action Plan / Measures</Label><Textarea value={form.actionPlan} onChange={(e) => handleChange("actionPlan", e.target.value)} placeholder="Actions taken..." rows={3} /></div>
            <div className="space-y-2"><Label>Signature</Label><Input value={form.signature} onChange={(e) => handleChange("signature", e.target.value)} placeholder="Inspector name" /></div>
            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Record</Button>
              <Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", householdName: "", containerType: "", hasLarvae: false, actionPlan: "", signature: "" })}>Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DenguePreventionForm;
