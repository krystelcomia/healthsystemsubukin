import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, Printer, Eye, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import { syncFamilyDataToResidents } from "@/lib/residentLinker";
import barangayLogo from "@/assets/barangay-logo.png";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";
import { OfficialHeader } from "@/components/OfficialHeader";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; sitio: string; birthday: string | null; family_number?: string | null; created_at: string;
}

interface HealthRecords {
  consultations: any[]; family_data: any[]; philpen_health: any[]; dengue_prevention: any[]; maternal_care: any[]; child_health: any[]; family_planning: any[]; custom_forms: any[];
}

const AdminResidents = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSitio, setSelectedSitio] = useState("all");
  const [sitios, setSitios] = useState<string[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecords | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchResidents(); }, []);

  const fetchResidents = async () => {
    setLoading(true);
    const familyNamesSet = await syncFamilyDataToResidents();
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) { toast.error("Failed to load residents"); setLoading(false); return; }

    // Resident records are strictly limited to those included in family data (regardless of placement)
    const rawFamilyOnly = (data || []).filter(r => 
      r.full_name && familyNamesSet.has(r.full_name.trim().toLowerCase())
    );

    const seenNames = new Set<string>();
    const familyOnlyResidents: Resident[] = [];
    for (const r of rawFamilyOnly) {
      const key = r.full_name.trim().toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        familyOnlyResidents.push(r);
      }
    }

    setResidents(familyOnlyResidents);
    const dbSitios = Array.from(new Set(familyOnlyResidents.map(r => r.sitio).filter(s => Boolean(s) && s !== "Centro" && s !== "Sitio Centro"))).sort() as string[];
    const uniqueSitios = dbSitios.length > 0 ? dbSitios : SUBUKIN_SITIOS;
    setSitios(uniqueSitios);
    setLoading(false);
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

    const savedCustomRecords = JSON.parse(localStorage.getItem("bhw_custom_form_records") || "[]");
    const customForms = savedCustomRecords.filter((rec: any) => 
      rec.residentId === residentId || rec.resident_id === residentId || (cleanName && rec.resident_name && rec.resident_name.trim().toLowerCase() === cleanName)
    );

    setHealthRecords({
      consultations,
      family_data: familyData,
      philpen_health: philpenHealth,
      dengue_prevention: denguePrevention,
      maternal_care: maternalCare,
      child_health: childHealth,
      family_planning: familyPlanning,
      custom_forms: customForms,
    });
  };

  const handleOpenResidentRecords = (resident: Resident) => {
    setSelectedResident(resident);
    fetchHealthRecords(resident);
    setDialogOpen(true);
  };

  const filtered = selectedSitio === "all" ? residents : residents.filter(r => r.sitio === selectedSitio);

  // Group filtered records by sitio
  const groupedBySitio: Record<string, Resident[]> = {};
  filtered.forEach(r => {
    const sitio = r.sitio || "Unassigned";
    if (!groupedBySitio[sitio]) {
      groupedBySitio[sitio] = [];
    }
    groupedBySitio[sitio].push(r);
  });

  // Sort sitio names alphabetically
  const sortedSitioNames = Object.keys(groupedBySitio).sort((a, b) => a.localeCompare(b));

  // Sort resident records within each sitio alphabetically by full_name
  sortedSitioNames.forEach(sitio => {
    groupedBySitio[sitio].sort((a, b) => a.full_name.localeCompare(b.full_name));
  });

  const handlePrint = () => {
    window.print();
  };

  const totalRecords = healthRecords ? (
    healthRecords.consultations.length +
    healthRecords.family_data.length +
    healthRecords.philpen_health.length +
    healthRecords.dengue_prevention.length +
    healthRecords.maternal_care.length +
    healthRecords.child_health.length +
    healthRecords.family_planning.length +
    healthRecords.custom_forms.length
  ) : 0;

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only { display: none !important; }
        .print-only-table { display: none !important; }
        #admin-residents-print-area { background-color: #ffffff !important; color: #000000 !important; }
        #admin-residents-print-area table, #admin-residents-print-area th, #admin-residents-print-area td { color: #000000 !important; border-color: #000000 !important; }
        #admin-residents-print-area h2, #admin-residents-print-area p, #admin-residents-print-area span, #admin-residents-print-area strong { color: #000000 !important; }
        @media print {
          body * { visibility: hidden !important; }
          #admin-residents-print-area, #admin-residents-print-area * { visibility: visible !important; }
          #admin-residents-print-area {
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
          .print-only { display: flex !important; width: 100% !important; flex-direction: column !important; align-items: center !important; }
          .header-seal { width: 100% !important; }
          .header-seal img { height: 95px !important; mix-blend-mode: multiply !important; }
          #admin-residents-print-area table td, #admin-residents-print-area table th { padding: 3px 6px !important; font-size: 11px !important; }
          @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">{t("admin.residents.filterBySitio")}</Label>
          <Select value={selectedSitio} onValueChange={setSelectedSitio}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.residents.allSitios")}</SelectItem>{sitios.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handlePrint}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold h-8 text-xs shrink-0"
        >
          <Printer className="h-3.5 w-3.5" /> {t("common.print")}
        </Button>
      </div>

      <div id="admin-residents-print-area" className="space-y-6">
        {/* Printable Official Header Seal */}
        <div className="print-only w-full" style={{ display: "none", width: "100%" }}>
          <OfficialHeader
            title={`${t("residents.title")} — ${selectedSitio === "all" ? t("admin.residents.allSitios") : selectedSitio}`}
            subtitle="Barangay Subukin Health Center • San Juan, Batangas"
            showDoubleBorder={true}
            logoHeight="95px"
          />
        </div>

        {loading ? (
          <Card className="border-border/50 p-6 text-center text-muted-foreground">{t("common.loading")}</Card>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50 p-6 text-center text-muted-foreground">{t("residents.noResidents")}</Card>
        ) : (
          sortedSitioNames.map(sitioName => {
            const residentsInSitio = groupedBySitio[sitioName];
            return (
              <Card key={sitioName} className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 border-b border-border/40 py-3.5 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Sitio {sitioName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {residentsInSitio.length} resident{residentsInSitio.length !== 1 ? "s" : ""}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="p-3 text-left font-medium text-muted-foreground w-12">#</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.fullName")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Family #</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.gender")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.age")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.birthday")}</th>
                          <th className="p-3 text-center font-medium text-muted-foreground w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residentsInSitio.map((r, i) => (
                          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                            <td className="p-3 font-medium text-foreground">
                              <button 
                                onClick={() => handleOpenResidentRecords(r)}
                                className="hover:underline hover:text-primary text-left font-semibold flex items-center gap-1.5"
                                title="Click to view associated health records"
                              >
                                {r.full_name}
                              </button>
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.family_number ? (
                                <Badge variant="outline" className="font-mono text-[11px] bg-primary/5 text-primary border-primary/20">
                                  {r.family_number}
                                </Badge>
                              ) : "—"}
                            </td>
                            <td className="p-3 text-foreground">{r.gender}</td>
                            <td className="p-3 text-foreground">{r.age}</td>
                            <td className="p-3 text-foreground">{r.birthday || "—"}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleOpenResidentRecords(r)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Health Records
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <div className="print-only flex justify-between items-center mt-4">
          <p style={{ fontSize: 12, color: "#4b5563" }}>{t("common.total")}: {filtered.length}</p>
          <p className="print-date" style={{ fontSize: 10, color: "#6b7280" }}>{new Date().toLocaleString()}</p>
        </div>
      </div>

    <p className="text-sm text-muted-foreground no-print">{t("common.showing")} {filtered.length} {t("common.of")} {residents.length}</p>

      {/* Dialog showing selected resident's health records */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-foreground">
              {selectedResident?.full_name} — Health Records
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Associated health records across all barangay forms.
            </DialogDescription>
          </DialogHeader>

          {selectedResident && healthRecords && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/30 rounded-lg text-xs">
                <div><strong>Gender:</strong> {selectedResident.gender}</div>
                <div><strong>Age:</strong> {selectedResident.age}</div>
                <div><strong>Sitio:</strong> {selectedResident.sitio || "—"}</div>
              </div>

              {healthRecords.consultations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("dashboard.consultations")} ({healthRecords.consultations.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">Temp</th>
                        <th className="p-2 border">PR</th>
                        <th className="p-2 border">RR</th>
                        <th className="p-2 border">Height</th>
                        <th className="p-2 border">Weight</th>
                        <th className="p-2 border">Complaint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.consultations.map((c: any) => (
                        <tr key={c.id}>
                          <td className="p-2 border">{c.consultation_date}</td>
                          <td className="p-2 border">{c.temperature || "—"}</td>
                          <td className="p-2 border">{c.pulse_rate || "—"}</td>
                          <td className="p-2 border">{c.respiration_rate || "—"}</td>
                          <td className="p-2 border">{c.height || "—"}</td>
                          <td className="p-2 border">{c.weight || "—"}</td>
                          <td className="p-2 border">{c.consultation_cause || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.philpen_health.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.philpenHealth")} ({healthRecords.philpen_health.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">BP</th>
                        <th className="p-2 border">BMI</th>
                        <th className="p-2 border">Smokes</th>
                        <th className="p-2 border">Alcohol</th>
                        <th className="p-2 border">High BP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.philpen_health.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 border">{p.record_date}</td>
                          <td className="p-2 border">{p.bp || "—"}</td>
                          <td className="p-2 border">{p.bmi || "—"}</td>
                          <td className="p-2 border">{p.smokes ? "Yes" : "No"}</td>
                          <td className="p-2 border">{p.drinks_alcohol ? "Yes" : "No"}</td>
                          <td className="p-2 border">{p.high_blood_pressure ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}



              {healthRecords.family_data.length > 0 && (
                <div className="space-y-2">
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Family #</th>
                        <th className="p-2 border">Father</th>
                        <th className="p-2 border">Mother</th>
                        <th className="p-2 border">Total Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.family_data.map((f: any) => (
                        <tr key={f.id}>
                          <td className="p-2 border">{f.family_number || "—"}</td>
                          <td className="p-2 border">{f.father_name || "—"}</td>
                          <td className="p-2 border">{f.mother_name || "—"}</td>
                          <td className="p-2 border">{f.total_members}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.dengue_prevention.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.denguePrevention")} ({healthRecords.dengue_prevention.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Household</th>
                        <th className="p-2 border">Container</th>
                        <th className="p-2 border">Larvae Present</th>
                        <th className="p-2 border">Action Plan</th>
                        <th className="p-2 border">Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.dengue_prevention.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-2 border">{d.household_name || "—"}</td>
                          <td className="p-2 border">{d.container_type || "—"}</td>
                          <td className="p-2 border">{d.has_larvae ? "Yes" : "No"}</td>
                          <td className="p-2 border">{d.action_plan || "—"}</td>
                          <td className="p-2 border">
                            {d.signature ? (
                              d.signature.startsWith("data:image") || d.signature.startsWith("http") ? (
                                <img
                                  src={d.signature}
                                  alt="Signature"
                                  className="h-7 max-w-[120px] object-contain inline-block bg-white dark:bg-slate-900 border border-border/40 rounded p-0.5"
                                />
                              ) : (
                                d.signature
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.maternal_care.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.maternalCare")} ({healthRecords.maternal_care.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Checkup Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.maternal_care.map((m: any) => (
                        <tr key={m.id}>
                          <td className="p-2 border">{m.checkup_date}</td>
                          <td className="p-2 border">{m.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.child_health.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.childHealth")} ({healthRecords.child_health.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Checkup Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.child_health.map((ch: any) => (
                        <tr key={ch.id}>
                          <td className="p-2 border">{ch.checkup_date}</td>
                          <td className="p-2 border">{ch.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.family_planning.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.familyPlanning")} ({healthRecords.family_planning.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Method</th>
                        <th className="p-2 border">Start Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.family_planning.map((fp: any) => (
                        <tr key={fp.id}>
                          <td className="p-2 border">{fp.method}</td>
                          <td className="p-2 border">{fp.start_date || "—"}</td>
                          <td className="p-2 border">{fp.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.custom_forms && healthRecords.custom_forms.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">Custom & Deployed Health Forms ({healthRecords.custom_forms.length})</h3>
                  <div className="space-y-3">
                    {healthRecords.custom_forms.map((cf: any, idx: number) => (
                      <div key={cf.id || idx} className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <p className="font-bold text-xs text-foreground uppercase">{cf.formTitle || "Custom Form"}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {cf.savedAt ? new Date(cf.savedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                          {Array.isArray(cf.fields) && cf.fields.map((f: any, fIdx: number) => (
                            <div key={fIdx} className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-muted-foreground block">{f.label}:</span>
                              <span className="font-medium text-foreground">{f.value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalRecords === 0 && (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  {t("residents.noHealthRecords")}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/30 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResidents;
