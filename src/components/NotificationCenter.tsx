import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Calendar,
  Megaphone,
  CheckCircle2,
  Send,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldAlert,
  Activity,
  HeartPulse,
  Users
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, AppNotification, NotificationCategory, NotificationPriority } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    sendNotification,
    refreshNotifications
  } = useNotifications();

  const { userRole, username, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"all" | "health_alert" | "calendar" | "announcement">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  // Form states for broadcasting announcement
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState<NotificationCategory>("announcement");
  const [newPriority, setNewPriority] = useState<NotificationPriority>("medium");
  const [newLink, setNewLink] = useState("");

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    return n.category === activeTab;
  });

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    sendNotification({
      title: newTitle.trim(),
      message: newMessage.trim(),
      category: newCategory,
      priority: newPriority,
      link: newLink.trim() || undefined,
      actionLabel: newLink.trim() ? "Open Linked Page" : undefined,
      senderName: username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Health Center Staff",
      senderRole: userRole === "supervisor" ? "Barangay Health Supervisor" : "Barangay Health Worker"
    });

    setNewTitle("");
    setNewMessage("");
    setNewCategory("announcement");
    setNewPriority("medium");
    setNewLink("");
    setCreateDialogOpen(false);
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  const getCategoryIcon = (category: NotificationCategory, priority: NotificationPriority) => {
    switch (category) {
      case "health_alert":
        return <AlertTriangle className={`h-4 w-4 ${priority === "high" ? "text-red-500" : "text-amber-500"}`} />;
      case "calendar":
        return <Calendar className="h-4 w-4 text-sky-500" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-primary" />;
      case "attendance":
        return <Users className="h-4 w-4 text-amber-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <>
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all shrink-0"
            title="Notifications & Health Alerts"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-background animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[90vw] sm:w-[420px] p-0 shadow-2xl border border-border/60 bg-card rounded-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Notification Header */}
          <div className="p-4 bg-muted/40 border-b border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-heading font-bold text-sm text-foreground">Notifications</h4>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Barangay Subukin health alerts & updates</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => refreshNotifications()}
                disabled={loading}
                title="Refresh notifications"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2 gap-1 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 font-semibold"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-3 w-3" /> Broadcast
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2.5 bg-background border-b border-border/30">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-4 h-7 p-0.5 bg-muted/60 text-[11px]">
                <TabsTrigger value="all" className="text-[11px] py-1">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="health_alert" className="text-[11px] py-1">
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-[11px] py-1">
                  Events
                </TabsTrigger>
                <TabsTrigger value="announcement" className="text-[11px] py-1">
                  Notices
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/30 bg-background">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
                <div className="h-10 w-10 rounded-full bg-muted/50 text-muted-foreground/60 flex items-center justify-center mx-auto">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-foreground">No notifications in this view</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  You are all caught up! New clinical alerts, dengue warnings, and calendar updates will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isHigh = notif.priority === "high";
                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-all text-xs flex items-start gap-3 relative group ${
                      notif.read ? "bg-background opacity-85 hover:opacity-100" : "bg-primary/[0.04] font-medium"
                    } hover:bg-muted/40`}
                  >
                    {/* Priority Accent Stripe */}
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.category === "health_alert"
                          ? isHigh
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : notif.category === "calendar"
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {getCategoryIcon(notif.category, notif.priority)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h5 className={`text-xs font-bold leading-tight ${notif.read ? "text-foreground" : "text-foreground font-extrabold"}`}>
                          {notif.title}
                        </h5>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.senderName && (
                        <p className="text-[10px] text-primary/80 font-semibold flex items-center gap-1">
                          <span>From: {notif.senderName}</span>
                          {notif.senderRole && <span className="text-muted-foreground">({notif.senderRole})</span>}
                        </p>
                      )}

                      {/* Action Links */}
                      {notif.link && (
                        <div className="pt-1">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-1"
                            onClick={() => {
                              markAsRead(notif.id);
                              setOpenPopover(false);
                              if (notif.link) navigate(notif.link);
                            }}
                          >
                            {notif.actionLabel || "View Details"}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => markAsRead(notif.id)}
                          title="Mark as read"
                        >
                          <CheckCheck className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(notif.id)}
                        title="Remove notification"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {!notif.read && (
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer toolbar */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-muted/30 border-t border-border/40 flex items-center justify-between text-[11px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground hover:text-destructive gap-1 px-2"
                onClick={clearAll}
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Broadcast Announcement / Alert Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2 text-foreground">
              <Megaphone className="h-5 w-5 text-primary" />
              Broadcast Notification or Health Alert
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Broadcast official health updates, clinic announcements, or urgent reminders to health staff and supervisor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBroadcast} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notification Title *</Label>
              <Input
                placeholder="e.g. Dengue Cleanup Drive / Vital Supplies Restocked"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement" className="text-xs">Announcement / Notice</SelectItem>
                    <SelectItem value="health_alert" className="text-xs">Health / Clinical Alert</SelectItem>
                    <SelectItem value="calendar" className="text-xs">Calendar Event</SelectItem>
                    <SelectItem value="system" className="text-xs">System Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority Level</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-xs">Low (Info)</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium (Standard)</SelectItem>
                    <SelectItem value="high" className="text-xs">High (Urgent Alert)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message Body *</Label>
              <Textarea
                placeholder="Enter detailed notice or action items for health workers..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Action Destination Link (Optional)</Label>
              <Select value={newLink} onValueChange={setNewLink}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select target form / page..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/calendar" className="text-xs">Calendar (/calendar)</SelectItem>
                  <SelectItem value="/forms/dengue-prevention" className="text-xs">Dengue Prevention (/forms/dengue-prevention)</SelectItem>
                  <SelectItem value="/forms/consultation" className="text-xs">Consultations (/forms/consultation)</SelectItem>
                  <SelectItem value="/forms/philpen-health" className="text-xs">PhilPen Health (/forms/philpen-health)</SelectItem>
                  <SelectItem value="/forms/maternal-care" className="text-xs">Maternal Care (/forms/maternal-care)</SelectItem>
                  <SelectItem value="/forms/child-health" className="text-xs">Child Health (/forms/child-health)</SelectItem>
                  <SelectItem value="/forms/family-planning" className="text-xs">Family Planning (/forms/family-planning)</SelectItem>
                  <SelectItem value="/residents" className="text-xs">Resident Records (/residents)</SelectItem>
                  <SelectItem value="/settings/backup" className="text-xs">Backup & Recovery (/settings/backup)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5">
                <Send className="h-3.5 w-3.5" /> Broadcast to System
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
