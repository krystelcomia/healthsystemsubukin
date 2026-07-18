import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Activity, Printer, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AdminHealthRecords = () => {
  const { t } = useSettings();
  const [activeForm, setActiveForm] = useState("consultations");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => { fetchRecords(); }, [activeForm]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)(activeForm).select("*, residents(full_name)").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load records"); setLoading(false); return; }
    setRecords(data || []); setLoading(false);
  };

  const handleEditRecord = async () => {
    if (!editRecord) return;
    const { residents, ...updateData } = editRecord;
    const { error } = await (supabase.from as any)(activeForm).update(updateData).eq("id", editRecord.id);
    if (error) { toast.error("Failed to update record"); return; }
    toast.success("Record updated!"); setEditDialogOpen(false); setEditRecord(null); fetchRecords();
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

  const formLabels: Record<string, string> = {
    consultations: t("dashboard.consultations"),
    family_data: t("nav.familyData"),
    philpen_health: t("nav.philpenHealth"),
    dengue_prevention: t("nav.denguePrevention"),
  };

  const handlePrint = () => {
    const cols = getColumns();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${formLabels[activeForm]}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; } .header h1 { font-size: 20px; color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 11px; } th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }</style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>${formLabels[activeForm]}</p></div>
      <table><thead><tr><th>#</th><th>${t("consultation.resident")}</th>${cols.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>`);
    records.forEach((r, i) => { win.document.write(`<tr><td>${i + 1}</td><td>${r.residents?.full_name || "—"}</td>${cols.map(c => `<td>${r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}</td>`).join("")}</tr>`); });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${records.length}</p>`);
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />{t("adminHealth.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("adminHealth.desc")}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Select value={activeForm} onValueChange={setActiveForm}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="consultations">{t("dashboard.consultations")}</SelectItem>
            <SelectItem value="family_data">{t("nav.familyData")}</SelectItem>
            <SelectItem value="philpen_health">{t("nav.philpenHealth")}</SelectItem>
            <SelectItem value="dengue_prevention">{t("nav.denguePrevention")}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("common.print")}</Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground">#</th>
              <th className="p-3 text-left font-medium text-muted-foreground">{t("consultation.resident")}</th>
              {getColumns().map(c => (<th key={c} className="p-3 text-left font-medium text-muted-foreground capitalize">{c.replace(/_/g, " ")}</th>))}
              <th className="p-3 text-left font-medium text-muted-foreground">{t("common.actions")}</th>
            </tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan={getColumns().length + 3} className="p-6 text-center text-muted-foreground">{t("common.loading")}</td></tr>
              ) : records.length === 0 ? (<tr><td colSpan={getColumns().length + 3} className="p-6 text-center text-muted-foreground">{t("common.noRecords")}</td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium text-foreground">{r.residents?.full_name || "—"}</td>
                  {getColumns().map(c => (<td key={c} className="p-3 text-foreground">{r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}</td>))}
                  <td className="p-3"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRecord(r); setEditDialogOpen(true); }}><Pencil className="h-4 w-4 text-muted-foreground" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{records.length} {t("adminHealth.recordsFound")}</p>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("adminHealth.editRecord")}</DialogTitle><DialogDescription>{t("adminHealth.editRecordDesc")}</DialogDescription></DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              {getColumns().map(col => (
                <div key={col} className="space-y-1">
                  <Label className="capitalize">{col.replace(/_/g, " ")}</Label>
                  {typeof editRecord[col] === "boolean" ? (
                    <Select value={editRecord[col] ? "true" : "false"} onValueChange={v => setEditRecord({ ...editRecord, [col]: v === "true" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">{t("common.yes")}</SelectItem><SelectItem value="false">{t("common.no")}</SelectItem></SelectContent></Select>
                  ) : (<Input value={editRecord[col] || ""} onChange={e => setEditRecord({ ...editRecord, [col]: e.target.value })} />)}
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleEditRecord}>{t("common.saveChanges")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHealthRecords;
