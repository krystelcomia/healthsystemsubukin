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

interface BHWWorker {
  id: string; name: string; age: number; address: string; gmail: string; number: string; is_online: boolean; last_seen: string | null; user_id: string | null; created_at: string;
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
  const [newWorker, setNewWorker] = useState({ name: "", age: "", address: "", gmail: "", number: "", username: "", password: "" });

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
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
      const { data, error } = await supabase.functions.invoke("create-bhw-account", {
        body: { name: newWorker.name.trim(), age: Number(newWorker.age) || 0, address: newWorker.address, gmail: newWorker.gmail.trim(), number: newWorker.number, username: newWorker.username.trim(), password: newWorker.password },
      });
      if (error) { toast.error("Failed to create worker account"); setSubmitting(false); return; }
      if (data?.error) { toast.error(data.error); setSubmitting(false); return; }
      toast.success("BHW worker account created!");
      setNewWorker({ name: "", age: "", address: "", gmail: "", number: "", username: "", password: "" });
      setDialogOpen(false); fetchWorkers();
    } catch { toast.error("Failed to create worker account"); }
    setSubmitting(false);
  };

  const handleEditWorker = async () => {
    if (!editWorker) return;
    const { error } = await (supabase.from as any)("bhw_workers").update({ name: editWorker.name, age: editWorker.age, address: editWorker.address, gmail: editWorker.gmail, number: editWorker.number }).eq("id", editWorker.id);
    if (error) { toast.error("Failed to update worker"); return; }
    toast.success("Worker updated!"); setEditDialogOpen(false); setEditWorker(null); fetchWorkers();
  };

  const handleDeleteWorker = async (id: string) => {
    const { error } = await (supabase.from as any)("bhw_workers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete worker"); return; }
    toast.success("Worker deleted!"); setDeleteConfirmId(null); fetchWorkers();
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${t("workers.title")}</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; } .header h1 { font-size: 20px; color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; } th, td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; font-size: 12px; } th { background: #f0fdfa; color: #0d9488; font-weight: 600; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-top: 20px; }</style></head><body>
      <div class="header"><h1>Barangay Health System</h1><p>${t("workers.title")}</p></div>
      <table><thead><tr><th>#</th><th>${t("workers.name")}</th><th>${t("workers.age")}</th><th>${t("workers.address")}</th><th>${t("workers.gmail")}</th><th>${t("workers.contact")}</th><th>${t("admin.residents.status")}</th></tr></thead><tbody>`);
    workers.forEach((w, i) => { win.document.write(`<tr><td>${i + 1}</td><td>${w.name}</td><td>${w.age}</td><td>${w.address}</td><td>${w.gmail}</td><td>${w.number}</td><td>${w.is_online ? t("admin.dashboard.online") : t("admin.dashboard.offline")}</td></tr>`); });
    win.document.write(`</tbody></table><p style="margin-top:12px;font-size:12px;color:#666;">${t("common.total")}: ${workers.length}</p>`);
    win.document.write(`<p class="print-date">${new Date().toLocaleString()}</p></body></html>`);
    win.document.close(); win.print();
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return t("workers.never");
    return new Date(lastSeen).toLocaleString();
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t("workers.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("workers.desc")}</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{workers.length} {t("workers.registered")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> {t("common.print")}</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> {t("workers.addWorker")}</Button>
        </div>
      </div>

      <div className="space-y-3">
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
                  <p className="text-sm text-muted-foreground">{t("workers.age")} {w.age} · {w.address} · {w.gmail} · {w.number}</p>
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

      {/* Add Worker Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("workers.addNewWorker")}</DialogTitle><DialogDescription>{t("workers.addNewWorkerDesc")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>{t("workers.name")} *</Label><Input value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} placeholder={t("workers.name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("workers.age")}</Label><Input type="number" value={newWorker.age} onChange={e => setNewWorker({ ...newWorker, age: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("workers.contact")}</Label><Input value={newWorker.number} onChange={e => setNewWorker({ ...newWorker, number: e.target.value })} placeholder="09xxxxxxxxx" /></div>
            </div>
            <div className="space-y-1"><Label>{t("workers.gmail")} *</Label><Input type="email" value={newWorker.gmail} onChange={e => setNewWorker({ ...newWorker, gmail: e.target.value })} placeholder="worker@gmail.com" /></div>
            <div className="space-y-1"><Label>{t("workers.username")} *</Label><Input value={newWorker.username} onChange={e => setNewWorker({ ...newWorker, username: e.target.value })} placeholder="worker_username" /></div>
            <div className="space-y-1"><Label>{t("workers.password")} *</Label><div className="relative"><Input type={showPassword ? "text" : "password"} value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} placeholder="Min 6 characters" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div>
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
                <div><p className="text-muted-foreground">{t("workers.address")}</p><p className="font-medium text-foreground">{viewWorker.address || "—"}</p></div>
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
              <div className="space-y-1"><Label>{t("workers.name")} *</Label><Input value={editWorker.name} onChange={e => setEditWorker({ ...editWorker, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t("workers.age")}</Label><Input type="number" value={editWorker.age} onChange={e => setEditWorker({ ...editWorker, age: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>{t("workers.contact")}</Label><Input value={editWorker.number} onChange={e => setEditWorker({ ...editWorker, number: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>{t("workers.gmail")}</Label><Input type="email" value={editWorker.gmail} onChange={e => setEditWorker({ ...editWorker, gmail: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("workers.address")}</Label><Input value={editWorker.address} onChange={e => setEditWorker({ ...editWorker, address: e.target.value })} /></div>
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
