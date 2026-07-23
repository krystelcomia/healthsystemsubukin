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
import { calculateAge, syncFamilyDataToResidents } from "@/lib/residentLinker";
import { SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import barangayLogo from "@/assets/barangay-logo.png";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; sitio: string; birthday: string | null; family_number?: string | null; created_at: string;
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
    full_name: "", gender: "Male", age: "", status: "Single", sitio: "", birthday: "",
  });

  const fetchResidents = async () => {
    await syncFamilyDataToResidents();
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
      sitio: newResident.sitio, birthday: newResident.birthday || null,
    });
    if (error) { toast.error("Failed to add resident"); return; }
    logActivity("create_resident", { entity_type: "resident", description: `Added resident: ${newResident.full_name.trim()}` });
    toast.success("Resident added successfully!");
    setNewResident({ full_name: "", gender: "Male", age: "", status: "Single", sitio: "", birthday: "" });
    setDialogOpen(false);
    fetchResidents();
  };

  const handleEditResident = async () => {
    if (!editResident) return;
    const { error } = await supabase.from("residents").update({
      full_name: editResident.full_name, gender: editResident.gender, age: editResident.age, status: editResident.status,
      sitio: editResident.sitio, birthday: editResident.birthday || null,
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
    window.print();
  };

  const dbSitios = Array.from(new Set(residents.map((r) => r.sitio).filter((s) => Boolean(s) && s !== "Centro" && s !== "Sitio Centro"))).sort() as string[];
  const sitios = dbSitios.length > 0 ? dbSitios : SUBUKIN_SITIOS;
  const filtered = residents.filter((r) => {
    const matchesSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || (r.sitio || "").toLowerCase().includes(search.toLowerCase());
    const matchesSitio = sitioFilter === "all" || r.sitio === sitioFilter;
    return matchesSearch && matchesSitio;
  });

  if (selectedResident && healthRecords) {
    const totalRecords = healthRecords.consultations.length + healthRecords.family_data.length + healthRecords.philpen_health.length + healthRecords.dengue_prevention.length + healthRecords.maternal_care.length + healthRecords.child_health.length + healthRecords.family_planning.length;
    return (
      <div className="w-full space-y-6">
        <style>{`
          .print-only { display: none !important; }
          .print-only-table { display: none !important; }
          #resident-print-area { background-color: #ffffff !important; color: #000000 !important; }
          #resident-print-area table, #resident-print-area th, #resident-print-area td { color: #000000 !important; border-color: #000000 !important; }
          #resident-print-area h2, #resident-print-area p, #resident-print-area span, #resident-print-area strong { color: #000000 !important; }
          @media print {
            body * { visibility: hidden !important; }
            #resident-print-area, #resident-print-area * { visibility: visible !important; }
            #resident-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              padding: 20px !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              color: black !important;
            }
            .no-print { display: none !important; }
            .print-only { display: flex !important; }
            .print-only-table { display: table !important; }
            .header-seal img { mix-blend-mode: multiply !important; }
            @page { size: A4 landscape; margin: 10mm; }
          }
        `}</style>

        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => { setSelectedResident(null); setHealthRecords(null); }}><ArrowLeft className="h-4 w-4 mr-2" /> {t("residents.backToRecords")}</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("residents.printRecord")}</Button>
        </div>

        <div id="resident-print-area">
          <div 
            className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6"
            style={{ display: "none", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "4px double #000", paddingBottom: "16px", marginBottom: "20px", textAlign: "center" }}
          >
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>{selectedResident.full_name}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            <p style={{ fontSize: 13 }}><strong>{t("residents.gender")}:</strong> {selectedResident.gender}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.age")}:</strong> {selectedResident.age}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.birthday")}:</strong> {selectedResident.birthday || "—"}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.civilStatus")}:</strong> {selectedResident.status}</p>
            <p style={{ fontSize: 13 }}><strong>{t("residents.sitio")}:</strong> {selectedResident.sitio || "—"}</p>
          </div>
          {healthRecords.consultations.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("dashboard.consultations")} ({healthRecords.consultations.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>{t("consultation.date")}</th><th style={thStyle}>{t("consultation.temp")}</th><th style={thStyle}>PR</th><th style={thStyle}>RR</th><th style={thStyle}>{t("consultation.height")}</th><th style={thStyle}>{t("consultation.weight")}</th><th style={thStyle}>{t("consultation.cause")}</th></tr></thead><tbody>{healthRecords.consultations.map((c: any) => (<tr key={c.id}><td style={tdStyle}>{c.consultation_date}</td><td style={tdStyle}>{c.temperature || "—"}</td><td style={tdStyle}>{c.pulse_rate || "—"}</td><td style={tdStyle}>{c.respiration_rate || "—"}</td><td style={tdStyle}>{c.height || "—"}</td><td style={tdStyle}>{c.weight || "—"}</td><td style={tdStyle}>{c.consultation_cause || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.philpen_health.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.philpenHealth")} ({healthRecords.philpen_health.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>{t("consultation.date")}</th><th style={thStyle}>{t("philpen.bp")}</th><th style={thStyle}>{t("consultation.height")}</th><th style={thStyle}>{t("consultation.weight")}</th><th style={thStyle}>{t("philpen.bmi")}</th><th style={thStyle}>{t("philpen.smoke")}</th><th style={thStyle}>{t("philpen.alcohol")}</th><th style={thStyle}>{t("philpen.highBP")}</th><th style={thStyle}>{t("philpen.diabetes")}</th></tr></thead><tbody>{healthRecords.philpen_health.map((p: any) => (<tr key={p.id}><td style={tdStyle}>{p.record_date}</td><td style={tdStyle}>{p.bp || "—"}</td><td style={tdStyle}>{p.height || "—"}</td><td style={tdStyle}>{p.weight || "—"}</td><td style={tdStyle}>{p.bmi || "—"}</td><td style={tdStyle}>{p.smokes ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.drinks_alcohol ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.high_blood_pressure ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{p.diabetes_symptoms ? t("common.yes") : t("common.no")}</td></tr>))}</tbody></table></>)}
          {healthRecords.family_data.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.familyData")} ({healthRecords.family_data.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>{t("familyData.familyNumber")}</th><th style={thStyle}>{t("familyData.numHouseholds")}</th><th style={thStyle}>{t("familyData.father")}</th><th style={thStyle}>{t("familyData.mother")}</th><th style={thStyle}>{t("familyData.males")}</th><th style={thStyle}>{t("familyData.females")}</th><th style={thStyle}>{t("familyData.totalMembers")}</th></tr></thead><tbody>{healthRecords.family_data.map((f: any) => (<tr key={f.id}><td style={tdStyle}>{f.family_number || "—"}</td><td style={tdStyle}>{f.num_households}</td><td style={tdStyle}>{f.father_name || "—"}</td><td style={tdStyle}>{f.mother_name || "—"}</td><td style={tdStyle}>{f.num_males}</td><td style={tdStyle}>{f.num_females}</td><td style={tdStyle}>{f.total_members}</td></tr>))}</tbody></table></>)}
          {healthRecords.dengue_prevention.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.denguePrevention")} ({healthRecords.dengue_prevention.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>{t("dengue.householdName")}</th><th style={thStyle}>{t("dengue.containerType")}</th><th style={thStyle}>{t("dengue.hasLarvae")}</th><th style={thStyle}>{t("dengue.actionPlan")}</th><th style={thStyle}>{t("dengue.signature")}</th></tr></thead><tbody>{healthRecords.dengue_prevention.map((d: any) => (<tr key={d.id}><td style={tdStyle}>{d.household_name || "—"}</td><td style={tdStyle}>{d.container_type || "—"}</td><td style={tdStyle}>{d.has_larvae ? t("common.yes") : t("common.no")}</td><td style={tdStyle}>{d.action_plan || "—"}</td><td style={tdStyle}>{d.signature || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.maternal_care.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.maternalCare")} ({healthRecords.maternal_care.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>Checkup Date</th><th style={thStyle}>Remarks</th></tr></thead><tbody>{healthRecords.maternal_care.map((m: any) => (<tr key={m.id}><td style={tdStyle}>{m.checkup_date}</td><td style={tdStyle}>{m.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.child_health.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.childHealth")} ({healthRecords.child_health.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>Checkup Date</th><th style={thStyle}>Remarks</th></tr></thead><tbody>{healthRecords.child_health.map((ch: any) => (<tr key={ch.id}><td style={tdStyle}>{ch.checkup_date}</td><td style={tdStyle}>{ch.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {healthRecords.family_planning.length > 0 && (<><h2 style={{ fontSize: 15, fontWeight: "bold", color: "#000000", marginTop: 20, borderBottom: "1px solid #000000", paddingBottom: 4 }}>{t("nav.familyPlanning")} ({healthRecords.family_planning.length})</h2><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}><thead><tr style={{ background: "transparent" }}><th style={thStyle}>{t("fp.method")}</th><th style={thStyle}>{t("fp.startDate")}</th><th style={thStyle}>{t("fp.remarks")}</th></tr></thead><tbody>{healthRecords.family_planning.map((fp: any) => (<tr key={fp.id}><td style={tdStyle}>{fp.method}</td><td style={tdStyle}>{fp.start_date || "—"}</td><td style={tdStyle}>{fp.remarks || "—"}</td></tr>))}</tbody></table></>)}
          {totalRecords === 0 && <p style={{ color: "#888", marginTop: 16, fontStyle: "italic" }}>{t("residents.noHealthRecords")}</p>}
          <div className="print-only flex justify-between items-center mt-6">
            <p className="print-date" style={{ fontSize: 10, color: "#6b7280" }}>{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only { display: none !important; }
        .print-only-table { display: none !important; }
        #resident-print-area { background-color: #ffffff !important; color: #000000 !important; }
        #resident-print-area table, #resident-print-area th, #resident-print-area td { color: #000000 !important; border-color: #000000 !important; }
        #resident-print-area h2, #resident-print-area p, #resident-print-area span, #resident-print-area strong { color: #000000 !important; }
        @media print {
          body * { visibility: hidden !important; }
          #resident-print-area, #resident-print-area * { visibility: visible !important; }
          #resident-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          .print-only-table { display: table !important; }
          .header-seal img { mix-blend-mode: multiply !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      <div className="flex items-center justify-end no-print">
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("residents.printList")}</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder={t("residents.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={sitioFilter} onValueChange={setSitioFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder={t("residents.sitio")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sitios</SelectItem>
            {sitios.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div id="resident-print-area" className="space-y-3">
        {/* Official Printable Header Seal */}
        <div 
          className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6"
          style={{ display: "none", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "4px double #000", paddingBottom: "16px", marginBottom: "20px", textAlign: "center" }}
        >
          <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
        </div>

        <div className="print-only flex justify-between items-center mb-4">
          <h2 style={{ fontSize: 16, fontWeight: "bold" }}>
            {t("residents.title")}{sitioFilter !== "all" ? ` — ${sitioFilter}` : ""}
          </h2>
        </div>

        {/* Printable Resident List Table */}
        <table className="print-only-table w-full border-collapse" style={{ width: "100%", borderCollapse: "collapse", display: "none" }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t("residents.fullName")}</th>
              <th style={thStyle}>{t("residents.gender")}</th>
              <th style={thStyle}>{t("residents.age")}</th>
              <th style={thStyle}>{t("residents.birthday")}</th>
              <th style={thStyle}>{t("residents.civilStatus")}</th>
              <th style={thStyle}>{t("residents.sitio")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{r.full_name}</td>
                <td style={tdStyle}>{r.gender}</td>
                <td style={tdStyle}>{r.age}</td>
                <td style={tdStyle}>{r.birthday || "—"}</td>
                <td style={tdStyle}>{r.status}</td>
                <td style={tdStyle}>{r.sitio || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-only flex justify-between items-center mt-4">
          <p style={{ fontSize: 12, color: "#4b5563" }}>{t("common.total")}: {filtered.length}</p>
          <p className="print-date" style={{ fontSize: 10, color: "#6b7280" }}>{new Date().toLocaleString()}</p>
        </div>

        <div className="no-print space-y-3">
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
                      <Badge variant="secondary" className="text-xs font-mono">
                        {resident.family_number}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("residents.editResident")}</DialogTitle><DialogDescription>{t("residents.editResidentDesc")}</DialogDescription></DialogHeader>
          {editResident && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>{t("residents.fullName")} *</Label><Input value={editResident.full_name} onChange={(e) => setEditResident({ ...editResident, full_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("residents.birthday")}</Label><Input type="date" value={editResident.birthday || ""} onChange={(e) => {
                const bday = e.target.value;
                const computed = calculateAge(bday);
                setEditResident({ ...editResident, birthday: bday, age: computed > 0 ? computed : editResident.age });
              }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("residents.gender")}</Label><Select value={editResident.gender} onValueChange={(v) => setEditResident({ ...editResident, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">{t("residents.male")}</SelectItem><SelectItem value="Female">{t("residents.female")}</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label>{t("residents.age")}</Label><Input type="number" value={editResident.age} onChange={(e) => setEditResident({ ...editResident, age: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-1"><Label>{t("residents.civilStatus")}</Label><Select value={editResident.status} onValueChange={(v) => setEditResident({ ...editResident, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Single">{t("residents.single")}</SelectItem><SelectItem value="Married">{t("residents.married")}</SelectItem><SelectItem value="Widowed">{t("residents.widowed")}</SelectItem><SelectItem value="Separated">{t("residents.separated")}</SelectItem></SelectContent></Select></div>
              <div className="space-y-1">
                <Label>{t("residents.sitio")}</Label>
                <Select value={editResident.sitio || ""} onValueChange={(v) => setEditResident({ ...editResident, sitio: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Sitio" /></SelectTrigger>
                  <SelectContent>
                    {SUBUKIN_SITIOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

const thStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#000000", background: "transparent" };
const tdStyle: React.CSSProperties = { border: "1px solid #d1d5db", padding: "7px 10px", textAlign: "left", fontSize: 12, color: "#000000" };

export default ResidentRecords;
