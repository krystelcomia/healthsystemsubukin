import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  Plus, 
  Printer, 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  User, 
  MapPin, 
  Calendar, 
  Heart, 
  HeartPulse, 
  Syringe, 
  Activity, 
  LayoutGrid, 
  List as ListIcon, 
  FileText, 
  UserPlus, 
  Sparkles, 
  Home, 
  Filter, 
  Clock,
  ChevronRight
} from "lucide-react";
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
  id: string; 
  full_name: string; 
  gender: string; 
  age: number; 
  status: string; 
  sitio: string; 
  birthday: string | null; 
  family_number?: string | null; 
  created_at: string;
}

interface HealthRecords {
  consultations: any[]; 
  family_data: any[]; 
  philpen_health: any[]; 
  dengue_prevention: any[]; 
  maternal_care: any[]; 
  child_health: any[]; 
  family_planning: any[];
}

const ResidentRecords = () => {
  const { t } = useSettings();
  const [search, setSearch] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecords | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResident, setEditResident] = useState<Resident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sitioFilter, setSitioFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [newResident, setNewResident] = useState({
    full_name: "", gender: "Male", age: "", status: "Single", sitio: "Cama", birthday: "",
  });

  const fetchResidents = async () => {
    setLoading(true);
    const familyNamesSet = await syncFamilyDataToResidents();
    const { data, error } = await supabase.from("residents").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load residents"); setLoading(false); return; }

    // Resident records are strictly limited to those included in the family data (regardless of placement)
    const familyOnlyResidents = (data || []).filter(r => 
      r.full_name && familyNamesSet.has(r.full_name.trim().toLowerCase())
    );

    setResidents(familyOnlyResidents);
    setLoading(false);
  };

  useEffect(() => { fetchResidents(); }, []);

  const handleAddResident = async () => {
    if (!newResident.full_name.trim()) { toast.error(t("residents.fullName") + " required"); return; }
    const cleanName = newResident.full_name.trim();
    const isFemale = newResident.gender === "Female";

    const { error } = await supabase.from("residents").insert({
      full_name: cleanName, gender: newResident.gender, age: Number(newResident.age) || 0, status: newResident.status,
      sitio: newResident.sitio, birthday: newResident.birthday || null,
    });
    if (error) { toast.error("Failed to add resident"); return; }

    // Register in family_data so this resident is included in family data records
    await supabase.from("family_data").insert({
      family_number: `FN-${Date.now().toString().slice(-6)}`,
      father_name: isFemale ? "" : cleanName,
      mother_name: isFemale ? cleanName : "",
      num_households: 1,
      num_males: isFemale ? 0 : 1,
      num_females: isFemale ? 1 : 0,
      total_members: 1,
      sitio: newResident.sitio || "Subukin",
      members_detail: JSON.stringify([{
        id: `mem-${Date.now()}`,
        full_name: cleanName,
        relationship: isFemale ? "Mother" : "Head",
        age: Number(newResident.age) || 0,
        birthday: newResident.birthday || "",
        gender: newResident.gender,
        civil_status: newResident.status
      }])
    });

    logActivity("create_resident", { entity_type: "resident", description: `Added resident: ${cleanName}` });
    toast.success("Resident added successfully!");
    setNewResident({ full_name: "", gender: "Male", age: "", status: "Single", sitio: "Cama", birthday: "" });
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

  const fetchHealthRecords = async (resident: Resident) => {
    const residentId = resident.id;
    const cleanName = (resident.full_name || "").trim().toLowerCase();
    const famNum = (resident.family_number || "").trim();

    const [cRes, fRes, pRes, dRes, mRes, chRes, fpRes] = await Promise.all([
      supabase.from("consultations").select("*").order("created_at", { ascending: false }),
      supabase.from("family_data").select("*").order("created_at", { ascending: false }),
      supabase.from("philpen_health").select("*").order("created_at", { ascending: false }),
      supabase.from("dengue_prevention").select("*").order("created_at", { ascending: false }),
      supabase.from("maternal_care" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("child_health" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("family_planning").select("*").order("created_at", { ascending: false }),
    ]);

    const consultations = (cRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.full_name && rec.full_name.trim().toLowerCase() === cleanName)
    );

    const familyData = (fRes.data || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      if (famNum && rec.family_number && rec.family_number.trim() === famNum) return true;
      if (cleanName) {
        if (rec.father_name && rec.father_name.trim().toLowerCase() === cleanName) return true;
        if (rec.mother_name && rec.mother_name.trim().toLowerCase() === cleanName) return true;
        let members: any[] = [];
        if (Array.isArray(rec.members_detail)) members = rec.members_detail;
        else if (typeof rec.members_detail === "string") {
          try { members = JSON.parse(rec.members_detail); } catch (e) {}
        }
        if (members.some((m: any) => m.full_name && m.full_name.trim().toLowerCase() === cleanName)) return true;
      }
      return false;
    });

    const philpenHealth = (pRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.full_name && rec.full_name.trim().toLowerCase() === cleanName)
    );

    const denguePrevention = (dRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.household_name && rec.household_name.trim().toLowerCase() === cleanName)
    );

    const maternalCare = ((mRes.data as any[]) || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      const full = (rec.patient_name || `${rec.patient_first_name || ""} ${rec.patient_last_name || ""}`).trim().toLowerCase();
      return cleanName && full && full === cleanName;
    });

    const childHealth = ((chRes.data as any[]) || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      const full = (rec.child_name || `${rec.first_name || ""} ${rec.surname || ""}`).trim().toLowerCase();
      return cleanName && full && full === cleanName;
    });

    const familyPlanning = (fpRes.data || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      if (cleanName && rec.remarks && rec.remarks.toLowerCase().includes(cleanName)) return true;
      if (rec.details) {
        try {
          const parsed = JSON.parse(rec.details);
          const cName = `${parsed.sideA?.client_given_name || ""} ${parsed.sideA?.client_last_name || ""}`.trim().toLowerCase();
          if (cleanName && cName && cName === cleanName) return true;
        } catch {}
      }
      return false;
    });

    setHealthRecords({
      consultations,
      family_data: familyData,
      philpen_health: philpenHealth,
      dengue_prevention: denguePrevention,
      maternal_care: maternalCare,
      child_health: childHealth,
      family_planning: familyPlanning,
    });
  };

  const handleSelectResident = (resident: Resident) => { setSelectedResident(resident); fetchHealthRecords(resident); };

  const handlePrint = () => {
    window.print();
  };

  const dbSitios = Array.from(new Set(residents.map((r) => r.sitio).filter((s) => Boolean(s) && s !== "Centro" && s !== "Sitio Centro"))).sort() as string[];
  const sitios = dbSitios.length > 0 ? dbSitios : SUBUKIN_SITIOS;
  const filtered = residents.filter((r) => {
    const matchesSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          (r.sitio || "").toLowerCase().includes(search.toLowerCase()) ||
                          (r.family_number || "").toLowerCase().includes(search.toLowerCase());
    const matchesSitio = sitioFilter === "all" || r.sitio === sitioFilter;
    return matchesSearch && matchesSitio;
  });

  // Demographics stats
  const totalMale = residents.filter(r => r.gender.toLowerCase() === "male").length;
  const totalFemale = residents.filter(r => r.gender.toLowerCase() === "female").length;
  const totalChildren = residents.filter(r => r.age <= 12).length;

  if (selectedResident && healthRecords) {
    const totalRecords = healthRecords.consultations.length + healthRecords.family_data.length + healthRecords.philpen_health.length + healthRecords.dengue_prevention.length + healthRecords.maternal_care.length + healthRecords.child_health.length + healthRecords.family_planning.length;
    return (
      <div className="w-full space-y-6 max-w-full">
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
            .print-resident-header { display: block !important; width: 100% !important; }
            .print-only-table { display: table !important; }
            .header-seal img { height: 75px !important; mix-blend-mode: multiply !important; }
            #resident-print-area table td, #resident-print-area table th { padding: 3px 6px !important; font-size: 11px !important; }
            @page { size: A4 portrait; margin: 5mm; }
          }
        `}</style>

        <div className="flex items-center justify-between no-print border-b border-border/40 pb-4">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedResident(null); setHealthRecords(null); }} className="gap-2 text-xs font-semibold">
            <ArrowLeft className="h-4 w-4" /> {t("residents.backToRecords")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10">
              <Printer className="h-3.5 w-3.5" /> {t("residents.printRecord")}
            </Button>
          </div>
        </div>

        <div id="resident-print-area" className="space-y-5">
          
          {/* Printable Official Seals */}
          <div 
            className="print-only header-seal items-center justify-center gap-6 md:gap-8 border-b-[4px] border-double border-slate-900 pb-4 mb-6"
            style={{ display: "none", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "4px double #000", paddingBottom: "16px", marginBottom: "20px", textAlign: "center" }}
          >
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Header Text" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply" style={{ height: "80px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          {/* Resident Header Profile Card */}
          <Card className="border-border/60 shadow-sm bg-gradient-to-r from-primary/10 via-primary/5 to-transparent no-print">
            <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary font-bold text-lg flex items-center justify-center shadow-xs border border-primary/20 shrink-0">
                  {selectedResident.full_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-heading font-extrabold text-foreground">{selectedResident.full_name}</h2>
                    {selectedResident.family_number && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                        Family #: {selectedResident.family_number}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Sitio {selectedResident.sitio || "Subukin"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span>Gender: <strong>{selectedResident.gender}</strong></span> · 
                    <span>Age: <strong>{selectedResident.age} yrs</strong></span> · 
                    <span>Birthday: <strong>{selectedResident.birthday || "N/A"}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-background/80 p-2.5 rounded-xl border border-border/50 text-xs shrink-0">
                <FileText className="h-4 w-4 text-primary" />
                <span>Total Registered Medical Records: <strong>{totalRecords}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Printable Resident Header Info */}
          <div className="print-only print-resident-header" style={{ display: "none", width: "100%", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "16px", textAlign: "left" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#000", marginBottom: "6px", display: "block", width: "100%", clear: "both" }}>
              {selectedResident.full_name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 20px", fontSize: "12px", color: "#000", lineHeight: "1.4", width: "100%" }}>
              <span><strong>{t("residents.gender")}:</strong> {selectedResident.gender}</span>
              <span><strong>{t("residents.age")}:</strong> {selectedResident.age} yrs</span>
              <span><strong>{t("residents.birthday")}:</strong> {selectedResident.birthday || "—"}</span>
              <span><strong>{t("residents.sitio")}:</strong> Sitio {selectedResident.sitio || "Subukin"}</span>
              {selectedResident.family_number && (
                <span><strong>Family #:</strong> {selectedResident.family_number}</span>
              )}
            </div>
          </div>

          {healthRecords.family_data.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Home className="h-4 w-4 text-sky-600" /> Family Data Registry ({healthRecords.family_data.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>{t("familyData.familyNumber")}</th>
                    <th style={thStyle}>{t("familyData.numHouseholds")}</th>
                    <th style={thStyle}>{t("familyData.father")}</th>
                    <th style={thStyle}>{t("familyData.mother")}</th>
                    <th style={thStyle}>{t("familyData.males")}</th>
                    <th style={thStyle}>{t("familyData.females")}</th>
                    <th style={thStyle}>{t("familyData.totalMembers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.family_data.map((f: any) => (
                    <tr key={f.id}>
                      <td style={tdStyle}>{f.family_number || "—"}</td>
                      <td style={tdStyle}>{f.num_households}</td>
                      <td style={tdStyle}>{f.father_name || "—"}</td>
                      <td style={tdStyle}>{f.mother_name || "—"}</td>
                      <td style={tdStyle}>{f.num_males}</td>
                      <td style={tdStyle}>{f.num_females}</td>
                      <td style={tdStyle}>{f.total_members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.consultations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" /> {t("dashboard.consultations")} ({healthRecords.consultations.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>{t("consultation.date")}</th>
                    <th style={thStyle}>{t("consultation.temp")}</th>
                    <th style={thStyle}>PR</th>
                    <th style={thStyle}>RR</th>
                    <th style={thStyle}>{t("consultation.height")}</th>
                    <th style={thStyle}>{t("consultation.weight")}</th>
                    <th style={thStyle}>{t("consultation.cause")}</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.consultations.map((c: any) => (
                    <tr key={c.id}>
                      <td style={tdStyle}>{c.consultation_date}</td>
                      <td style={tdStyle}>{c.temperature || "—"}</td>
                      <td style={tdStyle}>{c.pulse_rate || "—"}</td>
                      <td style={tdStyle}>{c.respiration_rate || "—"}</td>
                      <td style={tdStyle}>{c.height || "—"}</td>
                      <td style={tdStyle}>{c.weight || "—"}</td>
                      <td style={tdStyle}>{c.consultation_cause || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.philpen_health.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-600" /> {t("nav.philpenHealth")} ({healthRecords.philpen_health.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>{t("consultation.date")}</th>
                    <th style={thStyle}>{t("philpen.bp")}</th>
                    <th style={thStyle}>{t("consultation.height")}</th>
                    <th style={thStyle}>{t("consultation.weight")}</th>
                    <th style={thStyle}>{t("philpen.bmi")}</th>
                    <th style={thStyle}>{t("philpen.smoke")}</th>
                    <th style={thStyle}>{t("philpen.alcohol")}</th>
                    <th style={thStyle}>{t("philpen.highBP")}</th>
                    <th style={thStyle}>{t("philpen.diabetes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.philpen_health.map((p: any) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{p.record_date}</td>
                      <td style={tdStyle}>{p.bp || "—"}</td>
                      <td style={tdStyle}>{p.height || "—"}</td>
                      <td style={tdStyle}>{p.weight || "—"}</td>
                      <td style={tdStyle}>{p.bmi || "—"}</td>
                      <td style={tdStyle}>{p.smokes ? t("common.yes") : t("common.no")}</td>
                      <td style={tdStyle}>{p.drinks_alcohol ? t("common.yes") : t("common.no")}</td>
                      <td style={tdStyle}>{p.high_blood_pressure ? t("common.yes") : t("common.no")}</td>
                      <td style={tdStyle}>{p.diabetes_symptoms ? t("common.yes") : t("common.no")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.dengue_prevention.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-600" /> {t("nav.denguePrevention")} ({healthRecords.dengue_prevention.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>{t("dengue.householdName")}</th>
                    <th style={thStyle}>{t("dengue.containerType")}</th>
                    <th style={thStyle}>{t("dengue.hasLarvae")}</th>
                    <th style={thStyle}>{t("dengue.actionPlan")}</th>
                    <th style={thStyle}>{t("dengue.signature")}</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.dengue_prevention.map((d: any) => (
                    <tr key={d.id}>
                      <td style={tdStyle}>{d.household_name || "—"}</td>
                      <td style={tdStyle}>{d.container_type || "—"}</td>
                      <td style={tdStyle}>{d.has_larvae ? t("common.yes") : t("common.no")}</td>
                      <td style={tdStyle}>{d.action_plan || "—"}</td>
                      <td style={tdStyle}>{d.signature || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.maternal_care.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-pink-600" /> {t("nav.maternalCare")} ({healthRecords.maternal_care.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>Checkup Date</th>
                    <th style={thStyle}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.maternal_care.map((m: any) => (
                    <tr key={m.id}>
                      <td style={tdStyle}>{m.checkup_date}</td>
                      <td style={tdStyle}>{m.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.child_health.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-600" /> {t("nav.childHealth")} ({healthRecords.child_health.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>Checkup Date</th>
                    <th style={thStyle}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.child_health.map((ch: any) => (
                    <tr key={ch.id}>
                      <td style={tdStyle}>{ch.checkup_date}</td>
                      <td style={tdStyle}>{ch.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {healthRecords.family_planning.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Syringe className="h-4 w-4 text-indigo-600" /> {t("nav.familyPlanning")} ({healthRecords.family_planning.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent" }}>
                    <th style={thStyle}>{t("fp.method")}</th>
                    <th style={thStyle}>{t("fp.startDate")}</th>
                    <th style={thStyle}>{t("fp.remarks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {healthRecords.family_planning.map((fp: any) => (
                    <tr key={fp.id}>
                      <td style={tdStyle}>{fp.method}</td>
                      <td style={tdStyle}>{fp.start_date || "—"}</td>
                      <td style={tdStyle}>{fp.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalRecords === 0 && (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              {t("residents.noHealthRecords")}
            </p>
          )}

          <div className="print-only flex justify-between items-center mt-6">
            <p className="print-date" style={{ fontSize: 10, color: "#6b7280" }}>{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Edit Dialog inside detail view */}
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
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-full">
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
          .header-seal img { height: 75px !important; mix-blend-mode: multiply !important; }
          #resident-print-area table td, #resident-print-area table th { padding: 3px 6px !important; font-size: 11px !important; }
          @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>

      {/* Clean Page Title & Action Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-foreground">Resident Records</h1>
            <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
              {residents.length} Registered
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Barangay Subukin population health registry and medical records database.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print List
          </Button>
        </div>
      </div>

      {/* Clean Search & Sitio Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 text-xs bg-background h-9" 
              placeholder="Search by name, sitio, or family number..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <Select value={sitioFilter} onValueChange={setSitioFilter}>
            <SelectTrigger className="w-full sm:w-48 text-xs bg-background h-9">
              <SelectValue placeholder="All Sitios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sitios ({residents.length})</SelectItem>
              {sitios.map((s) => (
                <SelectItem key={s} value={s}>
                  Sitio {s} ({residents.filter(r => r.sitio === s).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center p-1 rounded-lg bg-muted border border-border/50 shrink-0 self-end sm:self-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <ListIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div id="resident-print-area" className="space-y-4">
        
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
            {t("residents.title")}{sitioFilter !== "all" ? ` — Sitio ${sitioFilter}` : ""}
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
                <td style={tdStyle}>{r.sitio || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-only flex justify-between items-center mt-4">
          <p style={{ fontSize: 12, color: "#4b5563" }}>{t("common.total")}: {filtered.length}</p>
          <p className="print-date" style={{ fontSize: 10, color: "#6b7280" }}>{new Date().toLocaleString()}</p>
        </div>

        {/* Screen View: Clean Grid vs Compact List */}
        <div className="no-print space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-12 space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded w-48 mx-auto" />
              <p className="text-xs">{t("residents.loadingResidents")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border border-dashed p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto opacity-30 text-primary mb-2" />
              <p className="text-sm font-semibold">{t("residents.noResidents")}</p>
              <p className="text-xs mt-1">Try adjusting your search terms or sitio filter.</p>
            </Card>
          ) : viewMode === "grid" ? (
            /* CLEAN GRID VIEW CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((resident) => (
                <Card 
                  key={resident.id} 
                  className="border-border/50 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 bg-card group relative overflow-hidden cursor-pointer"
                  onClick={() => handleSelectResident(resident)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-full ${resident.gender.toLowerCase() === "female" ? "bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"} flex items-center justify-center font-bold text-xs shrink-0`}>
                          {resident.full_name.split(" ").map((n) => n[0]).join("")}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {resident.full_name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {resident.family_number && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-mono">
                                Family #{resident.family_number}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Sitio {resident.sitio || "Subukin"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between border-t border-border/30">
                      <span>{resident.gender} · {resident.age} yrs</span>
                      <span className="text-[11px] text-primary font-medium opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                        View Records <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* COMPACT LIST VIEW TABLE */
            <Card className="border-border/60 shadow-xs bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Resident Name</th>
                      <th className="p-3">Family #</th>
                      <th className="p-3">Sitio</th>
                      <th className="p-3">Gender</th>
                      <th className="p-3">Age</th>
                      <th className="p-3">Birthday</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-semibold text-foreground cursor-pointer hover:text-primary" onClick={() => handleSelectResident(r)}>
                          {r.full_name}
                        </td>
                        <td className="p-3 font-mono text-primary font-bold">
                          {r.family_number || "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {r.sitio || "Subukin"}
                          </Badge>
                        </td>
                        <td className="p-3">{r.gender}</td>
                        <td className="p-3 font-medium">{r.age} yrs</td>
                        <td className="p-3 text-muted-foreground">{r.birthday || "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => handleSelectResident(r)}>
                              <FileText className="h-3.5 w-3.5" /> Records
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = { border: "1px solid #333333", padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#000000", background: "#f3f4f6", lineHeight: "1.3" };
const tdStyle: React.CSSProperties = { border: "1px solid #333333", padding: "6px 8px", textAlign: "left", fontSize: 11, color: "#000000", lineHeight: "1.3" };

export default ResidentRecords;
