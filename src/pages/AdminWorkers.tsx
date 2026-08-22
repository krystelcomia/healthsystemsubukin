import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Printer, Pencil, Trash2, UserCheck, UserX, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAssignedSitio, SUBUKIN_SITIOS, getDatabaseSitios } from "@/lib/sitioMapping";

import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";
import { OfficialHeader } from "@/components/OfficialHeader";
import { allowOnlyLetters, allowOnlyNumbers, sanitizeLetters, sanitizeNumbers } from "@/lib/inputValidation";

interface BHWWorker {
  id: string; name: string; age: number; address: string; gmail: string; number: string; is_online: boolean; last_seen: string | null; user_id: string | null; created_at: string; assigned_sitio?: string;
}

const AdminWorkers = () => {
  const { t } = useSettings();
  const [workers, setWorkers] = useState<BHWWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWorker, setEditWorker] = useState<BHWWorker | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewWorker, setViewWorker] = useState<BHWWorker | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: "", age: "", address: "", gmail: "", number: "", username: "", password: "", assigned_sitio: "" });

  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    getDatabaseSitios().then(sits => setSitioOptions(sits));
    const { data, error } = await (supabase.from as any)("bhw_workers").select("*").order("name");
    if (error) { toast.error("Failed to load workers"); return; }
    setWorkers(data || []); setLoading(false);
  };

  const handleAddWorker = async () => {
    if (!newWorker.name.trim()) { toast.error(t("workers.name") + " required"); return; }
    if (!newWorker.gmail.trim()) { toast.error(t("workers.gmail") + " required"); return; }
    if (!newWorker.username.trim()) { toast.error(t("workers.username") + " required"); return; }
    if (!newWorker.password || newWorker.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      const sitio = newWorker.assigned_sitio.trim() || getAssignedSitio(newWorker.name.trim());
      const { data, error } = await supabase.functions.invoke("create-bhw-account", {
        body: { name: newWorker.name.trim(), age: Number(newWorker.age) || 0, address: newWorker.address || sitio, gmail: newWorker.gmail.trim(), number: newWorker.number, username: newWorker.username.trim(), password: newWorker.password, assigned_sitio: sitio },
      });
      if (error) { toast.error("Failed to create worker account"); setSubmitting(false); return; }
      if (data?.error) { toast.error(data.error); setSubmitting(false); return; }
      toast.success("BHW worker account created!");
      setNewWorker({ name: "", age: "", address: "", gmail: "", number: "", username: "", password: "", assigned_sitio: "" });
      setDialogOpen(false); fetchWorkers();
    } catch { toast.error("Failed to create worker account"); }
    setSubmitting(false);
  };

  const handleEditWorker = async () => {
    if (!editWorker) return;
    const { error } = await (supabase.from as any)("bhw_workers").update({ name: editWorker.name, age: editWorker.age, address: editWorker.address, gmail: editWorker.gmail, number: editWorker.number, assigned_sitio: editWorker.assigned_sitio }).eq("id", editWorker.id);
    if (error) { toast.error("Failed to update worker"); return; }
    toast.success("Worker updated!"); setEditDialogOpen(false); setEditWorker(null); fetchWorkers();
  };

  const handleDeleteWorker = async (id: string) => {
    const { error } = await (supabase.from as any)("bhw_workers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete worker"); return; }
    toast.success("Worker deleted!"); setDeleteConfirmId(null); fetchWorkers();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return t("workers.never");
    return new Date(lastSeen).toLocaleString();
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #admin-workers-print-area, #admin-workers-print-area * { visibility: visible; }
          #admin-workers-print-area {
            position: absolute;
            left: 0;
            top: 0;
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
          .header-seal img { height: 75px !important; mix-blend-mode: multiply !important; }
          #admin-workers-print-area table td, #admin-workers-print-area table th { padding: 6px 10px !important; font-size: 11px !important; color: #000 !important; }
          @page { size: A4 portrait; margin: 6mm; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t("workers.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("workers.desc")}</p>
      </div>

      <div className="flex items-center justify-between no-print">
        <p className="text-sm text-muted-foreground">{workers.length} {t("workers.registered")}</p>
        <div className="flex gap-2">
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold h-8 text-xs shrink-0"
          >
            <Printer className="h-3.5 w-3.5" /> {t("common.print")}
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 h-8 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> {t("workers.addWorker")}</Button>
        </div>
      </div>

      <div id="admin-workers-print-area" className="space-y-6">
        {/* Printable Official Header Seal */}
        <div className="print-only w-full" style={{ display: "none", width: "100%" }}>
          <OfficialHeader
            title="Barangay Health Workers (BHW) Registry Directory"
            subtitle={`Barangay Subukin Health Center • Total Registered: ${workers.length}`}
            showDoubleBorder={true}
            logoHeight="75px"
          />
        </div>

        {/* Printable Table */}
        <div className="print-only" style={{ display: "none" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "center", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>#</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "left", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>Worker Name</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "left", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>Assigned Sitio</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "left", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>Email Address</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "left", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>Contact Number</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "center", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr key={w.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "center" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold" }}>{w.name}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px" }}>{w.assigned_sitio || getAssignedSitio(w.name) || "—"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px" }}>{w.gmail || "—"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px" }}>{w.number || "—"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px", textAlign: "center" }}>{w.is_online ? t("admin.dashboard.online") : t("admin.dashboard.offline")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "16px", textAlign: "right", fontSize: "10px", color: "#64748b" }}>
            Report Generated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Screen Cards List */}
        <div className="space-y-3 no-print">
          {loading ? (<p className="text-center text-muted-foreground py-8">{t("workers.loadingWorkers")}</p>
          ) : workers.length === 0 ? (<p className="text-center text-muted-foreground py-8">{t("workers.noWorkers")}</p>
          ) : workers.map((w) => (
            <Card key={w.id} className="border-border/50 shadow-sm">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <span className="text-sm font-semibold text-primary">{w.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${w.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{w.name}</p>
                      <Badge variant={w.is_online ? "default" : "secondary"} className="text-xs">
                        {w.is_online ? <><UserCheck className="h-3 w-3 mr-1" />{t("admin.dashboard.online")}</> : <><UserX className="h-3 w-3 mr-1" />{t("admin.dashboard.offline")}</>}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Assigned Sitio: <strong className="text-foreground">{w.assigned_sitio || getAssignedSitio(w.name) || "—"}</strong> · {w.gmail} · {w.number}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewWorker(w); setViewDialogOpen(true); }}><Eye className="h-4 w-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditWorker(w); setEditDialogOpen(true); }}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirmId(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Worker Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("workers.addNewWorker")}</DialogTitle><DialogDescription>{t("workers.addNewWorkerDesc")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>{t("workers.name")} *</Label><Input value={newWorker.name} onKeyDown={allowOnlyLetters} onChange={e => setNewWorker({ ...newWorker, name: sanitizeLetters(e.target.value) })} placeholder={t("workers.name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("workers.age")}</Label><Input type="number" value={newWorker.age} onKeyDown={allowOnlyNumbers} onChange={e => setNewWorker({ ...newWorker, age: sanitizeNumbers(e.target.value) })} /></div>
              <div className="space-y-1"><Label>{t("workers.contact")}</Label><Input value={newWorker.number} onKeyDown={allowOnlyNumbers} onChange={e => setNewWorker({ ...newWorker, number: sanitizeNumbers(e.target.value) })} placeholder="09xxxxxxxxx" /></div>
            </div>
            <div className="space-y-1"><Label>{t("workers.gmail")} *</Label><Input type="email" value={newWorker.gmail} onChange={e => setNewWorker({ ...newWorker, gmail: e.target.value })} placeholder="worker@gmail.com" /></div>
            <div className="space-y-1"><Label>{t("workers.username")} *</Label><Input value={newWorker.username} onChange={e => setNewWorker({ ...newWorker, username: e.target.value })} placeholder="worker_username" /></div>
            <div className="space-y-1"><Label>{t("workers.password")} *</Label><div className="relative"><Input type={showPassword ? "text" : "password"} value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} placeholder="Min 6 characters" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div>
            <div className="space-y-1">
              <Label>Assigned Sitio</Label>
              <Select value={newWorker.assigned_sitio} onValueChange={v => setNewWorker({ ...newWorker, assigned_sitio: v, address: v })}>
                <SelectTrigger><SelectValue placeholder="Select Sitio" /></SelectTrigger>
                <SelectContent>{sitioOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>{t("workers.address")}</Label><Input value={newWorker.address} onChange={e => setNewWorker({ ...newWorker, address: e.target.value })} placeholder={t("workers.address")} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleAddWorker} disabled={submitting}>{submitting ? t("workers.creating") : t("workers.addWorker")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Worker Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("workers.viewWorker")}</DialogTitle><DialogDescription>{t("workers.viewWorkerDesc")}</DialogDescription></DialogHeader>
          {viewWorker && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-lg font-bold text-primary">{viewWorker.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span></div>
                <div><p className="text-lg font-semibold text-foreground">{viewWorker.name}</p><Badge variant={viewWorker.is_online ? "default" : "secondary"} className="text-xs">{viewWorker.is_online ? t("admin.dashboard.online") : t("admin.dashboard.offline")}</Badge></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">{t("workers.age")}</p><p className="font-medium text-foreground">{viewWorker.age}</p></div>
                <div><p className="text-muted-foreground">{t("workers.contact")}</p><p className="font-medium text-foreground">{viewWorker.number || "—"}</p></div>
                <div><p className="text-muted-foreground">{t("workers.gmail")}</p><p className="font-medium text-foreground">{viewWorker.gmail || "—"}</p></div>
                <div><p className="text-muted-foreground">Assigned Sitio</p><p className="font-medium text-foreground">{viewWorker.assigned_sitio || getAssignedSitio(viewWorker.name) || "—"}</p></div>
                <div><p className="text-muted-foreground">{t("workers.lastSeen")}</p><p className="font-medium text-foreground">{formatLastSeen(viewWorker.last_seen)}</p></div>
                <div><p className="text-muted-foreground">{t("workers.account")}</p><p className="font-medium text-foreground">{viewWorker.user_id ? t("workers.linked") : t("workers.noAccount")}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>{t("common.close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("workers.editWorker")}</DialogTitle><DialogDescription>{t("workers.editWorkerDesc")}</DialogDescription></DialogHeader>
          {editWorker && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>{t("workers.name")} *</Label><Input value={editWorker.name} onKeyDown={allowOnlyLetters} onChange={e => setEditWorker({ ...editWorker, name: sanitizeLetters(e.target.value) })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("workers.age")}</Label><Input type="number" value={editWorker.age} onKeyDown={allowOnlyNumbers} onChange={e => setEditWorker({ ...editWorker, age: Number(sanitizeNumbers(String(e.target.value))) })} /></div>
                <div className="space-y-1"><Label>{t("workers.contact")}</Label><Input value={editWorker.number} onKeyDown={allowOnlyNumbers} onChange={e => setEditWorker({ ...editWorker, number: sanitizeNumbers(e.target.value) })} /></div>
              </div>
              <div className="space-y-1"><Label>{t("workers.gmail")}</Label><Input type="email" value={editWorker.gmail} onChange={e => setEditWorker({ ...editWorker, gmail: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Assigned Sitio</Label>
                <Select value={editWorker.assigned_sitio || ""} onValueChange={v => setEditWorker({ ...editWorker, assigned_sitio: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Sitio" /></SelectTrigger>
                  <SelectContent>{sitioOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={handleEditWorker}>{t("common.saveChanges")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("workers.deleteWorker")}</AlertDialogTitle><AlertDialogDescription>{t("workers.deleteWorkerDesc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirmId && handleDeleteWorker(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminWorkers;
