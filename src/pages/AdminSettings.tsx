import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">Generate reports and manage system settings.</p>
      </div>

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

export default AdminSettings;
