import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Users, Search, Plus, Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Resident {
  id: string;
  full_name: string;
  gender: string;
  age: number;
  status: string;
  religion: string;
  blood_type: string;
  nationality: string;
  sitio: string;
  created_at: string;
}

interface HealthRecords {
  consultations: any[];
  family_data: any[];
  philpen_health: any[];
  dengue_prevention: any[];
}

const ResidentRecords = () => {
  const [search, setSearch] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecords | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [newResident, setNewResident] = useState({
    full_name: "", gender: "Male", age: "", status: "Single", religion: "", blood_type: "", nationality: "Filipino", sitio: "",
  });

  const fetchResidents = async () => {
    const { data, error } = await supabase.from("residents").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load residents"); return; }
    setResidents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchResidents(); }, []);

  const handleAddResident = async () => {
    if (!newResident.full_name.trim()) { toast.error("Full name is required"); return; }
    const { error } = await supabase.from("residents").insert({
      full_name: newResident.full_name.trim(),
      gender: newResident.gender,
      age: Number(newResident.age) || 0,
      status: newResident.status,
      religion: newResident.religion,
      blood_type: newResident.blood_type,
      nationality: newResident.nationality,
      sitio: newResident.sitio,
    });
    if (error) { toast.error("Failed to add resident"); return; }
    toast.success("Resident added successfully!");
    setNewResident({ full_name: "", gender: "Male", age: "", status: "Single", religion: "", blood_type: "", nationality: "Filipino", sitio: "" });
    setDialogOpen(false);
    fetchResidents();
  };

  const fetchHealthRecords = async (residentId: string) => {
    const [c, f, p, d] = await Promise.all([
      supabase.from("consultations").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("family_data").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("philpen_health").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("dengue_prevention").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
    ]);
    setHealthRecords({
      consultations: c.data || [],
      family_data: f.data || [],
      philpen_health: p.data || [],
      dengue_prevention: d.data || [],
    });
  };

  const handleSelectResident = (resident: Resident) => {
    setSelectedResident(resident);
    fetchHealthRecords(resident.id);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Resident Record - ${selectedResident?.full_name || "List"}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}th{background:#f0f0f0}h1,h2,h3{margin:8px 0}.badge{display:inline-block;background:#e0e7ff;padding:2px 8px;border-radius:8px;font-size:12px;margin:2px}</style></head><body>`);
    win.document.write(content.innerHTML);
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  };

  const filtered = residents.filter(
    (r) => r.full_name.toLowerCase().includes(search.toLowerCase()) || (r.sitio || "").toLowerCase().includes(search.toLowerCase())
  );

  // Detail view
  if (selectedResident && healthRecords) {
    const totalRecords = healthRecords.consultations.length + healthRecords.family_data.length + healthRecords.philpen_health.length + healthRecords.dengue_prevention.length;
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setSelectedResident(null); setHealthRecords(null); }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Records
          </Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
        </div>

        <div ref={printRef}>
          <h1 style={{ fontSize: 22, fontWeight: "bold" }}>{selectedResident.full_name}</h1>
          <table>
            <tbody>
              <tr><th>Gender</th><td>{selectedResident.gender}</td><th>Age</th><td>{selectedResident.age}</td></tr>
              <tr><th>Status</th><td>{selectedResident.status}</td><th>Religion</th><td>{selectedResident.religion || "—"}</td></tr>
              <tr><th>Blood Type</th><td>{selectedResident.blood_type || "—"}</td><th>Nationality</th><td>{selectedResident.nationality}</td></tr>
              <tr><th>Sitio</th><td>{selectedResident.sitio || "—"}</td><th>Total Records</th><td>{totalRecords}</td></tr>
            </tbody>
          </table>

          {healthRecords.consultations.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 16 }}>Consultations</h2>
              <table>
                <thead><tr><th>Date</th><th>Temp</th><th>PR</th><th>RR</th><th>Height</th><th>Weight</th><th>Cause</th></tr></thead>
                <tbody>
                  {healthRecords.consultations.map((c: any) => (
                    <tr key={c.id}><td>{c.consultation_date}</td><td>{c.temperature}</td><td>{c.pulse_rate}</td><td>{c.respiration_rate}</td><td>{c.height}</td><td>{c.weight}</td><td>{c.consultation_cause}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.philpen_health.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 16 }}>PhilPen Health</h2>
              <table>
                <thead><tr><th>Date</th><th>BP</th><th>Height</th><th>Weight</th><th>BMI</th><th>Smokes</th><th>Alcohol</th><th>HBP</th><th>Diabetes</th></tr></thead>
                <tbody>
                  {healthRecords.philpen_health.map((p: any) => (
                    <tr key={p.id}><td>{p.record_date}</td><td>{p.bp}</td><td>{p.height}</td><td>{p.weight}</td><td>{p.bmi}</td><td>{p.smokes ? "Yes" : "No"}</td><td>{p.drinks_alcohol ? "Yes" : "No"}</td><td>{p.high_blood_pressure ? "Yes" : "No"}</td><td>{p.diabetes_symptoms ? "Yes" : "No"}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.family_data.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 16 }}>Family Data</h2>
              <table>
                <thead><tr><th>Family #</th><th>Households</th><th>Father</th><th>Mother</th><th>Males</th><th>Females</th><th>Total</th></tr></thead>
                <tbody>
                  {healthRecords.family_data.map((f: any) => (
                    <tr key={f.id}><td>{f.family_number}</td><td>{f.num_households}</td><td>{f.father_name}</td><td>{f.mother_name}</td><td>{f.num_males}</td><td>{f.num_females}</td><td>{f.total_members}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.dengue_prevention.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: "bold", marginTop: 16 }}>Dengue Prevention</h2>
              <table>
                <thead><tr><th>Household</th><th>Container</th><th>Larvae</th><th>Action Plan</th><th>Signature</th></tr></thead>
                <tbody>
                  {healthRecords.dengue_prevention.map((d: any) => (
                    <tr key={d.id}><td>{d.household_name}</td><td>{d.container_type}</td><td>{d.has_larvae ? "Yes" : "No"}</td><td>{d.action_plan}</td><td>{d.signature}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {totalRecords === 0 && <p style={{ color: "#888", marginTop: 16 }}>No health records found for this resident.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Resident Records
          </h1>
          <p className="text-muted-foreground mt-1">Search and view all resident health records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSelectedResident(null); handlePrint(); }}><Printer className="h-4 w-4 mr-2" /> Print List</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Resident</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Resident</DialogTitle>
                <DialogDescription>Enter the resident's basic information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input value={newResident.full_name} onChange={(e) => setNewResident({ ...newResident, full_name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select value={newResident.gender} onValueChange={(v) => setNewResident({ ...newResident, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Age</Label>
                    <Input type="number" value={newResident.age} onChange={(e) => setNewResident({ ...newResident, age: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Civil Status</Label>
                    <Select value={newResident.status} onValueChange={(v) => setNewResident({ ...newResident, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Religion</Label>
                    <Input value={newResident.religion} onChange={(e) => setNewResident({ ...newResident, religion: e.target.value })} placeholder="Religion" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Blood Type</Label>
                    <Select value={newResident.blood_type} onValueChange={(v) => setNewResident({ ...newResident, blood_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Nationality</Label>
                    <Input value={newResident.nationality} onChange={(e) => setNewResident({ ...newResident, nationality: e.target.value })} placeholder="Filipino" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Sitio</Label>
                  <Input value={newResident.sitio} onChange={(e) => setNewResident({ ...newResident, sitio: e.target.value })} placeholder="Sitio / Area" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddResident}>Save Resident</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by name or sitio..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div ref={!selectedResident ? printRef : undefined} className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading residents...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No residents found.</p>
        ) : (
          filtered.map((resident) => (
            <Card key={resident.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSelectResident(resident)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {resident.full_name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{resident.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {resident.sitio ? `${resident.sitio} · ` : ""}{resident.gender} · Age {resident.age} · {resident.status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge variant="secondary" className="text-xs">{resident.blood_type || "—"}</Badge>
                  <Badge variant="outline" className="text-xs">{resident.nationality}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ResidentRecords;
