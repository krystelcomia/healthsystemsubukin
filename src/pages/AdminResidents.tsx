import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; religion: string; blood_type: string; nationality: string; sitio: string; birthday: string | null; created_at: string;
}

const AdminResidents = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSitio, setSelectedSitio] = useState("all");
  const [sitios, setSitios] = useState<string[]>([]);

  useEffect(() => { fetchResidents(); }, []);

  const fetchResidents = async () => {
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) { toast.error("Failed to load residents"); return; }
    setResidents(data || []);
    const uniqueSitios = [...new Set((data || []).map(r => r.sitio).filter(Boolean))] as string[];
    setSitios(uniqueSitios);
    setLoading(false);
  };

  const filtered = selectedSitio === "all" ? residents : residents.filter(r => r.sitio === selectedSitio);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${t("residents.title")} - ${selectedSitio === "all" ? t("admin.residents.allSitios") : selectedSitio}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; } .header h1 { font-size: 20px; color: #0d9488; } .header p { font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; } th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }</style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>${t("residents.title")} - ${selectedSitio === "all" ? t("admin.residents.allSitios") : `Sitio: ${selectedSitio}`}</p></div>
      <table><thead><tr><th>#</th><th>${t("residents.fullName")}</th><th>${t("residents.gender")}</th><th>${t("residents.age")}</th><th>${t("residents.birthday")}</th><th>${t("residents.civilStatus")}</th><th>${t("residents.bloodType")}</th><th>${t("residents.sitio")}</th><th>${t("residents.nationality")}</th><th>${t("residents.religion")}</th></tr></thead><tbody>`);
    filtered.forEach((r, i) => { win.document.write(`<tr><td>${i + 1}</td><td>${r.full_name}</td><td>${r.gender}</td><td>${r.age}</td><td>${r.birthday || "—"}</td><td>${r.status}</td><td>${r.blood_type || "—"}</td><td>${r.sitio || "—"}</td><td>${r.nationality}</td><td>${r.religion || "—"}</td></tr>`); });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${filtered.length}</p>`);
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t("admin.residents.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("admin.residents.desc")}</p>
      </div>

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
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.gender")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.age")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.birthday")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.civilStatus")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.sitio")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.bloodType")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (<tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("common.loading")}</td></tr>
                ) : filtered.length === 0 ? (<tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("residents.noResidents")}</td></tr>
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
      <p className="text-sm text-muted-foreground">{t("common.showing")} {filtered.length} {t("common.of")} {residents.length}</p>
    </div>
  );
};

export default AdminResidents;
