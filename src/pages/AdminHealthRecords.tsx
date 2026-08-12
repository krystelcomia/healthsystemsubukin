import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Eye, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AdminHealthRecords = () => {
  const { t } = useSettings();
  const [activeForm, setActiveForm] = useState("consultations");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [activeForm]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)(activeForm)
        .select("*, residents(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      toast.error("Failed to load records");
      console.error(err);
    }
    setLoading(false);
  };

  const getColumns = () => {
    switch (activeForm) {
      case "consultations":
        return ["consultation_date", "consultation_cause", "temperature", "pulse_rate", "weight", "height"];
      case "family_data":
        return ["family_number", "father_name", "mother_name", "num_males", "num_females", "total_members"];
      case "philpen_health":
        return ["record_date", "bp", "bmi", "weight", "height", "smokes", "drinks_alcohol"];
      case "dengue_prevention":
        return ["household_name", "container_type", "has_larvae", "action_plan"];
      case "maternal_care":
        return ["family_number", "patient_last_name", "patient_first_name", "age", "sitio", "blood_type"];
      case "child_health":
        return ["fn_number", "first_name", "surname", "dob", "sex", "mother_name", "father_name"];
      case "family_planning":
        return ["method", "start_date", "remarks"];
      default:
        return [];
    }
  };

  const formLabels: Record<string, string> = {
    consultations: t("dashboard.consultations"),
    family_data: t("nav.familyData"),
    philpen_health: t("nav.philpenHealth"),
    dengue_prevention: t("nav.denguePrevention"),
    maternal_care: t("nav.maternalCare"),
    child_health: t("nav.childHealth"),
    family_planning: t("nav.familyPlanning"),
  };

  const handlePrint = () => {
    const cols = getColumns();
    const win = window.open("", "_blank");
    if (!win) return;
    
    win.document.write(`<!DOCTYPE html><html><head><title>${formLabels[activeForm]}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; } 
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; } 
        .header h1 { font-size: 20px; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } 
        th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 11px; } 
        th { background: #f5f3ff; color: #4f46e5; font-weight: 600; text-transform: capitalize; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }
      </style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>${formLabels[activeForm]} Records</p></div>
      <table><thead><tr><th>#</th><th>Resident Name</th>${cols.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>`);
      
    records.forEach((r, i) => {
      const name = r.residents?.full_name || r.patient_name || (r.first_name ? `${r.first_name} ${r.surname || ""}` : "—");
      win.document.write(`<tr><td>${i + 1}</td><td>${name}</td>${cols.map(c => `<td>${r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}</td>`).join("")}</tr>`);
    });
    
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${records.length}</p>`);
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          View Forms
        </h1>
        <p className="text-muted-foreground mt-1">Select and view all active database records across different barangay health forms.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Select value={activeForm} onValueChange={setActiveForm}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(formLabels).map((key) => (
              <SelectItem key={key} value={key}>
                {formLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> {t("common.print")}
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground w-12">#</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Resident Name</th>
                {getColumns().map(c => (
                  <th key={c} className="p-3 text-left font-medium text-muted-foreground capitalize">
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={getColumns().length + 2} className="p-6 text-center text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={getColumns().length + 2} className="p-6 text-center text-muted-foreground">
                    {t("common.noRecords")}
                  </td>
                </tr>
              ) : (
                records.map((r, i) => {
                  const residentName = r.residents?.full_name || r.patient_name || (r.first_name ? `${r.first_name} ${r.surname || ""}` : "—");
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="p-3 font-semibold text-foreground">{residentName}</td>
                      {getColumns().map(c => (
                        <td key={c} className="p-3 text-foreground">
                          {r[c] === true ? t("common.yes") : r[c] === false ? t("common.no") : r[c] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{records.length} records found</p>
    </div>
  );
};

export default AdminHealthRecords;
