import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, Printer, Eye, MapPin, Filter, Sparkles, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import { syncFamilyDataToResidents } from "@/lib/residentLinker";
import barangayLogo from "@/assets/barangay-logo.png";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import headerTextImg from "@/assets/header_text.png";
import { OfficialHeader } from "@/components/OfficialHeader";

interface Resident {
  id: string; full_name: string; gender: string; age: number; status: string; sitio: string; birthday: string | null; family_number?: string | null; created_at: string;
}

interface HealthRecords {
  consultations: any[]; family_data: any[]; philpen_health: any[]; dengue_prevention: any[]; maternal_care: any[]; child_health: any[]; family_planning: any[]; custom_forms: any[];
}

const SITIO_COLOR_PALETTES: Record<string, {
  border: string;
  headerBg: string;
  accentBar: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  badge: string;
}> = {
  "Cama": {
    border: "border-emerald-500/30 dark:border-emerald-500/20",
    headerBg: "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent",
    accentBar: "border-l-4 border-l-emerald-500",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  "Makalintal 1": {
    border: "border-blue-500/30 dark:border-blue-500/20",
    headerBg: "bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent",
    accentBar: "border-l-4 border-l-blue-500",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  "Makalintal 2": {
    border: "border-cyan-500/30 dark:border-cyan-500/20",
    headerBg: "bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent",
    accentBar: "border-l-4 border-l-cyan-500",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    titleColor: "text-cyan-700 dark:text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  },
  "Maligaya": {
    border: "border-amber-500/30 dark:border-amber-500/20",
    headerBg: "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent",
    accentBar: "border-l-4 border-l-amber-500",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  "Manggahan 1": {
    border: "border-purple-500/30 dark:border-purple-500/20",
    headerBg: "bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent",
    accentBar: "border-l-4 border-l-purple-500",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    titleColor: "text-purple-700 dark:text-purple-300",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  "Manggahan 2": {
    border: "border-indigo-500/30 dark:border-indigo-500/20",
    headerBg: "bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent",
    accentBar: "border-l-4 border-l-indigo-500",
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    titleColor: "text-indigo-700 dark:text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  "Masaya": {
    border: "border-rose-500/30 dark:border-rose-500/20",
    headerBg: "bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent",
    accentBar: "border-l-4 border-l-rose-500",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    titleColor: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  "Masigla": {
    border: "border-orange-500/30 dark:border-orange-500/20",
    headerBg: "bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent",
    accentBar: "border-l-4 border-l-orange-500",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    titleColor: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  },
  "Matahimik / Burol": {
    border: "border-teal-500/30 dark:border-teal-500/20",
    headerBg: "bg-gradient-to-r from-teal-500/15 via-teal-500/5 to-transparent",
    accentBar: "border-l-4 border-l-teal-500",
    iconBg: "bg-teal-500/20",
    iconColor: "text-teal-600 dark:text-teal-400",
    titleColor: "text-teal-700 dark:text-teal-300",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  },
  "Matahimik / Punta": {
    border: "border-sky-500/30 dark:border-sky-500/20",
    headerBg: "bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-transparent",
    accentBar: "border-l-4 border-l-sky-500",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
    titleColor: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  "Puntor": {
    border: "border-pink-500/30 dark:border-pink-500/20",
    headerBg: "bg-gradient-to-r from-pink-500/15 via-pink-500/5 to-transparent",
    accentBar: "border-l-4 border-l-pink-500",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-600 dark:text-pink-400",
    titleColor: "text-pink-700 dark:text-pink-300",
    badge: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
  },
  "Subukin Main": {
    border: "border-emerald-600/30 dark:border-emerald-600/20",
    headerBg: "bg-gradient-to-r from-emerald-600/15 via-emerald-600/5 to-transparent",
    accentBar: "border-l-4 border-l-emerald-600",
    iconBg: "bg-emerald-600/20",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    titleColor: "text-emerald-800 dark:text-emerald-200",
    badge: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/30",
  }
};

const DEFAULT_PALETTES = [
  SITIO_COLOR_PALETTES["Cama"],
  SITIO_COLOR_PALETTES["Makalintal 1"],
  SITIO_COLOR_PALETTES["Makalintal 2"],
  SITIO_COLOR_PALETTES["Maligaya"],
  SITIO_COLOR_PALETTES["Manggahan 1"],
  SITIO_COLOR_PALETTES["Manggahan 2"],
  SITIO_COLOR_PALETTES["Masaya"],
  SITIO_COLOR_PALETTES["Masigla"],
  SITIO_COLOR_PALETTES["Matahimik / Burol"],
  SITIO_COLOR_PALETTES["Matahimik / Punta"],
  SITIO_COLOR_PALETTES["Puntor"],
];

const getSitioStyle = (sitioName: string) => {
  if (SITIO_COLOR_PALETTES[sitioName]) {
    return SITIO_COLOR_PALETTES[sitioName];
  }
  let hash = 0;
  for (let i = 0; i < sitioName.length; i++) {
    hash = (hash << 5) - hash + sitioName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_PALETTES.length;
  return DEFAULT_PALETTES[index];
};

const AdminResidents = () => {
  const { t, language } = useSettings();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSitio, setSelectedSitio] = useState("all");
  const [sitios, setSitios] = useState<string[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecords | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { 
    fetchResidents(); 
    const handleUpdate = () => fetchResidents();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("bhw-db-updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("bhw-db-updated", handleUpdate);
    };
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    const familyNamesSet = await syncFamilyDataToResidents();
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) { toast.error("Failed to load residents"); setLoading(false); return; }

    // Resident records are strictly limited to those included in family data (regardless of placement)
    const rawFamilyOnly = (data || []).filter(r => 
      r.full_name && familyNamesSet.has(r.full_name.trim().toLowerCase())
    );

    const seenNames = new Set<string>();
    const familyOnlyResidents: Resident[] = [];
    for (const r of rawFamilyOnly) {
      const key = r.full_name.trim().toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        familyOnlyResidents.push(r);
      }
    }

    setResidents(familyOnlyResidents);
    const dbSitios = Array.from(new Set(familyOnlyResidents.map(r => r.sitio).filter(s => Boolean(s) && s !== "Centro" && s !== "Sitio Centro"))).sort() as string[];
    const uniqueSitios = dbSitios.length > 0 ? dbSitios : SUBUKIN_SITIOS;
    setSitios(uniqueSitios);
    setLoading(false);
  };

  const fetchHealthRecords = async (resident: Resident) => {
    const residentId = resident.id;
    const cleanName = (resident.full_name || "").trim().toLowerCase();
    const famNum = (resident.family_number || "").trim();

    const [cRes, fRes, pRes, dRes, mRes, chRes, fpRes] = await Promise.all([
      supabase.from("consultations").select("*").order("created_at", { ascending: false }),
      supabase.from("family_data").select("*").order("created_at", { ascending: false }),
      supabase.from("philpen_health").select("*").order("created_at", { ascending: false }),
      supabase.from("dengue_prevention").select("*").order("created_at", { ascending: false }),
      supabase.from("maternal_care" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("child_health" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("family_planning").select("*").order("created_at", { ascending: false }),
    ]);

    const consultations = (cRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.full_name && rec.full_name.trim().toLowerCase() === cleanName)
    );

    const familyData = (fRes.data || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      if (famNum && rec.family_number && rec.family_number.trim() === famNum) return true;
      if (cleanName) {
        if (rec.father_name && rec.father_name.trim().toLowerCase() === cleanName) return true;
        if (rec.mother_name && rec.mother_name.trim().toLowerCase() === cleanName) return true;
        let members: any[] = [];
        if (Array.isArray(rec.members_detail)) members = rec.members_detail;
        else if (typeof rec.members_detail === "string") {
          try { members = JSON.parse(rec.members_detail); } catch (e) {}
        }
        if (members.some((m: any) => m.full_name && m.full_name.trim().toLowerCase() === cleanName)) return true;
      }
      return false;
    });

    const philpenHealth = (pRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.full_name && rec.full_name.trim().toLowerCase() === cleanName)
    );

    const denguePrevention = (dRes.data || []).filter((rec: any) => 
      rec.resident_id === residentId || (cleanName && rec.household_name && rec.household_name.trim().toLowerCase() === cleanName)
    );

    const maternalCare = ((mRes.data as any[]) || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      const full = (rec.patient_name || `${rec.patient_first_name || ""} ${rec.patient_last_name || ""}`).trim().toLowerCase();
      return cleanName && full && full === cleanName;
    });

    const childHealth = ((chRes.data as any[]) || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      const full = (rec.child_name || `${rec.first_name || ""} ${rec.surname || ""}`).trim().toLowerCase();
      return cleanName && full && full === cleanName;
    });

    const familyPlanning = (fpRes.data || []).filter((rec: any) => {
      if (rec.resident_id === residentId) return true;
      if (cleanName && rec.remarks && rec.remarks.toLowerCase().includes(cleanName)) return true;
      if (rec.details) {
        try {
          const parsed = JSON.parse(rec.details);
          const cName = `${parsed.sideA?.client_given_name || ""} ${parsed.sideA?.client_last_name || ""}`.trim().toLowerCase();
          if (cleanName && cName && cName === cleanName) return true;
        } catch {}
      }
      return false;
    });

    const savedCustomRecords = JSON.parse(localStorage.getItem("bhw_custom_form_records") || "[]");
    const customForms = savedCustomRecords.filter((rec: any) => 
      rec.residentId === residentId || rec.resident_id === residentId || (cleanName && rec.resident_name && rec.resident_name.trim().toLowerCase() === cleanName)
    );

    setHealthRecords({
      consultations,
      family_data: familyData,
      philpen_health: philpenHealth,
      dengue_prevention: denguePrevention,
      maternal_care: maternalCare,
      child_health: childHealth,
      family_planning: familyPlanning,
      custom_forms: customForms,
    });
  };

  const handleOpenResidentRecords = (resident: Resident) => {
    setSelectedResident(resident);
    fetchHealthRecords(resident);
    setDialogOpen(true);
  };

  const filtered = selectedSitio === "all" ? residents : residents.filter(r => r.sitio === selectedSitio);

  // Group filtered records by sitio
  const groupedBySitio: Record<string, Resident[]> = {};
  filtered.forEach(r => {
    const sitio = r.sitio || "Unassigned";
    if (!groupedBySitio[sitio]) {
      groupedBySitio[sitio] = [];
    }
    groupedBySitio[sitio].push(r);
  });

  // Sort sitio names alphabetically
  const sortedSitioNames = Object.keys(groupedBySitio).sort((a, b) => a.localeCompare(b));

  // Sort resident records within each sitio alphabetically by full_name
  sortedSitioNames.forEach(sitio => {
    groupedBySitio[sitio].sort((a, b) => a.full_name.localeCompare(b.full_name));
  });

  const handlePrint = () => {
    window.print();
  };

  const totalRecords = healthRecords ? (
    healthRecords.consultations.length +
    healthRecords.family_data.length +
    healthRecords.philpen_health.length +
    healthRecords.dengue_prevention.length +
    healthRecords.maternal_care.length +
    healthRecords.child_health.length +
    healthRecords.family_planning.length +
    healthRecords.custom_forms.length
  ) : 0;

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only { display: none !important; }
        .print-only-table { display: none !important; }
        #admin-residents-print-area { background-color: #ffffff !important; color: #000000 !important; }
        #admin-residents-print-area table, #admin-residents-print-area th, #admin-residents-print-area td { color: #000000 !important; border-color: #000000 !important; }
        #admin-residents-print-area h2, #admin-residents-print-area p, #admin-residents-print-area span, #admin-residents-print-area strong { color: #000000 !important; }
        @media print {
          body * { visibility: hidden !important; }
          #admin-residents-print-area, #admin-residents-print-area * { visibility: visible !important; }
          #admin-residents-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; visibility: visible !important; width: 100% !important; }
          .print-footer-info { display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; }
          .header-seal { width: 100% !important; }
          .header-seal img { height: 95px !important; mix-blend-mode: multiply !important; }
          #admin-residents-print-area table td, #admin-residents-print-area table th { padding: 3px 6px !important; font-size: 11px !important; }
          @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>

      {/* Dynamic Creative Theme Banner Header */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary font-semibold uppercase tracking-wider bg-primary/5">
                {language === "tl" ? "Direktoryo ng Residente" : "Resident Master Registry"}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
              {t("admin.residents.title")}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {t("admin.residents.desc")} {language === "tl" ? "Talaan ng mga residente na naka-grupo at naka-filter ayon sa sitio sa buong Barangay Subukin." : "Master resident records categorized, filtered, and organized by sitio across Barangay Subukin."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 dark:bg-slate-900/80 border border-border/50 text-xs shadow-xs">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground font-medium">{language === "tl" ? "Kabuuan:" : "Total:"}</span>
            <strong className="text-foreground">{residents.length}</strong>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 dark:bg-slate-900/80 border border-border/50 text-xs shadow-xs">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span className="text-muted-foreground font-medium">{language === "tl" ? "Mga Sitio:" : "Sitios:"}</span>
            <strong className="text-foreground">{sitios.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Print Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/50 bg-card shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>{t("admin.residents.filterBySitio")}</span>
          </div>
          <Select value={selectedSitio} onValueChange={setSelectedSitio}>
            <SelectTrigger className="w-56 h-9 text-xs font-semibold bg-background border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">
                🌐 {t("admin.residents.allSitios")} ({residents.length})
              </SelectItem>
              {sitios.map(s => {
                const count = residents.filter(r => r.sitio === s).length;
                return (
                  <SelectItem key={s} value={s} className="text-xs">
                    📍 Sitio {s} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={handlePrint}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold h-9 text-xs shadow-xs shrink-0"
        >
          <Printer className="h-4 w-4" /> {t("common.print")}
        </Button>
      </div>

      <div id="admin-residents-print-area" className="space-y-6">
        {/* Printable Official Header Seal */}
        <div className="print-only w-full" style={{ display: "none", width: "100%" }}>
          <OfficialHeader
            title={`${t("residents.title")} — ${selectedSitio === "all" ? t("admin.residents.allSitios") : selectedSitio}`}
            subtitle="Barangay Subukin Health Center • San Juan, Batangas"
            showDoubleBorder={true}
            logoHeight="95px"
          />
        </div>

        {loading ? (
          <Card className="border-border/50 p-6 text-center text-muted-foreground">{t("common.loading")}</Card>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50 p-6 text-center text-muted-foreground">{t("residents.noResidents")}</Card>
        ) : (
          sortedSitioNames.map(sitioName => {
            const residentsInSitio = groupedBySitio[sitioName];
            const style = getSitioStyle(sitioName);
            return (
              <Card key={sitioName} className={`border ${style.border} ${style.accentBar} shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md bg-card`}>
                <CardHeader className={`${style.headerBg} border-b border-border/40 py-3.5 px-4 flex flex-row items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center shrink-0 shadow-xs`}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className={`text-base font-heading font-extrabold ${style.titleColor}`}>
                        Sitio {sitioName}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${style.badge}`}>
                    {residentsInSitio.length} resident{residentsInSitio.length !== 1 ? "s" : ""}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="p-3 text-left font-medium text-muted-foreground w-12">#</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.fullName")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Family #</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.gender")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.age")}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{t("residents.birthday")}</th>
                          <th className="p-3 text-center font-medium text-muted-foreground w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residentsInSitio.map((r, i) => (
                          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                            <td className="p-3 font-medium text-foreground">
                              <button 
                                onClick={() => handleOpenResidentRecords(r)}
                                className="hover:underline hover:text-primary text-left font-semibold flex items-center gap-1.5"
                                title="Click to view associated health records"
                              >
                                {r.full_name}
                              </button>
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.family_number ? (
                                <Badge variant="outline" className="font-mono text-[11px] bg-primary/5 text-primary border-primary/20">
                                  {r.family_number}
                                </Badge>
                              ) : "—"}
                            </td>
                            <td className="p-3 text-foreground">{r.gender}</td>
                            <td className="p-3 text-foreground">{r.age}</td>
                            <td className="p-3 text-foreground">{r.birthday || "—"}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleOpenResidentRecords(r)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Health Records
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <div className="print-only print-footer-info flex justify-between items-center mt-4 w-full">
          <p className="print-date text-left" style={{ fontSize: 10, color: "#6b7280", margin: 0 }}>{new Date().toLocaleString()}</p>
          <p className="print-total text-right font-semibold" style={{ fontSize: 12, color: "#111827", margin: 0 }}>{t("common.total")}: {filtered.length}</p>
        </div>
      </div>

    <p className="text-sm text-muted-foreground no-print">{t("common.showing")} {filtered.length} {t("common.of")} {residents.length}</p>

      {/* Dialog showing selected resident's health records */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-foreground">
              {selectedResident?.full_name} — Health Records
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Associated health records across all barangay forms.
            </DialogDescription>
          </DialogHeader>

          {selectedResident && healthRecords && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/30 rounded-lg text-xs">
                <div><strong>Gender:</strong> {selectedResident.gender}</div>
                <div><strong>Age:</strong> {selectedResident.age}</div>
                <div><strong>Sitio:</strong> {selectedResident.sitio || "—"}</div>
              </div>

              {healthRecords.consultations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("dashboard.consultations")} ({healthRecords.consultations.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">Temp</th>
                        <th className="p-2 border">PR</th>
                        <th className="p-2 border">RR</th>
                        <th className="p-2 border">Height</th>
                        <th className="p-2 border">Weight</th>
                        <th className="p-2 border">Complaint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.consultations.map((c: any) => (
                        <tr key={c.id}>
                          <td className="p-2 border">{c.consultation_date}</td>
                          <td className="p-2 border">{c.temperature || "—"}</td>
                          <td className="p-2 border">{c.pulse_rate || "—"}</td>
                          <td className="p-2 border">{c.respiration_rate || "—"}</td>
                          <td className="p-2 border">{c.height || "—"}</td>
                          <td className="p-2 border">{c.weight || "—"}</td>
                          <td className="p-2 border">{c.consultation_cause || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.philpen_health.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.philpenHealth")} ({healthRecords.philpen_health.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Date</th>
                        <th className="p-2 border">BP</th>
                        <th className="p-2 border">BMI</th>
                        <th className="p-2 border">Smokes</th>
                        <th className="p-2 border">Alcohol</th>
                        <th className="p-2 border">High BP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.philpen_health.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 border">{p.record_date}</td>
                          <td className="p-2 border">{p.bp || "—"}</td>
                          <td className="p-2 border">{p.bmi || "—"}</td>
                          <td className="p-2 border">{p.smokes ? "Yes" : "No"}</td>
                          <td className="p-2 border">{p.drinks_alcohol ? "Yes" : "No"}</td>
                          <td className="p-2 border">{p.high_blood_pressure ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}



              {healthRecords.family_data.length > 0 && (
                <div className="space-y-2">
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Family #</th>
                        <th className="p-2 border">Father</th>
                        <th className="p-2 border">Mother</th>
                        <th className="p-2 border">Total Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.family_data.map((f: any) => (
                        <tr key={f.id}>
                          <td className="p-2 border">{f.family_number || "—"}</td>
                          <td className="p-2 border">{f.father_name || "—"}</td>
                          <td className="p-2 border">{f.mother_name || "—"}</td>
                          <td className="p-2 border">{f.total_members}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.dengue_prevention.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.denguePrevention")} ({healthRecords.dengue_prevention.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Household</th>
                        <th className="p-2 border">Container</th>
                        <th className="p-2 border">Larvae Present</th>
                        <th className="p-2 border">Action Plan</th>
                        <th className="p-2 border">Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.dengue_prevention.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-2 border">{d.household_name || "—"}</td>
                          <td className="p-2 border">{d.container_type || "—"}</td>
                          <td className="p-2 border">{d.has_larvae ? "Yes" : "No"}</td>
                          <td className="p-2 border">{d.action_plan || "—"}</td>
                          <td className="p-2 border">
                            {d.signature ? (
                              d.signature.startsWith("data:image") || d.signature.startsWith("http") ? (
                                <img
                                  src={d.signature}
                                  alt="Signature"
                                  className="h-7 max-w-[120px] object-contain inline-block bg-white dark:bg-slate-900 border border-border/40 rounded p-0.5"
                                />
                              ) : (
                                d.signature
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.maternal_care.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.maternalCare")} ({healthRecords.maternal_care.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Checkup Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.maternal_care.map((m: any) => (
                        <tr key={m.id}>
                          <td className="p-2 border">{m.checkup_date}</td>
                          <td className="p-2 border">{m.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.child_health.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.childHealth")} ({healthRecords.child_health.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Checkup Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.child_health.map((ch: any) => (
                        <tr key={ch.id}>
                          <td className="p-2 border">{ch.checkup_date}</td>
                          <td className="p-2 border">{ch.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.family_planning.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">{t("nav.familyPlanning")} ({healthRecords.family_planning.length})</h3>
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/40 font-semibold">
                        <th className="p-2 border">Method</th>
                        <th className="p-2 border">Start Date</th>
                        <th className="p-2 border">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.family_planning.map((fp: any) => (
                        <tr key={fp.id}>
                          <td className="p-2 border">{fp.method}</td>
                          <td className="p-2 border">{fp.start_date || "—"}</td>
                          <td className="p-2 border">{fp.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {healthRecords.custom_forms && healthRecords.custom_forms.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-primary border-b pb-1">Custom & Deployed Health Forms ({healthRecords.custom_forms.length})</h3>
                  <div className="space-y-3">
                    {healthRecords.custom_forms.map((cf: any, idx: number) => (
                      <div key={cf.id || idx} className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <p className="font-bold text-xs text-foreground uppercase">{cf.formTitle || "Custom Form"}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {cf.savedAt ? new Date(cf.savedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                          {Array.isArray(cf.fields) && cf.fields.map((f: any, fIdx: number) => (
                            <div key={fIdx} className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-muted-foreground block">{f.label}:</span>
                              <span className="font-medium text-foreground">{f.value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalRecords === 0 && (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  {t("residents.noHealthRecords")}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/30 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResidents;
