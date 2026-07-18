import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bug, Plus, Printer, Trash2, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";

const DenguePreventionForm = () => {
  const { t } = useSettings();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dengue_prevention")
      .select("*")
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
  }, []);

  const handleCellBlur = async (id: string, field: string, value: any) => {
    const record = records.find(r => r.id === id);
    if (!record || record[field] === value) return;

    const { error } = await supabase
      .from("dengue_prevention")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
      logActivity("update_dengue", {
        entity_type: "dengue_prevention",
        description: `Updated ${field.replace('_', ' ')} for Dengue checklist row`
      });
    }
  };

  const handleToggleLarvae = async (id: string, hasLarvae: boolean) => {
    const record = records.find(r => r.id === id);
    if (!record || record.has_larvae === hasLarvae) return;

    const { error } = await supabase
      .from("dengue_prevention")
      .update({ has_larvae: hasLarvae })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save larvae status");
    } else {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, has_larvae: hasLarvae } : r));
      logActivity("update_dengue", {
        entity_type: "dengue_prevention",
        description: `Set larvae status to ${hasLarvae ? "Meron" : "Wala"} in Dengue prevention form`
      });
    }
  };

  const handleAddRow = async () => {
    const newRow = {
      resident_id: null,
      household_name: "",
      container_type: "",
      has_larvae: false,
      action_plan: "",
      signature: ""
    };

    const { data, error } = await supabase
      .from("dengue_prevention")
      .insert(newRow)
      .select()
      .single();

    if (error) {
      toast.error("Failed to add new row");
    } else {
      setRecords(prev => [...prev, data]);
      logActivity("submit_dengue", {
        entity_type: "dengue_prevention",
        description: "Added a new blank record row in Dengue prevention checklist"
      });
    }
  };

  const handleDeleteRow = async (id: string, name: string) => {
    const displayName = name.trim() || "unnamed row";
    const { error } = await supabase
      .from("dengue_prevention")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete row");
    } else {
      logActivity("delete_dengue", {
        entity_type: "dengue_prevention",
        description: `Deleted Dengue prevention record row for: ${displayName}`
      });
      toast.success("Row deleted successfully");
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

  // Pad table with empty static rows to reach a minimum layout size
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
        .cell-input {
          width: 100%;
          height: 100%;
          background-color: transparent;
          border: none;
          outline: none;
          padding: 6px 8px;
          transition: background-color 0.2s;
        }
        .cell-input:hover {
          background-color: rgba(13, 148, 136, 0.05);
        }
        .cell-input:focus {
          background-color: rgba(13, 148, 136, 0.1);
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
          .cell-input {
            border: none !important;
            box-shadow: none !important;
            background-color: transparent !important;
            padding: 0 !important;
          }
          .cell-input::placeholder {
            color: transparent !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>



      {/* Printable Sheet Canvas */}
      <Card id="dengue-print-area" className="border border-border/50 shadow-md bg-white text-slate-900 overflow-hidden">
        <CardContent className="p-8 space-y-6">
          


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
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[28%]" rowSpan={2}>
                    PANGALAN NG MAYBAHAY
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[28%]" rowSpan={2}>
                    URI NG LALAGYAN O TIRAHAN NG LAMOK
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-1.5 font-bold text-center text-slate-700 w-[14%]" colSpan={2}>
                    KITI-KITI
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[20%]" rowSpan={2}>
                    ACTION PLAN/DAPAT NA GAWIN
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[10%]" rowSpan={2}>
                    LAGDA
                  </th>
                  <th className="border border-slate-400 bg-slate-50/50 p-2 font-bold text-center text-slate-700 w-[5%] no-print" rowSpan={2}>
                    
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
                    {/* Household Name */}
                    <td className="border border-slate-400 p-0 font-medium">
                      <input
                        type="text"
                        value={rec.household_name || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, household_name: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "household_name", e.target.value)}
                        className="cell-input"
                        placeholder="Click to type name..."
                      />
                    </td>
                    
                    {/* Container Type */}
                    <td className="border border-slate-400 p-0">
                      <input
                        type="text"
                        value={rec.container_type || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, container_type: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "container_type", e.target.value)}
                        className="cell-input"
                        placeholder="Gulong, plorera, etc..."
                      />
                    </td>
                    
                    {/* Larvae: MERON */}
                    <td 
                      onClick={() => handleToggleLarvae(rec.id, true)}
                      className="border border-slate-400 p-0 text-center text-base text-teal-600 font-bold cursor-pointer hover:bg-slate-50 select-none w-7 h-10"
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        {rec.has_larvae ? "✓" : ""}
                      </div>
                    </td>
                    
                    {/* Larvae: WALA */}
                    <td 
                      onClick={() => handleToggleLarvae(rec.id, false)}
                      className="border border-slate-400 p-0 text-center text-base text-slate-500 font-bold cursor-pointer hover:bg-slate-50 select-none w-7 h-10"
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        {!rec.has_larvae ? "✓" : ""}
                      </div>
                    </td>
                    
                    {/* Action Plan */}
                    <td className="border border-slate-400 p-0">
                      <input
                        type="text"
                        value={rec.action_plan || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, action_plan: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "action_plan", e.target.value)}
                        className="cell-input"
                        placeholder="Action..."
                      />
                    </td>
                    
                    {/* Signature */}
                    <td className="border border-slate-400 p-0">
                      <input
                        type="text"
                        value={rec.signature || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, signature: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "signature", e.target.value)}
                        className="cell-input text-center font-mono text-xs"
                        placeholder="Lagda..."
                      />
                    </td>
                    
                    {/* Simple Trash Icon delete button */}
                    <td className="border border-slate-400 p-1 text-center no-print w-10">
                      <Button 
                        onClick={() => handleDeleteRow(rec.id, rec.household_name)} 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash className="h-4.5 w-4.5" />
                      </Button>
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

          {/* Simple controls row below the table */}
          <div className="flex items-center justify-end gap-2 mt-4 no-print">
            <Button onClick={handleAddRow} size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm">
              <Plus className="h-4 w-4" /> Add Row
            </Button>
            {records.length > 0 && (
              <Button onClick={() => setDeleteConfirmOpen(true)} size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30">
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            )}
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1 bg-background border-border/60 text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>

        </CardContent>
      </Card>

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
