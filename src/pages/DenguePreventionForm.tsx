import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bug } from "lucide-react";

const DenguePreventionForm = () => {
  const [form, setForm] = useState({
    householdName: "", containerType: "", hasLarvae: false, actionPlan: "", signature: "",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Dengue prevention record saved!");
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
              <Label>Name of Household</Label>
              <Input value={form.householdName} onChange={(e) => handleChange("householdName", e.target.value)} placeholder="Household name" />
            </div>
            <div className="space-y-2">
              <Label>Type of Container / Breeding Area</Label>
              <Input value={form.containerType} onChange={(e) => handleChange("containerType", e.target.value)} placeholder="e.g. Tire, Flower pot, etc." />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Kiti-Kiti (Larvae Present)</Label>
              <Switch checked={form.hasLarvae} onCheckedChange={(v) => handleChange("hasLarvae", v)} />
            </div>
            <div className="space-y-2">
              <Label>Action Plan / Measures</Label>
              <Textarea value={form.actionPlan} onChange={(e) => handleChange("actionPlan", e.target.value)} placeholder="Actions taken..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Signature</Label>
              <Input value={form.signature} onChange={(e) => handleChange("signature", e.target.value)} placeholder="Inspector name" />
            </div>
            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Record</Button>
              <Button type="button" variant="outline">Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DenguePreventionForm;
