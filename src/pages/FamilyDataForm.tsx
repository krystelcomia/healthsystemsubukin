import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

const FamilyDataForm = () => {
  const [form, setForm] = useState({
    familyNumber: "",
    numberOfHouseholds: "",
    fatherName: "",
    motherName: "",
    numberOfMales: "",
    numberOfFemales: "",
  });

  const totalMembers = (Number(form.numberOfMales) || 0) + (Number(form.numberOfFemales) || 0);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Family data saved successfully!");
    setForm({ familyNumber: "", numberOfHouseholds: "", fatherName: "", motherName: "", numberOfMales: "", numberOfFemales: "" });
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
        <CardHeader>
          <CardTitle className="text-lg font-heading">Family Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="familyNumber">Family Number</Label>
                <Input id="familyNumber" value={form.familyNumber} onChange={(e) => handleChange("familyNumber", e.target.value)} placeholder="e.g. F-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfHouseholds">Number of Households</Label>
                <Input id="numberOfHouseholds" type="number" value={form.numberOfHouseholds} onChange={(e) => handleChange("numberOfHouseholds", e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Household Head (Father)</Label>
                <Input id="fatherName" value={form.fatherName} onChange={(e) => handleChange("fatherName", e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Name of Mother</Label>
                <Input id="motherName" value={form.motherName} onChange={(e) => handleChange("motherName", e.target.value)} placeholder="Full name" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfMales">Males</Label>
                <Input id="numberOfMales" type="number" value={form.numberOfMales} onChange={(e) => handleChange("numberOfMales", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfFemales">Females</Label>
                <Input id="numberOfFemales" type="number" value={form.numberOfFemales} onChange={(e) => handleChange("numberOfFemales", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Total Members</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-secondary text-secondary-foreground font-semibold">
                  {totalMembers}
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Record</Button>
              <Button type="button" variant="outline" onClick={() => setForm({ familyNumber: "", numberOfHouseholds: "", fatherName: "", motherName: "", numberOfMales: "", numberOfFemales: "" })}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyDataForm;
