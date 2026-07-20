import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Users, Search, Plus, Printer, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; religion: string; blood_type: string; nationality: string; sitio: string; birthday: string | null; created_at: string;
}

interface HealthRecords {
  consultations: any[]; family_data: any[]; philpen_health: any[]; dengue_prevention: any[]; maternal_care: any[]; child_health: any[]; family_planning: any[];
}

const ResidentRecords = () => {
  const { t } = useSettings();
  const [search, setSearch] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecords | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResident, setEditResident] = useState<Resident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sitioFilter, setSitioFilter] = useState<string>("all");

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
    if (!newResident.full_name.trim()) { toast.error(t("residents.fullName") + " required"); return; }
    const { error } = await supabase.from("residents").insert({
      full_name: newResident.full_name.trim(), gender: newResident.gender, age: Number(newResident.age) || 0, status: newResident.status,
      religion: newResident.religion, blood_type: newResident.blood_type, nationality: newResident.nationality, sitio: newResident.sitio, birthday: newResident.birthday || null,
    });
    if (error) { toast.error("Failed to add resident"); return; }
    logActivity("create_resident", { entity_type: "resident", description: `Added resident: ${newResident.full_name.trim()}` });
    toast.success("Resident added successfully!");
    setNewResident({ full_name: "", gender: "Male", age: "", status: "Single", religion: "", blood_type: "", nationality: "Filipino", sitio: "", birthday: "" });
    setDialogOpen(false);
    fetchResidents();
  };

  const handleEditResident = async () => {
    if (!editResident) return;
    const { error } = await supabase.from("residents").update({
      full_name: editResident.full_name, gender: editResident.gender, age: editResident.age, status: editResident.status,
      religion: editResident.religion, blood_type: editResident.blood_type, nationality: editResident.nationality, sitio: editResident.sitio, birthday: editResident.birthday || null,
    }).eq("id", editResident.id);
    if (error) { toast.error("Failed to update resident"); return; }
    logActivity("update_resident", { entity_type: "resident", entity_id: editResident.id, description: `Updated resident record: ${editResident.full_name.trim()}` });
    toast.success("Resident updated!");
    setEditDialogOpen(false); setEditResident(null); fetchResidents();
  };

  const handleDeleteResident = async (id: string) => {
    const target = residents.find(r => r.id === id);
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) { toast.error("Failed to delete resident"); return; }
    logActivity("delete_resident", { entity_type: "resident", entity_id: id, description: `Deleted resident record: ${target?.full_name || id}` });
    toast.success("Resident deleted!");
    setDeleteConfirmId(null); fetchResidents();
  };

  const fetchHealthRecords = async (residentId: string) => {
    const [c, f, p, d, m, ch, fp] = await Promise.all([
      supabase.from("consultations").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("family_data").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("philpen_health").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("dengue_prevention").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("maternal_care" as any).select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("child_health" as any).select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
      supabase.from("family_planning").select("*").eq("resident_id", residentId).order("created_at", { ascending: false }),
    ]);
    setHealthRecords({
      consultations: c.data || [],
      family_data: f.data || [],
      philpen_health: p.data || [],
      dengue_prevention: d.data || [],
      maternal_care: (m.data as any[]) || [],
      child_health: (ch.data as any[]) || [],
      family_planning: fp.data || [],
    });
  };

  const handleSelectResident = (resident: Resident) => { setSelectedResident(resident); fetchHealthRecords(resident.id); };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${selectedResident ? `Record - ${selectedResident.full_name}` : t("residents.title")}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; } .header h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; } .header p { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; } th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        h2 { font-size: 15px; color: #0d9488; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; } .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; } @media print { body { padding: 15px; } }</style></head><body>`);
    if (!selectedResident) {
      win.document.write(`<div class="header"><h1>Barangay Health System</h1><p>${t("residents.title")}</p></div>`);
      win.document.write(`<table><thead><tr><th>#</th><th>${t("residents.fullName")}</th><th>${t("residents.gender")}</th><th>${t("residents.age")}</th><th>${t("residents.birthday")}</th><th>${t("residents.civilStatus")}</th><th>${t("residents.bloodType")}</th><th>${t("residents.sitio")}</th><th>${t("residents.nationality")}</th></tr></thead><tbody>`);
      filtered.forEach((r, i) => { win.document.write(`<tr><td>${i + 1}</td><td>${r.full_name}</td><td>${r.gender}</td><td>${r.age}</td><td>${r.birthday || "—"}</td><td>${r.status}</td><td>${r.blood_type || "—"}</td><td>${r.sitio || "—"}</td><td>${r.nationality}</td></tr>`); });
      win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${filtered.length}</p>`);
    } else { win.document.write(content.innerHTML); }
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close(); win.print();
  };

  const sitios = Array.from(new Set(residents.map((r) => r.sitio).filter(Boolean))) as string[];
  const filtered = residents.filter((r) => {
    const matchesSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || (r.sitio || "").toLowerCase().includes(search.toLowerCase());
    const matchesSitio = sitioFilter === "all" || r.sitio === sitioFilter;
    return matchesSearch && matchesSitio;
  });

  if (selectedResident && healthRecords) {
    const totalRecords = healthRecords.consultations.length + healthRecords.family_data.length + healthRecords.philpen_health.length + healthRecords.dengue_prevention.length + healthRecords.maternal_care.length + healthRecords.child_health.length + healthRecords.family_planning.length;
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setSelectedResident(null); setHealthRecords(null); }}><ArrowLeft className="h-4 w-4 mr-2" /> {t("residents.backToRecords")}</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("residents.printRecord")}</Button>
        </div>
        <div ref={printRef}>
          <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #0d9488", paddingBottom: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#0d9488" }}>Barangay Health System</h1>
            <p style={{ fontSize: 11, color: "#666" }}>{t("residents.title")}</p>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>{selectedResident.full_name}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            <p style={{ fontSize: 13 }}><strong>{t("residents.gender")}:</strong> {selectedResident.gender}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.age")}:</strong> {selectedResident.age}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.birthday")}:</strong> {selectedResident.birthday || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.civilStatus")}:</strong> {selectedResident.status}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.religion")}:</strong> {selectedResident.religion || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.bloodType")}:</strong> {selectedResident.blood_type || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.nationality")}:</strong> {selectedResident.nationality}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.sitio")}:</strong> {selectedResident.sitio || "—"}</p>
          </div>
          {healthRecords.consultations.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("dashboard.consultations")} ({healthRecords.consultations.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>{t("consultation.date")}</th><th style={thStyle}>{t("consultation.temp")}</th><th style={thStyle}>PR</th><th style={thStyle}>RR</th><th style={thStyle}>{t("consultation.height")}</th><th style={thStyle}>{t("consultation.weight")}</th><th style={thStyle}>{t("consultation.cause")}</th></tr></thead><tbody>{healthRecords.consultations.map((c: any) => (<tr key={c.id}><td style={tdStyle}>{c.consultation_date}</td><td style={tdStyle}>{c.temperature || "—"}</td><td style={tdStyle}>{c.pulse_rate || "—"}</td><td style={tdStyle}>{c.respiration_rate || "—"}</td><td style={tdStyle}>{c.height || "—"}</td><td style={tdStyle}>{c.weight || "—"}</td><td style={tdStyle}>{c.consultation_cause || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.philpen_health.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.philpenHealth")} ({healthRecords.philpen_health.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>{t("consultation.date")}</th><th style={thStyle}>{t("philpen.bp")}</th><th style={thStyle}>{t("consultation.height")}</th><th style={thStyle}>{t("consultation.weight")}</th><th style={thStyle}>{t("philpen.bmi")}</th><th style={thStyle}>{t("philpen.smoke")}</th><th style={thStyle}>{t("philpen.alcohol")}</th><th style={thStyle}>{t("philpen.highBP")}</th><th style={thStyle}>{t("philpen.diabetes")}</th></tr></thead><tbody>{healthRecords.philpen_health.map((p: any) => (<tr key={p.id}><td style={tdStyle}>{p.record_date}</td><td style={tdStyle}>{p.bp || "—"}</td><td style={tdStyle}>{p.height || "—"}</td><td style={tdStyle}>{p.weight || "—"}</td><td style={tdStyle}>{p.bmi || "—"}</td><td style={tdStyle}>{p.smokes ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.drinks_alcohol ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.high_blood_pressure ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.diabetes_symptoms ? t("common.yes") : t("common.no")}</td></tr>))}</tbody></table></>)}
          {healthRecords.family_data.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.familyData")} ({healthRecords.family_data.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>{t("familyData.familyNumber")}</th><th style={thStyle}>{t("familyData.numHouseholds")}</th><th style={thStyle}>{t("familyData.father")}</th><th style={thStyle}>{t("familyData.mother")}</th><th style={thStyle}>{t("familyData.males")}</th><th style={thStyle}>{t("familyData.females")}</th><th style={thStyle}>{t("familyData.totalMembers")}</th></tr></thead><tbody>{healthRecords.family_data.map((f: any) => (<tr key={f.id}><td style={tdStyle}>{f.family_number || "—"}</td><td style={tdStyle}>{f.num_households}</td><td style={tdStyle}>{f.father_name || "—"}</td><td style={tdStyle}>{f.mother_name || "—"}</td><td style={tdStyle}>{f.num_males}</td><td style={tdStyle}>{f.num_females}</td><td style={tdStyle}>{f.total_members}</td></tr>))}</tbody></table></>)}
          {healthRecords.dengue_prevention.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.denguePrevention")} ({healthRecords.dengue_prevention.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>{t("dengue.householdName")}</th><th style={thStyle}>{t("dengue.containerType")}</th><th style={thStyle}>{t("dengue.hasLarvae")}</th><th style={thStyle}>{t("dengue.actionPlan")}</th><th style={thStyle}>{t("dengue.signature")}</th></tr></thead><tbody>{healthRecords.dengue_prevention.map((d: any) => (<tr key={d.id}><td style={tdStyle}>{d.household_name || "—"}</td><td style={tdStyle}>{d.container_type || "—"}</td><td style={tdStyle}>{d.has_larvae ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{d.action_plan || "—"}</td><td style={tdStyle}>{d.signature || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.maternal_care.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.maternalCare")} ({healthRecords.maternal_care.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Checkup Date</th><th style={thStyle}>Remarks</th></tr></thead><tbody>{healthRecords.maternal_care.map((m: any) => (<tr key={m.id}><td style={tdStyle}>{m.checkup_date}</td><td style={tdStyle}>{m.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.child_health.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.childHealth")} ({healthRecords.child_health.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>Checkup Date</th><th style={thStyle}>Remarks</th></tr></thead><tbody>{healthRecords.child_health.map((ch: any) => (<tr key={ch.id}><td style={tdStyle}>{ch.checkup_date}</td><td style={tdStyle}>{ch.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.family_planning.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#0d9488", marginTop: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{t("nav.familyPlanning")} ({healthRecords.family_planning.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "#f0fdfa" }}><th style={thStyle}>{t("fp.method")}</th><th style={thStyle}>{t("fp.startDate")}</th><th style={thStyle}>{t("fp.remarks")}</th></tr></thead><tbody>{healthRecords.family_planning.map((fp: any) => (<tr key={fp.id}><td style={tdStyle}>{fp.method}</td><td style={tdStyle}>{fp.start_date || "—"}</td><td style={tdStyle}>{fp.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {totalRecords === 0 && <p style={{ color: "#888", marginTop: 16, fontStyle: "italic" }}>{t("residents.noHealthRecords")}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t("residents.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("residents.desc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSelectedResident(null); handlePrint(); }}><Printer className="h-4 w-4 mr-2" /> {t("residents.printList")}</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> {t("residents.addResident")}</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{t("residents.addNew")}</DialogTitle><DialogDescription>{t("residents.addNewDesc")}</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>{t("residents.fullName")} *</Label><Input value={newResident.full_name} onChange={(e) => setNewResident({ ...newResident, full_name: e.target.value })} placeholder={t("residents.fullName")} /></div>
                <div className="space-y-1"><Label>{t("residents.birthday")}</Label><Input type="date" value={newResident.birthday} onChange={(e) => setNewResident({ ...newResident, birthday: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t("residents.gender")}</Label><Select value={newResident.gender} onValueChange={(v) => setNewResident({ ...newResident, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">{t("residents.male")}</SelectItem><SelectItem value="Female">{t("residents.female")}</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>{t("residents.age")}</Label><Input type="number" value={newResident.age} onChange={(e) => setNewResident({ ...newResident, age: e.target.value })} placeholder="0" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t("residents.civilStatus")}</Label><Select value={newResident.status} onValueChange={(v) => setNewResident({ ...newResident, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Single">{t("residents.single")}</SelectItem><SelectItem value="Married">{t("residents.married")}</SelectItem><SelectItem value="Widowed">{t("residents.widowed")}</SelectItem><SelectItem value="Separated">{t("residents.separated")}</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>{t("residents.religion")}</Label><Input value={newResident.religion} onChange={(e) => setNewResident({ ...newResident, religion: e.target.value })} placeholder={t("residents.religion")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>{t("residents.bloodType")}</Label><Select value={newResident.blood_type} onValueChange={(v) => setNewResident({ ...newResident, blood_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label>{t("residents.nationality")}</Label><Input value={newResident.nationality} onChange={(e) => setNewResident({ ...newResident, nationality: e.target.value })} placeholder="Filipino" /></div>
                </div>
                <div className="space-y-1"><Label>{t("residents.sitio")}</Label><Input value={newResident.sitio} onChange={(e) => setNewResident({ ...newResident, sitio: e.target.value })} placeholder="Sitio / Area" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleAddResident}>{t("residents.saveResident")}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder={t("residents.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={sitioFilter} onValueChange={setSitioFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder={t("residents.sitio")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sitios</SelectItem>
            {sitios.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div ref={!selectedResident ? printRef : undefined} className="space-y-3">
        {loading ? (<p className="text-center text-muted-foreground py-8">{t("residents.loadingResidents")}</p>) : filtered.length === 0 ? (<p className="text-center text-muted-foreground py-8">{t("residents.noResidents")}</p>) : (
          filtered.map((resident) => (
            <Card key={resident.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleSelectResident(resident)}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-sm font-semibold text-primary">{resident.full_name.split(" ").map((n) => n[0]).join("")}</span></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{resident.full_name}</p>
                      {resident.family_number && (
                        <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30 font-mono">
                          Family #: {resident.family_number}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{resident.sitio ? `${resident.sitio} · ` : ""}{resident.gender} · {t("residents.age")} {resident.age} · {resident.status}{resident.birthday ? ` · ${t("residents.birthday")} ${resident.birthday}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {resident.family_number && (
                    <Badge variant="secondary" className="text-xs font-mono hidden sm:inline-flex">
                      {resident.family_number}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{resident.blood_type || "—"}</Badge>
                  <Badge variant="outline" className="text-xs">{resident.nationality}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditResident(resident); setEditDialogOpen(true); }}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(resident.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("residents.editResident")}</DialogTitle><DialogDescription>{t("residents.editResidentDesc")}</DialogDescription></DialogHeader>
          {editResident && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>{t("residents.fullName")} *</Label><Input value={editResident.full_name} onChange={(e) => setEditResident({ ...editResident, full_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("residents.birthday")}</Label><Input type="date" value={editResident.birthday || ""} onChange={(e) => setEditResident({ ...editResident, birthday: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("residents.gender")}</Label><Select value={editResident.gender} onValueChange={(v) => setEditResident({ ...editResident, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">{t("residents.male")}</SelectItem><SelectItem value="Female">{t("residents.female")}</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label>{t("residents.age")}</Label><Input type="number" value={editResident.age} onChange={(e) => setEditResident({ ...editResident, age: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("residents.civilStatus")}</Label><Select value={editResident.status} onValueChange={(v) => setEditResident({ ...editResident, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Single">{t("residents.single")}</SelectItem><SelectItem value="Married">{t("residents.married")}</SelectItem><SelectItem value="Widowed">{t("residents.widowed")}</SelectItem><SelectItem value="Separated">{t("residents.separated")}</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label>{t("residents.religion")}</Label><Input value={editResident.religion || ""} onChange={(e) => setEditResident({ ...editResident, religion: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("residents.bloodType")}</Label><Select value={editResident.blood_type || ""} onValueChange={(v) => setEditResident({ ...editResident, blood_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bt) => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>{t("residents.nationality")}</Label><Input value={editResident.nationality} onChange={(e) => setEditResident({ ...editResident, nationality: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>{t("residents.sitio")}</Label><Input value={editResident.sitio || ""} onChange={(e) => setEditResident({ ...editResident, sitio: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleEditResident}>{t("common.saveChanges")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("residents.deleteResident")}</AlertDialogTitle><AlertDialogDescription>{t("residents.deleteResidentDesc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirmId && handleDeleteResident(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const thStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#0d9488", background: "#f0fdfa" };
const tdStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12 };

export default ResidentRecords;
