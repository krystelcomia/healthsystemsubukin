import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FamilyDataForm = () => {
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    resident_id: "", familyNumber: "", numberOfHouseholds: "", fatherName: "", motherName: "", numberOfMales: "", numberOfFemales: "",
  });

  useEffect(() => {
    supabase.from("residents").select("id, full_name").order("full_name").then(({ data }) => setResidents(data || []));
  }, []);

  const totalMembers = (Number(form.numberOfMales) || 0) + (Number(form.numberOfFemales) || 0);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) { toast.error("Please select a resident"); return; }
    const { error } = await supabase.from("family_data").insert({
      resident_id: form.resident_id,
      family_number: form.familyNumber,
      num_households: Number(form.numberOfHouseholds) || 0,
      father_name: form.fatherName,
      mother_name: form.motherName,
      num_males: Number(form.numberOfMales) || 0,
      num_females: Number(form.numberOfFemales) || 0,
      total_members: totalMembers,
    });
    if (error) { toast.error("Failed to save family data"); return; }
    toast.success("Family data saved successfully!");
    setForm({ resident_id: "", familyNumber: "", numberOfHouseholds: "", fatherName: "", motherName: "", numberOfMales: "", numberOfFemales: "" });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Family Data Form
        </h1>
        <p className="text-muted-foreground mt-1">Record household and family information.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Family Information</CardTitle></CardHeader>
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
              <div className="space-y-2"><Label>Family Number</Label><Input value={form.familyNumber} onChange={(e) => handleChange("familyNumber", e.target.value)} placeholder="e.g. F-001" /></div>
              <div className="space-y-2"><Label>Number of Households</Label><Input type="number" value={form.numberOfHouseholds} onChange={(e) => handleChange("numberOfHouseholds", e.target.value)} placeholder="0" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Household Head (Father)</Label><Input value={form.fatherName} onChange={(e) => handleChange("fatherName", e.target.value)} placeholder="Full name" /></div>
              <div className="space-y-2"><Label>Name of Mother</Label><Input value={form.motherName} onChange={(e) => handleChange("motherName", e.target.value)} placeholder="Full name" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Males</Label><Input type="number" value={form.numberOfMales} onChange={(e) => handleChange("numberOfMales", e.target.value)} placeholder="0" /></div>
              <div className="space-y-2"><Label>Females</Label><Input type="number" value={form.numberOfFemales} onChange={(e) => handleChange("numberOfFemales", e.target.value)} placeholder="0" /></div>
              <div className="space-y-2"><Label>Total Members</Label><div className="h-10 flex items-center px-3 rounded-md bg-secondary text-secondary-foreground font-semibold">{totalMembers}</div></div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Record</Button>
              <Button type="button" variant="outline" onClick={() => setForm({ resident_id: "", familyNumber: "", numberOfHouseholds: "", fatherName: "", motherName: "", numberOfMales: "", numberOfFemales: "" })}>Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyDataForm;
