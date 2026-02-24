import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Search, Plus, Printer, Pencil, Trash2, Shield, Activity, ClipboardList, Download, UserCheck, UserX } from "lucide-react";
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

interface BHWWorker {
  id: string;
  name: string;
  age: number;
  address: string;
  gmail: string;
  number: string;
  is_online: boolean;
  last_seen: string | null;
  user_id: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin / Supervisor Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage residents, BHW workers, health records, and system settings.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resident Records</TabsTrigger>
          <TabsTrigger value="workers">BH Workers</TabsTrigger>
          <TabsTrigger value="health">Health Records</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><AdminResidents /></TabsContent>
        <TabsContent value="workers"><AdminWorkers /></TabsContent>
        <TabsContent value="health"><AdminHealthRecords /></TabsContent>
        <TabsContent value="settings"><AdminSettings /></TabsContent>
      </Tabs>
    </div>
  );
};

// ==================== ADMIN RESIDENTS ====================
const AdminResidents = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSitio, setSelectedSitio] = useState("all");
  const [sitios, setSitios] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) { toast.error("Failed to load residents"); return; }
    setResidents(data || []);
    const uniqueSitios = [...new Set((data || []).map(r => r.sitio).filter(Boolean))] as string[];
    setSitios(uniqueSitios);
    setLoading(false);
  };

  const filtered = selectedSitio === "all"
    ? residents
    : residents.filter(r => r.sitio === selectedSitio);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Resident Records - ${selectedSitio === "all" ? "All Sitios" : selectedSitio}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
        .header h1 { font-size: 20px; color: #0d9488; }
        .header p { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; }
        th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }
      </style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>Resident Records - ${selectedSitio === "all" ? "All Sitios" : `Sitio: ${selectedSitio}`}</p></div>
      <table><thead><tr><th>#</th><th>Full Name</th><th>Gender</th><th>Age</th><th>Birthday</th><th>Status</th><th>Blood Type</th><th>Sitio</th><th>Nationality</th><th>Religion</th></tr></thead><tbody>`);
    filtered.forEach((r, i) => {
      win.document.write(`<tr><td>${i + 1}</td><td>${r.full_name}</td><td>${r.gender}</td><td>${r.age}</td><td>${r.birthday || "—"}</td><td>${r.status}</td><td>${r.blood_type || "—"}</td><td>${r.sitio || "—"}</td><td>${r.nationality}</td><td>${r.religion || "—"}</td></tr>`);
    });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">Total: ${filtered.length} residents</p>`);
    win.document.write(`<p class="print-date">Printed on: ${new Date().toLocaleString()}</p></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Filter by Sitio:</Label>
          <Select value={selectedSitio} onValueChange={setSelectedSitio}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sitios</SelectItem>
              {sitios.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div ref={printRef} className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Full Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Gender</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Age</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Birthday</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Sitio</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Blood Type</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No residents found.</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">{r.full_name}</td>
                    <td className="p-3 text-foreground">{r.gender}</td>
                    <td className="p-3 text-foreground">{r.age}</td>
                    <td className="p-3 text-foreground">{r.birthday || "—"}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-xs">{r.status}</Badge></td>
                    <td className="p-3 text-foreground">{r.sitio || "—"}</td>
                    <td className="p-3 text-foreground">{r.blood_type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Showing {filtered.length} of {residents.length} residents</p>
    </div>
  );
};

// ==================== ADMIN WORKERS ====================
const AdminWorkers = () => {
  const [workers, setWorkers] = useState<BHWWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWorker, setEditWorker] = useState<BHWWorker | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: "", age: "", address: "", gmail: "", number: "" });

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    const { data, error } = await (supabase.from as any)("bhw_workers").select("*").order("name");
    if (error) { toast.error("Failed to load workers"); return; }
    setWorkers(data || []);
    setLoading(false);
  };

  const handleAddWorker = async () => {
    if (!newWorker.name.trim()) { toast.error("Name is required"); return; }
    const { error } = await (supabase.from as any)("bhw_workers").insert({
      name: newWorker.name.trim(),
      age: Number(newWorker.age) || 0,
      address: newWorker.address,
      gmail: newWorker.gmail,
      number: newWorker.number,
    });
    if (error) { toast.error("Failed to add worker"); return; }
    toast.success("Worker added!");
    setNewWorker({ name: "", age: "", address: "", gmail: "", number: "" });
    setDialogOpen(false);
    fetchWorkers();
  };

  const handleEditWorker = async () => {
    if (!editWorker) return;
    const { error } = await (supabase.from as any)("bhw_workers").update({
      name: editWorker.name,
      age: editWorker.age,
      address: editWorker.address,
      gmail: editWorker.gmail,
      number: editWorker.number,
    }).eq("id", editWorker.id);
    if (error) { toast.error("Failed to update worker"); return; }
    toast.success("Worker updated!");
    setEditDialogOpen(false);
    setEditWorker(null);
    fetchWorkers();
  };

  const handleDeleteWorker = async (id: string) => {
    const { error } = await (supabase.from as any)("bhw_workers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete worker"); return; }
    toast.success("Worker deleted!");
    setDeleteConfirmId(null);
    fetchWorkers();
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>BHW Workers</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
        .header h1 { font-size: 20px; color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; }
        th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }
      </style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>BHW Workers Directory</p></div>
      <table><thead><tr><th>#</th><th>Name</th><th>Age</th><th>Address</th><th>Gmail</th><th>Contact</th><th>Status</th></tr></thead><tbody>`);
    workers.forEach((w, i) => {
      win.document.write(`<tr><td>${i + 1}</td><td>${w.name}</td><td>${w.age}</td><td>${w.address}</td><td>${w.gmail}</td><td>${w.number}</td><td>${w.is_online ? "Online" : "Offline"}</td></tr>`);
    });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">Total: ${workers.length} workers</p>`);
    win.document.write(`<p class="print-date">Printed on: ${new Date().toLocaleString()}</p></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{workers.length} workers registered</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Worker</Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading workers...</p>
        ) : workers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No workers found.</p>
        ) : workers.map((w) => (
          <Card key={w.id} className="border-border/50 shadow-sm">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <span className="text-sm font-semibold text-primary">
                    {w.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </span>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${w.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{w.name}</p>
                    <Badge variant={w.is_online ? "default" : "secondary"} className="text-xs">
                      {w.is_online ? <><UserCheck className="h-3 w-3 mr-1" />Online</> : <><UserX className="h-3 w-3 mr-1" />Offline</>}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age {w.age} · {w.address} · {w.gmail} · {w.number}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditWorker(w); setEditDialogOpen(true); }}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirmId(w.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Worker Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New BHW Worker</DialogTitle>
            <DialogDescription>Enter worker details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} placeholder="Full name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Age</Label><Input type="number" value={newWorker.age} onChange={e => setNewWorker({ ...newWorker, age: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contact Number</Label><Input value={newWorker.number} onChange={e => setNewWorker({ ...newWorker, number: e.target.value })} placeholder="09xxxxxxxxx" /></div>
            </div>
            <div className="space-y-1"><Label>Gmail</Label><Input type="email" value={newWorker.gmail} onChange={e => setNewWorker({ ...newWorker, gmail: e.target.value })} placeholder="worker@gmail.com" /></div>
            <div className="space-y-1"><Label>Address</Label><Input value={newWorker.address} onChange={e => setNewWorker({ ...newWorker, address: e.target.value })} placeholder="Complete address" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddWorker}>Add Worker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
            <DialogDescription>Update worker information.</DialogDescription>
          </DialogHeader>
          {editWorker && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={editWorker.name} onChange={e => setEditWorker({ ...editWorker, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Age</Label><Input type="number" value={editWorker.age} onChange={e => setEditWorker({ ...editWorker, age: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Contact</Label><Input value={editWorker.number} onChange={e => setEditWorker({ ...editWorker, number: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Gmail</Label><Input type="email" value={editWorker.gmail} onChange={e => setEditWorker({ ...editWorker, gmail: e.target.value })} /></div>
              <div className="space-y-1"><Label>Address</Label><Input value={editWorker.address} onChange={e => setEditWorker({ ...editWorker, address: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditWorker}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDeleteWorker(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ==================== ADMIN HEALTH RECORDS ====================
const AdminHealthRecords = () => {
  const [activeForm, setActiveForm] = useState("consultations");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => { fetchRecords(); }, [activeForm]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)(activeForm)
      .select("*, residents(full_name)")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load records"); setLoading(false); return; }
    setRecords(data || []);
    setLoading(false);
  };

  const handleEditRecord = async () => {
    if (!editRecord) return;
    const { residents, ...updateData } = editRecord;
    const { error } = await (supabase.from as any)(activeForm).update(updateData).eq("id", editRecord.id);
    if (error) { toast.error("Failed to update record"); return; }
    toast.success("Record updated!");
    setEditDialogOpen(false);
    setEditRecord(null);
    fetchRecords();
  };

  const getColumns = () => {
    switch (activeForm) {
      case "consultations": return ["consultation_date", "consultation_cause", "temperature", "pulse_rate", "weight", "height"];
      case "family_data": return ["family_number", "father_name", "mother_name", "num_males", "num_females", "total_members"];
      case "philpen_health": return ["record_date", "bp", "bmi", "weight", "height", "smokes", "drinks_alcohol"];
      case "dengue_prevention": return ["household_name", "container_type", "has_larvae", "action_plan"];
      default: return [];
    }
  };

  const handlePrint = () => {
    const cols = getColumns();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Health Records - ${activeForm}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
        .header h1 { font-size: 20px; color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 11px; }
        th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }
      </style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>Health Records - ${activeForm.replace("_", " ").toUpperCase()}</p></div>
      <table><thead><tr><th>#</th><th>Resident</th>${cols.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>`);
    records.forEach((r, i) => {
      win.document.write(`<tr><td>${i + 1}</td><td>${r.residents?.full_name || "—"}</td>${cols.map(c => `<td>${r[c] === true ? "Yes" : r[c] === false ? "No" : r[c] || "—"}</td>`).join("")}</tr>`);
    });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">Total: ${records.length} records</p>`);
    win.document.write(`<p class="print-date">Printed on: ${new Date().toLocaleString()}</p></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={activeForm} onValueChange={setActiveForm}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="consultations">Consultations</SelectItem>
            <SelectItem value="family_data">Family Data</SelectItem>
            <SelectItem value="philpen_health">PhilPen Health</SelectItem>
            <SelectItem value="dengue_prevention">Dengue Prevention</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Resident</th>
                {getColumns().map(c => (
                  <th key={c} className="p-3 text-left font-medium text-muted-foreground capitalize">{c.replace(/_/g, " ")}</th>
                ))}
                <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={getColumns().length + 3} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={getColumns().length + 3} className="p-6 text-center text-muted-foreground">No records found.</td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium text-foreground">{r.residents?.full_name || "—"}</td>
                  {getColumns().map(c => (
                    <td key={c} className="p-3 text-foreground">
                      {r[c] === true ? "Yes" : r[c] === false ? "No" : r[c] || "—"}
                    </td>
                  ))}
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRecord(r); setEditDialogOpen(true); }}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{records.length} records found</p>

      {/* Edit Record Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>Update the health record fields.</DialogDescription>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              {getColumns().map(col => (
                <div key={col} className="space-y-1">
                  <Label className="capitalize">{col.replace(/_/g, " ")}</Label>
                  {typeof editRecord[col] === "boolean" ? (
                    <Select value={editRecord[col] ? "true" : "false"} onValueChange={v => setEditRecord({ ...editRecord, [col]: v === "true" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={editRecord[col] || ""}
                      onChange={e => setEditRecord({ ...editRecord, [col]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditRecord}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== ADMIN SETTINGS ====================
const AdminSettings = () => {
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      toast.info("Generating comprehensive report...");
      const [residents, consultations, familyData, dengue, philpen] = await Promise.all([
        supabase.from("residents").select("*"),
        supabase.from("consultations").select("*, residents(full_name)"),
        supabase.from("family_data").select("*, residents(full_name)"),
        supabase.from("dengue_prevention").select("*, residents(full_name)"),
        supabase.from("philpen_health").select("*, residents(full_name)"),
      ]);

      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_residents: (residents.data || []).length,
          total_consultations: (consultations.data || []).length,
          total_family_records: (familyData.data || []).length,
          total_dengue_records: (dengue.data || []).length,
          total_philpen_records: (philpen.data || []).length,
        },
        residents: residents.data || [],
        consultations: consultations.data || [],
        family_data: familyData.data || [],
        dengue_prevention: dengue.data || [],
        philpen_health: philpen.data || [],
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhw-full-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report generated and downloaded!");
    } catch {
      toast.error("Failed to generate report.");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4 mt-4 max-w-2xl">
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Generate Reports</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive report of all health forms, records, and resident data. The report will be downloaded as a JSON file.
          </p>
          <Button className="w-full gap-2" onClick={handleGenerateReport} disabled={generating}>
            <Download className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Full Report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
