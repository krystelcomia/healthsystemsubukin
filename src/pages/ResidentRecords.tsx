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
  birthday: string | null;
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
    full_name: "", gender: "Male", age: "", status: "Single", religion: "", blood_type: "", nationality: "Filipino", sitio: "", birthday: "",
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
      birthday: newResident.birthday || null,
    });
    if (error) { toast.error("Failed to add resident"); return; }
    toast.success("Resident added successfully!");
    setNewResident({ full_name: "", gender: "Male", age: "", status: "Single", religion: "", blood_type: "", nationality: "Filipino", sitio: "", birthday: "" });
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
    win.document.write(`<!DOCTYPE html><html><head><title>${selectedResident ? `Record - ${selectedResident.full_name}` : "Resident Records List"}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
        .header h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; }
        .header p { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; }
        th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        h2 { font-size: 15px; color: #0d9488; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0; }
        .info-item { font-size: 12px; }
        .info-item strong { color: #374151; }
        .resident-card { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .no-records { color: #999; font-style: italic; margin-top: 12px; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }
        @media print { body { padding: 15px; } }
      </style></head><body>`);

    if (!selectedResident) {
      // Print all residents list
      win.document.write(`<div class="header"><h1>Barangay Health System</h1><p>Resident Records Directory</p></div>`);
      win.document.write(`<table><thead><tr><th>#</th><th>Full Name</th><th>Gender</th><th>Age</th><th>Birthday</th><th>Status</th><th>Blood Type</th><th>Sitio</th><th>Nationality</th></tr></thead><tbody>`);
      filtered.forEach((r, i) => {
        win.document.write(`<tr><td>${i + 1}</td><td>${r.full_name}</td><td>${r.gender}</td><td>${r.age}</td><td>${r.birthday || "—"}</td><td>${r.status}</td><td>${r.blood_type || "—"}</td><td>${r.sitio || "—"}</td><td>${r.nationality}</td></tr>`);
      });
      win.document.write(`</tbody></table>`);
      win.document.write(`<p style="margin-top:12px;font-size:12px;color:#666;">Total Residents: ${filtered.length}</p>`);
    } else {
      win.document.write(content.innerHTML);
    }

    win.document.write(`<p class="print-date">Printed on: ${new Date().toLocaleString()}</p></body></html>`);
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
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Record</Button>
        </div>

        <div ref={printRef}>
          <div className="header" style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #0d9488", paddingBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#0d9488" }}>Barangay Health System</h1>
            <p style={{ fontSize: 11, color: "#666" }}>Individual Resident Health Record</p>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>{selectedResident.full_name}</h2>
          <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            <p style={{ fontSize: 13 }}><strong>Gender:</strong> {selectedResident.gender}</p>
            <p style={{ fontSize: 13 }}><strong>Age:</strong> {selectedResident.age}</p>
            <p style={{ fontSize: 13 }}><strong>Birthday:</strong> {selectedResident.birthday || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>Status:</strong> {selectedResident.status}</p>
            <p style={{ fontSize: 13 }}><strong>Religion:</strong> {selectedResident.religion || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>Blood Type:</strong> {selectedResident.blood_type || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>Nationality:</strong> {selectedResident.nationality}</p>
            <p style={{ fontSize: 13 }}><strong>Sitio:</strong> {selectedResident.sitio || "—"}</p>
          </div>

          {healthRecords.consultations.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>Consultations ({healthRecords.consultations.length})</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Date</th><th style={thStyle}>Temp</th><th style={thStyle}>PR</th><th style={thStyle}>RR</th><th style={thStyle}>Height</th><th style={thStyle}>Weight</th><th style={thStyle}>Cause</th></tr></thead>
                <tbody>
                  {healthRecords.consultations.map((c: any) => (
                    <tr key={c.id}><td style={tdStyle}>{c.consultation_date}</td><td style={tdStyle}>{c.temperature || "—"}</td><td style={tdStyle}>{c.pulse_rate || "—"}</td><td style={tdStyle}>{c.respiration_rate || "—"}</td><td style={tdStyle}>{c.height || "—"}</td><td style={tdStyle}>{c.weight || "—"}</td><td style={tdStyle}>{c.consultation_cause || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.philpen_health.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>PhilPen Health ({healthRecords.philpen_health.length})</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Date</th><th style={thStyle}>BP</th><th style={thStyle}>Height</th><th style={thStyle}>Weight</th><th style={thStyle}>BMI</th><th style={thStyle}>Smokes</th><th style={thStyle}>Alcohol</th><th style={thStyle}>HBP</th><th style={thStyle}>Diabetes</th></tr></thead>
                <tbody>
                  {healthRecords.philpen_health.map((p: any) => (
                    <tr key={p.id}><td style={tdStyle}>{p.record_date}</td><td style={tdStyle}>{p.bp || "—"}</td><td style={tdStyle}>{p.height || "—"}</td><td style={tdStyle}>{p.weight || "—"}</td><td style={tdStyle}>{p.bmi || "—"}</td><td style={tdStyle}>{p.smokes ? "Yes" : "No"}</td><td style={tdStyle}>{p.drinks_alcohol ? "Yes" : "No"}</td><td style={tdStyle}>{p.high_blood_pressure ? "Yes" : "No"}</td><td style={tdStyle}>{p.diabetes_symptoms ? "Yes" : "No"}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.family_data.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>Family Data ({healthRecords.family_data.length})</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Family #</th><th style={thStyle}>Households</th><th style={thStyle}>Father</th><th style={thStyle}>Mother</th><th style={thStyle}>Males</th><th style={thStyle}>Females</th><th style={thStyle}>Total</th></tr></thead>
                <tbody>
                  {healthRecords.family_data.map((f: any) => (
                    <tr key={f.id}><td style={tdStyle}>{f.family_number || "—"}</td><td style={tdStyle}>{f.num_households}</td><td style={tdStyle}>{f.father_name || "—"}</td><td style={tdStyle}>{f.mother_name || "—"}</td><td style={tdStyle}>{f.num_males}</td><td style={tdStyle}>{f.num_females}</td><td style={tdStyle}>{f.total_members}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {healthRecords.dengue_prevention.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>Dengue Prevention ({healthRecords.dengue_prevention.length})</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Household</th><th style={thStyle}>Container</th><th style={thStyle}>Larvae</th><th style={thStyle}>Action Plan</th><th style={thStyle}>Signature</th></tr></thead>
                <tbody>
                  {healthRecords.dengue_prevention.map((d: any) => (
                    <tr key={d.id}><td style={tdStyle}>{d.household_name || "—"}</td><td style={tdStyle}>{d.container_type || "—"}</td><td style={tdStyle}>{d.has_larvae ? "Yes" : "No"}</td><td style={tdStyle}>{d.action_plan || "—"}</td><td style={tdStyle}>{d.signature || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {totalRecords === 0 && <p style={{ color: "#888", marginTop: 16, fontStyle: "italic" }}>No health records found for this resident.</p>}
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
                <div className="space-y-1">
                  <Label>Birthday</Label>
                  <Input type="date" value={newResident.birthday} onChange={(e) => setNewResident({ ...newResident, birthday: e.target.value })} />
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
                      {resident.birthday ? ` · Born ${resident.birthday}` : ""}
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

const thStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#0d9488", background: "#f0fdfa" };
const tdStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12 };

export default ResidentRecords;
