import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, Printer, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import barangayLogo from "@/assets/barangay-logo.png";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; religion: string; blood_type: string; nationality: string; sitio: string; birthday: string | null; family_number?: string | null; created_at: string;
}

interface HealthRecords {
  consultations: any[]; family_data: any[]; philpen_health: any[]; dengue_prevention: any[]; maternal_care: any[]; child_health: any[]; family_planning: any[];
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
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) { toast.error("Failed to load residents"); return; }
    setResidents(data || []);
    const uniqueSitios = [...new Set((data || []).map(r => r.sitio).filter(Boolean))] as string[];
    setSitios(uniqueSitios);
    setLoading(false);
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

  const handleOpenResidentRecords = (resident: Resident) => {
    setSelectedResident(resident);
    fetchHealthRecords(resident.id);
    setDialogOpen(true);
  };

  const filtered = selectedSitio === "all" ? residents : residents.filter(r => r.sitio === selectedSitio);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const absSanjuan = new URL(sanjuanLogo, window.location.href).href;
    const absHeaderText = new URL(headerTextImg, window.location.href).href;
    const absBarangay = new URL(barangayLogo, window.location.href).href;

    win.document.write(`<!DOCTYPE html><html><head><title>${t("residents.title")} - ${selectedSitio === "all" ? t("admin.residents.allSitios") : selectedSitio}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header-seal { display: flex !important; align-items: center !important; justify-content: center !important; gap: 24px !important; border-bottom: 4px double #000 !important; padding-bottom: 16px !important; margin-bottom: 20px !important; text-align: center !important; width: 100% !important; }
        .header-seal img { mix-blend-mode: multiply !important; object-fit: contain !important; height: 80px !important; width: auto !important; max-height: 80px !important; shrink: 0 !important; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; color: #000000; } th { background: transparent !important; color: #000000 !important; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #000000; margin-top: 20px; }</style></head><body>
      <div class="header-seal"><img src="${absSanjuan}" alt="San Juan Seal" /><img src="${absHeaderText}" alt="Header Text" /><img src="${absBarangay}" alt="Barangay Subukin Logo" /></div>
      <table><thead><tr><th>#</th><th>${t("residents.fullName")}</th><th>${t("residents.gender")}</th><th>${t("residents.age")}</th><th>${t("residents.birthday")}</th><th>${t("residents.civilStatus")}</th><th>${t("residents.bloodType")}</th><th>${t("residents.sitio")}</th><th>${t("residents.nationality")}</th><th>${t("residents.religion")}</th></tr></thead><tbody>`);
    filtered.forEach((r, i) => { win.document.write(`<tr><td>${i + 1}</td><td>${r.full_name}</td><td>${r.gender}</td><td>${r.age}</td><td>${r.birthday || "—"}</td><td>${r.status}</td><td>${r.blood_type || "—"}</td><td>${r.sitio || "—"}</td><td>${r.nationality}</td><td>${r.religion || "—"}</td></tr>`); });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${filtered.length}</p>`);
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close(); win.print();
  };

  const totalRecords = healthRecords ? (
    healthRecords.consultations.length +
    healthRecords.family_data.length +
    healthRecords.philpen_health.length +
    healthRecords.dengue_prevention.length +
    healthRecords.maternal_care.length +
    healthRecords.child_health.length +
    healthRecords.family_planning.length
  ) : 0;

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">{t("admin.residents.filterBySitio")}</Label>
          <Select value={selectedSitio} onValueChange={setSelectedSitio}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.residents.allSitios")}</SelectItem>{sitios.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("common.print")}</Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.fullName")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Family #</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.gender")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.age")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.birthday")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.civilStatus")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.sitio")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.bloodType")}</th>
                  <th className="p-3 text-center font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (<tr><td colSpan={10} className="p-6 text-center text-muted-foreground">{t("common.loading")}</td></tr>
                ) : filtered.length === 0 ? (<tr><td colSpan={10} className="p-6 text-center text-muted-foreground">{t("residents.noResidents")}</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">
                      <button 
                        onClick={() => handleOpenResidentRecords(r)}
                        className="hover:underline hover:text-primary text-left font-semibold flex items-center gap-1.5"
                        title="Click to view associated health records"
                      >
                        {r.full_name}
                      </button>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.family_number ? <Badge variant="outline" className="font-mono text-[11px] bg-primary/5 text-primary border-primary/20">{r.family_number}</Badge> : "—"}</td>
                    <td className="p-3 text-foreground">{r.gender}</td>
                    <td className="p-3 text-foreground">{r.age}</td>
                    <td className="p-3 text-foreground">{r.birthday || "—"}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-xs">{r.status}</Badge></td>
                    <td className="p-3 text-foreground">{r.sitio || "—"}</td>
                    <td className="p-3 text-foreground">{r.blood_type || "—"}</td>
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
      <p className="text-sm text-muted-foreground">{t("common.showing")} {filtered.length} {t("common.of")} {residents.length}</p>

      {/* Dialog showing selected resident's health records */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/20 border border-border/30 rounded-lg text-xs">
                <div><strong>Gender:</strong> {selectedResident.gender}</div>
                <div><strong>Age:</strong> {selectedResident.age}</div>
                <div><strong>Sitio:</strong> {selectedResident.sitio || "—"}</div>
                <div><strong>Civil Status:</strong> {selectedResident.status}</div>
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
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.familyData")} ({healthRecords.family_data.length})</h3>
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
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.dengue_prevention.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-2 border">{d.household_name || "—"}</td>
                          <td className="p-2 border">{d.container_type || "—"}</td>
                          <td className="p-2 border">{d.has_larvae ? "Yes" : "No"}</td>
                          <td className="p-2 border">{d.action_plan || "—"}</td>
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

              {totalRecords === 0 && (
                <p className="text-center text-xs text-muted-foreground italic py-4">
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
