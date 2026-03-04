import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FamilyPlanningRecord {
  id: string;
  resident_id: string | null;
  method: string | null;
  start_date: string | null;
  remarks: string | null;
  created_at: string;
  residents?: { full_name: string } | null;
}

const METHODS = [
  "Pills", "IUD", "Injectable", "Condom", "Implant",
  "Natural Family Planning", "Lactational Amenorrhea", "Sterilization", "Other"
];

const FamilyPlanningForm = () => {
  const [records, setRecords] = useState<FamilyPlanningRecord[]>([]);
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<FamilyPlanningRecord | null>(null);

  const [form, setForm] = useState({ resident_id: "", method: "", start_date: "", remarks: "" });

  const fetchData = async () => {
    const [{ data: recs }, { data: res }] = await Promise.all([
      supabase.from("family_planning").select("*, residents(full_name)").order("created_at", { ascending: false }),
      supabase.from("residents").select("id, full_name").order("full_name"),
    ]);
    setRecords((recs as any) || []);
    setResidents(res || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingRecord(null);
    setForm({ resident_id: "", method: "", start_date: "", remarks: "" });
    setDialogOpen(true);
  };

  const openEdit = (rec: FamilyPlanningRecord) => {
    setEditingRecord(rec);
    setForm({
      resident_id: rec.resident_id || "",
      method: rec.method || "",
      start_date: rec.start_date || "",
      remarks: rec.remarks || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.resident_id) { toast.error("Pumili ng residente."); return; }

    const payload = {
      resident_id: form.resident_id,
      method: form.method || null,
      start_date: form.start_date || null,
      remarks: form.remarks || null,
    };

    if (editingRecord) {
      const { error } = await supabase.from("family_planning").update(payload).eq("id", editingRecord.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Na-update na ang record.");
    } else {
      const { error } = await supabase.from("family_planning").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Na-save na ang record.");
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("family_planning").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Na-delete na ang record.");
    setDeleteId(null);
    fetchData();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Family Planning
          </h1>
          <p className="text-muted-foreground mt-1">Mga record ng family planning methods.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Bagong Record</Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Records</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : records.length === 0 ? (
            <p className="text-muted-foreground text-sm">Walang record pa.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Residente</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.residents?.full_name || "—"}</TableCell>
                      <TableCell>{rec.method || "—"}</TableCell>
                      <TableCell>{rec.start_date || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{rec.remarks || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(rec)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? "I-edit ang Record" : "Bagong Family Planning Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Residente</Label>
              <Select value={form.resident_id} onValueChange={(v) => setForm({ ...form, resident_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pumili ng residente" /></SelectTrigger>
                <SelectContent>
                  {residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue placeholder="Pumili ng method" /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Karagdagang detalye..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingRecord ? "I-update" : "I-save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>I-delete ang record?</AlertDialogTitle>
            <AlertDialogDescription>Hindi na ito maibabalik kapag na-delete.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilyPlanningForm;
