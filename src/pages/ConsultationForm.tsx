import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";

const ConsultationForm = () => {
  const [form, setForm] = useState({
    name: "", birthdate: "", age: "", sitio: "", date: new Date().toISOString().split("T")[0],
    temperature: "", pulseRate: "", respirationRate: "", height: "", weight: "", consultationCause: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Consultation recorded successfully!");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          Consultation Form
        </h1>
        <p className="text-muted-foreground mt-1">Record patient consultation details.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Patient Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Patient name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sitio">Sitio</Label>
                <Input id="sitio" value={form.sitio} onChange={(e) => handleChange("sitio", e.target.value)} placeholder="Sitio / Area" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate</Label>
                <Input id="birthdate" type="date" value={form.birthdate} onChange={(e) => handleChange("birthdate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temp (°C)</Label>
                <Input id="temperature" value={form.temperature} onChange={(e) => handleChange("temperature", e.target.value)} placeholder="36.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pulseRate">Pulse Rate</Label>
                <Input id="pulseRate" value={form.pulseRate} onChange={(e) => handleChange("pulseRate", e.target.value)} placeholder="bpm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respirationRate">Resp. Rate</Label>
                <Input id="respirationRate" value={form.respirationRate} onChange={(e) => handleChange("respirationRate", e.target.value)} placeholder="bpm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" value={form.height} onChange={(e) => handleChange("height", e.target.value)} placeholder="cm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="kg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultationCause">Consultation Cause / Complaint</Label>
              <Textarea id="consultationCause" value={form.consultationCause} onChange={(e) => handleChange("consultationCause", e.target.value)} placeholder="Describe the reason for consultation..." rows={3} />
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit">Save Consultation</Button>
              <Button type="button" variant="outline">Clear</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultationForm;
