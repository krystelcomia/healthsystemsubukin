import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bug, Plus, Printer, Trash2, Edit, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";

interface FormState {
  id?: string;
  resident_id: string;
  household_name: string;
  container_type: string;
  has_larvae: boolean;
  action_plan: string;
  signature: string;
}

const DenguePreventionForm = () => {
  const { t } = useSettings();
  const [records, setRecords] = useState<any[]>([]);
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState>({
    resident_id: "",
    household_name: "",
    container_type: "",
    has_larvae: false,
    action_plan: "",
    signature: ""
  });

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dengue_prevention")
      .select("*, residents(full_name)")
      .order("created_at", { ascending: true });
    
    if (error) {
      toast.error("Failed to load records");
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    supabase
      .from("residents")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setResidents(data || []));
  }, []);

  const handleResidentChange = (value: string) => {
    if (value === "custom") {
      setForm(prev => ({ ...prev, resident_id: "", household_name: "" }));
      return;
    }
    const res = residents.find(r => r.id === value);
    setForm(prev => ({
      ...prev,
      resident_id: value,
      household_name: res ? res.full_name : ""
    }));
  };

  const handleOpenAdd = () => {
    setEditRecord(null);
    setForm({
      resident_id: "",
      household_name: "",
      container_type: "",
      has_larvae: false,
      action_plan: "",
      signature: ""
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (rec: any) => {
    setEditRecord(rec);
    setForm({
      resident_id: rec.resident_id || "",
      household_name: rec.household_name || "",
      container_type: rec.container_type || "",
      has_larvae: !!rec.has_larvae,
      action_plan: rec.action_plan || "",
      signature: rec.signature || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.household_name) {
      toast.error("Household name is required");
      return;
    }

    const payload = {
      resident_id: form.resident_id || null,
      household_name: form.household_name,
      container_type: form.container_type,
      has_larvae: form.has_larvae,
      action_plan: form.action_plan,
      signature: form.signature,
    };

    if (editRecord) {
      const { error } = await supabase
        .from("dengue_prevention")
        .update(payload)
        .eq("id", editRecord.id);

      if (error) {
        toast.error("Failed to update record");
        return;
      }
      logActivity("update_dengue", {
        entity_type: "dengue_prevention",
        description: `Updated Dengue prevention record (${form.container_type || "—"}) for resident: ${form.household_name}`
      });
      toast.success("Record updated successfully!");
    } else {
      const { error } = await supabase
        .from("dengue_prevention")
        .insert(payload);

      if (error) {
        toast.error("Failed to save record");
        return;
      }
      logActivity("submit_dengue", {
        entity_type: "dengue_prevention",
        description: `Saved Dengue prevention record (${form.container_type || "—"}) for resident: ${form.household_name}`
      });
      toast.success("Record saved successfully!");
    }

    setDialogOpen(false);
    fetchRecords();
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase
      .from("dengue_prevention")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete record");
    } else {
      logActivity("delete_dengue", {
        entity_type: "dengue_prevention",
        description: `Deleted Dengue prevention record for resident: ${name}`
      });
      toast.success("Record deleted successfully!");
      fetchRecords();
    }
  };

  const handleDeleteAll = async () => {
    const { error } = await supabase
      .from("dengue_prevention")
      .delete()
      .neq("id", "0");

    if (error) {
      toast.error("Failed to clear entries");
    } else {
      logActivity("delete_all_dengue", {
        entity_type: "dengue_prevention",
        description: "Cleared all entries in the Dengue prevention form"
      });
      toast.success("All entries cleared successfully!");
      setDeleteConfirmOpen(false);
      fetchRecords();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine minimum rows to draw for a professional templates sheet look
  const minRows = 15;
  const emptyRowsCount = Math.max(0, minRows - records.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  return (
    <div className="w-full space-y-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        .font-script {
          font-family: 'Great Vibes', cursive;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #dengue-print-area, #dengue-print-area * {
            visibility: visible !important;
          }
          #dengue-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Toolbar - Hidden in Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print bg-sidebar text-sidebar-foreground p-4 rounded-xl border border-sidebar-border shadow-sm">
        <div>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            {t("dengue.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("dengue.desc")}</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
          {records.length > 0 && (
            <Button onClick={() => setDeleteConfirmOpen(true)} size="sm" variant="destructive" className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete All
            </Button>
          )}
          <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 bg-background">
            <Printer className="h-4 w-4" /> Print Form
          </Button>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <Card id="dengue-print-area" className="border border-border/50 shadow-md bg-white text-slate-900 overflow-hidden">
        <CardContent className="p-8 space-y-6">
          
          {/* Header Seal Layout */}
          <div className="flex items-center justify-between border-b-[4px] border-double border-slate-900 pb-4">
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0" />
            
            <div className="text-center space-y-0.5">
              <p className="text-[10px] md:text-xs font-serif uppercase tracking-wider text-slate-600">Republika ng Pilipinas</p>
              <p className="text-[10px] md:text-xs font-serif uppercase tracking-wider text-slate-600">Lalawigan ng Batangas</p>
              <p className="text-[10px] md:text-xs font-serif uppercase tracking-wider text-slate-600">Munisipalidad ng San Juan</p>
              <h2 className="text-2xl font-script text-red-600 font-medium tracking-wide mt-1 leading-none font-script">
                Barangay Subukin
              </h2>
            </div>

            <img src={barangayLogo} alt="Subukin Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0" />
          </div>

          {/* Form Action Sheet Title */}
          <div className="text-center space-y-1 py-2">
            <h1 className="text-xl md:text-2xl font-sans font-bold tracking-widest text-slate-800">
              SEARCH AND DESTROY 2025
            </h1>
            <p className="font-serif italic text-xs md:text-sm text-slate-500 font-script tracking-wide">
              &ldquo;Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue&rdquo;
            </p>
          </div>

          {/* Records/Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-left text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[25%]" rowSpan={2}>
                    PANGALAN NG MAYBAHAY
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[30%]" rowSpan={2}>
                    URI NG LALAGYAN O TIRAHAN NG LAMOK
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-1.5 font-bold text-center text-slate-700 w-[15%]" colSpan={2}>
                    KITI-KITI
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[20%]" rowSpan={2}>
                    ACTION PLAN/DAPAT NA GAWIN
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[10%]" rowSpan={2}>
                    LAGDA
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[8%] no-print" rowSpan={2}>
                    MGA HAKBANG
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50/50 p-1 text-[10px] font-bold text-center text-slate-600">
                    MERON
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-1 text-[10px] font-bold text-center text-slate-600">
                    WALA
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="border border-slate-400 p-2 font-medium">
                      {rec.household_name}
                    </td>
                    <td className="border border-slate-400 p-2">
                      {rec.container_type || "—"}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-green-600 font-bold">
                      {rec.has_larvae ? "✓" : ""}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-slate-400">
                      {!rec.has_larvae ? "✓" : ""}
                    </td>
                    <td className="border border-slate-400 p-2">
                      {rec.action_plan || "—"}
                    </td>
                    <td className="border border-slate-400 p-2 font-mono text-[10px] text-center">
                      {rec.signature || "—"}
                    </td>
                    <td className="border border-slate-400 p-2 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          onClick={() => handleOpenEdit(rec)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-primary hover:text-primary-foreground hover:bg-primary"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(rec.id, rec.household_name)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Pad Table with Empty Rows to Match Template Grid */}
                {emptyRows.map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-10">
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2">&nbsp;</td>
                    <td className="border border-slate-400 p-2 no-print">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>

      {/* Add / Edit Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading font-bold">
                {editRecord ? "Edit Record" : "Add Inspection Record"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Piliin ang Maybahay (Resident) *</Label>
                <Select 
                  value={form.resident_id || (form.household_name ? "custom" : "")} 
                  onValueChange={handleResidentChange}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select from Masterlist" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="custom" className="font-semibold text-primary">-- Custom / Other Name --</SelectItem>
                    {residents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pangalan ng Maybahay (Household Head Name) *</Label>
                <Input 
                  value={form.household_name} 
                  onChange={(e) => setForm(prev => ({ ...prev, household_name: e.target.value }))}
                  placeholder="Enter name"
                  required
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Uri ng Lalagyan o Tirahan ng Lamok (Container Type)</Label>
                <Input 
                  value={form.container_type} 
                  onChange={(e) => setForm(prev => ({ ...prev, container_type: e.target.value }))}
                  placeholder="e.g. Gulong, Plorera, Bote"
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold block mb-1">Kiti-kiti (Larvae Presence)</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="has_larvae" 
                      checked={form.has_larvae === true} 
                      onChange={() => setForm(prev => ({ ...prev, has_larvae: true }))}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    Meron (Present)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="has_larvae" 
                      checked={form.has_larvae === false} 
                      onChange={() => setForm(prev => ({ ...prev, has_larvae: false }))}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    Wala (None)
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Action Plan / Dapat na Gawin</Label>
                <Textarea 
                  value={form.action_plan} 
                  onChange={(e) => setForm(prev => ({ ...prev, action_plan: e.target.value }))}
                  placeholder="Describe treatment or clean-up actions"
                  rows={2}
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Lagda (Signature / Initials)</Label>
                <Input 
                  value={form.signature} 
                  onChange={(e) => setForm(prev => ({ ...prev, signature: e.target.value }))}
                  placeholder="Enter BHW Initials/Name"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editRecord ? "Save Changes" : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-destructive">
              Clear All Entries?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-500">
            This will permanently delete all records in the Dengue Prevention form checklist. This action cannot be undone.
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenguePreventionForm;
