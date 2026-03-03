import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const AdminSettings = () => {
  const [generating, setGenerating] = useState(false);
  const { darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async () => {
    try {
      toast.info("Exporting data...");
      const [residents, consultations, familyData, dengue, philpen] = await Promise.all([
        supabase.from("residents").select("*"),
        supabase.from("consultations").select("*"),
        supabase.from("family_data").select("*"),
        supabase.from("dengue_prevention").select("*"),
        supabase.from("philpen_health").select("*"),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        residents: residents.data || [],
        consultations: consultations.data || [],
        family_data: familyData.data || [],
        dengue_prevention: dengue.data || [],
        philpen_health: philpen.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhw-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch {
      toast.error("Failed to export data.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.residents || !data.exported_at) {
        toast.error("Invalid backup file.");
        return;
      }

      toast.info("Restoring data...");
      const tables = ["residents", "consultations", "family_data", "dengue_prevention", "philpen_health"] as const;
      for (const table of tables) {
        const rows = data[table];
        if (rows && rows.length > 0) {
          const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
          if (error) {
            console.error(`Error restoring ${table}:`, error);
            toast.error(`Error restoring ${table}: ${error.message}`);
            return;
          }
        }
      }
      toast.success("Data restored successfully!");
    } catch {
      toast.error("Failed to read backup file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage display preferences, reports, and data.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dark Mode</Label>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Font Size</Label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Font Style</Label>
            <Select value={fontStyle} onValueChange={setFontStyle}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Generate Reports</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive report of all health forms, records, and resident data.
          </p>
          <Button className="w-full gap-2" onClick={handleGenerateReport} disabled={generating}>
            <Download className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Full Report"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Backup & Recovery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Data Backup
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Restore from Backup
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
