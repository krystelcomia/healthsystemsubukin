import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bug, Printer, Trash2, Trash, Save, Eye, History, FileCheck, Calendar, CalendarCheck, Search, FileText, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLogger";
import { ensureResidentExists } from "@/lib/residentLinker";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";
import { OfficialHeader } from "@/components/OfficialHeader";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { getDatabaseSitios, SUBUKIN_SITIOS } from "@/lib/sitioMapping";
import { allowOnlyLetters, sanitizeLetters } from "@/lib/inputValidation";

interface HouseholdHeadOption {
  id: string | null;
  full_name: string;
  sitio?: string;
}

export interface SavedDengueForm {
  id: string;
  timestamp: string;
  formattedDate: string;
  records: any[];
}

const STORAGE_KEY_SAVED_BATCHES = "bhw_dengue_saved_batches";
const STORAGE_KEY_ACTIVE_DRAFT = "bhw_dengue_active_draft";
const STORAGE_KEY_RESIDENT_SIGNATURES = "bhw_resident_signatures";
const STORAGE_KEY_WEEK_DATE = "bhw_dengue_current_week_date";
const STORAGE_KEY_WEEKLY_VISITED = "bhw_dengue_weekly_visited";

export const getWeekDetails = (dateStr: string) => {
  const parts = (dateStr || "").split("-").map(Number);
  let d: Date;
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    d = new Date();
  }
  if (isNaN(d.getTime())) d = new Date();

  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatShort = (dt: Date) =>
    dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatIso = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };

  const target = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const weekKey = `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

  return {
    monday,
    sunday,
    mondayStr: formatIso(monday),
    sundayStr: formatIso(sunday),
    weekRangeLabel: `${formatShort(monday)} – ${formatShort(sunday)}`,
    weekKey,
  };
};

const getVisitedHeadsForWeek = (weekKey: string): string[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_WEEKLY_VISITED}_${weekKey}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveVisitedHeadsForWeek = (weekKey: string, heads: string[]) => {
  localStorage.setItem(`${STORAGE_KEY_WEEKLY_VISITED}_${weekKey}`, JSON.stringify(heads));
};

const getSavedBatchesFromStorage = (): Record<string, { timestamp: string; recordIds: string[]; records?: any[] }> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED_BATCHES) || "{}");
  } catch {
    return {};
  }
};

const saveBatchesToStorage = (batches: Record<string, { timestamp: string; recordIds: string[]; records?: any[] }>) => {
  localStorage.setItem(STORAGE_KEY_SAVED_BATCHES, JSON.stringify(batches));
};

const normalizeResidentName = (name?: string | null): string => {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const getStoredSignatures = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_RESIDENT_SIGNATURES) || "{}");
  } catch {
    return {};
  }
};

const storeSignatureForResident = (name?: string | null, signature?: string | null, resId?: string | null) => {
  if (!signature || !signature.trim()) return;
  const stored = getStoredSignatures();
  const cleanName = normalizeResidentName(name);
  if (cleanName) {
    stored[cleanName] = signature;
  }
  if (resId && resId.trim()) {
    stored[resId.trim()] = signature;
  }
  localStorage.setItem(STORAGE_KEY_RESIDENT_SIGNATURES, JSON.stringify(stored));
};

const removeStoredSignatureForResident = (name?: string | null, resId?: string | null) => {
  const stored = getStoredSignatures();
  const cleanName = normalizeResidentName(name);
  let changed = false;
  if (cleanName && stored[cleanName]) {
    delete stored[cleanName];
    changed = true;
  }
  if (resId && resId.trim() && stored[resId.trim()]) {
    delete stored[resId.trim()];
    changed = true;
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEY_RESIDENT_SIGNATURES, JSON.stringify(stored));
  }
};

const findSignatureForResident = (
  name?: string | null,
  resId?: string | null,
  fallbackName?: string | null
): string => {
  const cleanName = normalizeResidentName(name);
  const cleanFallbackName = normalizeResidentName(fallbackName);
  const cleanId = (resId || "").trim();

  // Strictly check local storage cache (only holds signatures where resident checked consent)
  const stored = getStoredSignatures();
  if (cleanName && stored[cleanName]) return stored[cleanName];
  if (cleanFallbackName && stored[cleanFallbackName]) return stored[cleanFallbackName];
  if (cleanId && stored[cleanId]) return stored[cleanId];

  return "";
};

const DenguePreventionForm = () => {
  const { t, language } = useSettings();
  const { userRole, isMidwife } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [householdHeads, setHouseholdHeads] = useState<HouseholdHeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [savedForms, setSavedForms] = useState<SavedDengueForm[]>([]);
  const [viewingSavedForm, setViewingSavedForm] = useState<SavedDengueForm | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historySitio, setHistorySitio] = useState("all");
  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);

  useEffect(() => {
    getDatabaseSitios().then(sits => setSitioOptions(sits));
  }, []);

  const filteredSavedForms = useMemo(() => {
    let result = savedForms;
    if (historySitio !== "all") {
      result = result.filter(sf => {
        return sf.records.some(r => {
          const hh = householdHeads.find(h => h.full_name.toLowerCase() === (r.household_name || "").toLowerCase());
          const sitio = (hh?.sitio || "").toLowerCase();
          return sitio.includes(historySitio.toLowerCase()) || (r.household_name || "").toLowerCase().includes(historySitio.toLowerCase());
        });
      });
    }
    if (!historySearch.trim()) return result;
    const q = historySearch.toLowerCase().trim();
    return result.filter((sf) => {
      const date = (sf.formattedDate || "").toLowerCase();
      const hasMatchingHousehold = sf.records.some(r => (r.household_name || "").toLowerCase().includes(q));
      return date.includes(q) || hasMatchingHousehold;
    });
  }, [savedForms, historySearch, historySitio, householdHeads]);

  const [deleteRowConfirm, setDeleteRowConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteSavedFormConfirmId, setDeleteSavedFormConfirmId] = useState<string | null>(null);
  const [endWeekDialogOpen, setEndWeekDialogOpen] = useState(false);
  const [clearFormDialogOpen, setClearFormDialogOpen] = useState(false);

  // Weekly home visits date tracking
  const [currentWeekDate, setCurrentWeekDate] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_WEEK_DATE);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const weekDetails = useMemo(() => getWeekDetails(currentWeekDate), [currentWeekDate]);

  const [weeklyVisitedHeads, setWeeklyVisitedHeads] = useState<string[]>(() => {
    try {
      const wk = getWeekDetails(
        localStorage.getItem(STORAGE_KEY_WEEK_DATE) || new Date().toISOString().split("T")[0]
      ).weekKey;
      return getVisitedHeadsForWeek(wk);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const heads = getVisitedHeadsForWeek(weekDetails.weekKey);
    setWeeklyVisitedHeads(heads);
  }, [weekDetails.weekKey]);

  const addVisitedHeads = (newNames: string[]) => {
    setWeeklyVisitedHeads((prev) => {
      const updated = Array.from(new Set([...prev, ...newNames.map((n) => n.trim())].filter(Boolean)));
      saveVisitedHeadsForWeek(weekDetails.weekKey, updated);
      return updated;
    });
  };

  const handleWeekDateChange = (newDate: string) => {
    if (!newDate) return;
    setCurrentWeekDate(newDate);
    localStorage.setItem(STORAGE_KEY_WEEK_DATE, newDate);
  };

  const handleEndWeek = () => {
    if (isMidwife) return;
    // 1. Clear weekly visited heads for this week and next
    saveVisitedHeadsForWeek(weekDetails.weekKey, []);
    setWeeklyVisitedHeads([]);

    // 2. Advance the calendar date by 7 days to the start of the next week
    const nextWeekMonday = new Date(weekDetails.monday.getTime() + 7 * 86400000);
    const y = nextWeekMonday.getFullYear();
    const m = String(nextWeekMonday.getMonth() + 1).padStart(2, "0");
    const d = String(nextWeekMonday.getDate()).padStart(2, "0");
    const nextDateStr = `${y}-${m}-${d}`;
    setCurrentWeekDate(nextDateStr);
    localStorage.setItem(STORAGE_KEY_WEEK_DATE, nextDateStr);

    // 3. Reset active form rows to blank so user starts the new week clean
    const blankRows = createBlankRows(MAX_ROWS);
    setRecords(blankRows);
    localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(blankRows));

    setEndWeekDialogOpen(false);

    toast.success(
      language === "tl"
        ? "Matagumpay na natapos ang linggo! Lahat ng maybahay ay muling makikita sa mga pagpipilian para sa bagong linggo."
        : "Week completed! All household head names have been restored to the options list for the new week."
    );

    logActivity("update_dengue", {
      entity_type: "dengue_prevention",
      description: `Completed dengue inspection week (${weekDetails.weekRangeLabel}). Refreshed household head options.`,
    });
  };

  const handleClearForm = () => {
    if (isMidwife) return;
    const blankRows = createBlankRows(MAX_ROWS);
    setRecords(blankRows);
    localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(blankRows));
    setClearFormDialogOpen(false);
    toast.success(language === "tl" ? "Na-clear ang aktibong form." : "Active form cleared.");
  };

  // Visited set for quick normalized lookup
  const visitedSet = useMemo(() => {
    return new Set(weeklyVisitedHeads.map((h) => normalizeResidentName(h)).filter(Boolean));
  }, [weeklyVisitedHeads]);

  // Track household head names already entered in the active form rows
  const activeEnteredNamesMap = useMemo(() => {
    const map = new Map<string, string>(); // normalizedName -> rowId
    records.forEach((r) => {
      const norm = normalizeResidentName(r.household_name);
      if (norm) {
        map.set(norm, r.id);
      }
    });
    return map;
  }, [records]);

  // Return household head options available for a specific row:
  // - Excludes heads already visited/saved this week
  // - Excludes heads entered into other rows on the active form
  // - Preserves the row's own current selection so it doesn't disappear when focused
  const getAvailableHeadsForRow = (recId: string, currentRowVal: string) => {
    const currentNorm = normalizeResidentName(currentRowVal);
    return householdHeads.filter((head) => {
      const norm = normalizeResidentName(head.full_name);
      if (!norm) return false;
      if (norm === currentNorm) return true;
      if (visitedSet.has(norm)) return false;
      const otherRowId = activeEnteredNamesMap.get(norm);
      if (otherRowId && otherRowId !== recId) return false;
      return true;
    });
  };

  const remainingHeadsCount = useMemo(() => {
    return householdHeads.filter((head) => {
      const norm = normalizeResidentName(head.full_name);
      return !visitedSet.has(norm) && !activeEnteredNamesMap.has(norm);
    }).length;
  }, [householdHeads, visitedSet, activeEnteredNamesMap]);

  const MAX_ROWS = 20;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimeoutsRef = useRef<Record<string, any>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [activeSignRecordId, setActiveSignRecordId] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [activeView, setActiveView] = useState<"form" | "history">("form");

  const createBlankRows = (count: number) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        id: `temp-${i}-${Date.now()}`,
        resident_id: null,
        household_name: "",
        container_type: "",
        has_larvae: null,
        action_plan: "",
        signature: ""
      });
    }
    return rows;
  };

  const getPaddedSavedRecords = (savedRecords: any[]) => {
    const list = [...(savedRecords || [])];
    for (let i = list.length; i < MAX_ROWS; i++) {
      list.push({
        id: `blank-saved-${i}`,
        household_name: "",
        container_type: "",
        has_larvae: null,
        action_plan: "",
        signature: ""
      });
    }
    return list;
  };

  // Retain draft inputs across page switches, reloads, and sign-outs locally
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(records));
    }
  }, [records]);

  const fetchHouseholdHeads = async () => {
    try {
      const [famRes, resRes] = await Promise.all([
        supabase.from("family_data").select("id, father_name, resident_id, sitio"),
        supabase.from("residents").select("id, full_name, sitio"),
      ]);

      const famData = famRes.data || [];
      const resData = resRes.data || [];

      const headsMap = new Map<string, HouseholdHeadOption>();

      famData.forEach((fam: any) => {
        if (fam.father_name && fam.father_name.trim()) {
          const nameClean = fam.father_name.trim();
          const nameKey = nameClean.toLowerCase();
          const matchedRes = resData.find(
            (r: any) => (r.id && r.id === fam.resident_id) || r.full_name.trim().toLowerCase() === nameKey
          );
          headsMap.set(nameKey, {
            id: matchedRes ? matchedRes.id : (fam.resident_id || null),
            full_name: nameClean,
            sitio: fam.sitio || matchedRes?.sitio || "",
          });
        }
      });

      const list = Array.from(headsMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );

      setHouseholdHeads(list);
    } catch (err) {
      console.error("Failed to load household heads:", err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dengue_prevention")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load records");
      setLoading(false);
      return;
    }

    const dbRecords = data || [];
    const savedBatchesMap = getSavedBatchesFromStorage();

    const recordToBatchMap = new Map<string, string>();
    const archivedRecordIds = new Set<string>();

    Object.entries(savedBatchesMap).forEach(([batchId, batch]) => {
      (batch.recordIds || []).forEach((recId) => {
        recordToBatchMap.set(recId, batchId);
        archivedRecordIds.add(recId);
      });
      (batch.records || []).forEach((r) => {
        if (r.id) archivedRecordIds.add(r.id);
      });
    });

    const batchGroupsMap = new Map<string, { id: string; timestamp: string; records: any[] }>();

    dbRecords.forEach((rec: any) => {
      const assignedBatchId = recordToBatchMap.get(rec.id);
      if (assignedBatchId) {
        if (!batchGroupsMap.has(assignedBatchId)) {
          const batchInfo = savedBatchesMap[assignedBatchId];
          batchGroupsMap.set(assignedBatchId, {
            id: assignedBatchId,
            timestamp: batchInfo?.timestamp || rec.created_at || new Date().toISOString(),
            records: []
          });
        }
        batchGroupsMap.get(assignedBatchId)!.records.push(rec);
      }
    });

    // Collect unmapped DB records (not assigned to any saved batch) — these stay in the active form
    const sortedDb = [...dbRecords].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const unmappedDbRecords = sortedDb.filter((rec: any) => !archivedRecordIds.has(rec.id));

    const compiledSavedForms: SavedDengueForm[] = Array.from(batchGroupsMap.values())
      .map((b) => {
        const dateObj = new Date(b.timestamp);
        const formattedDate = isNaN(dateObj.getTime())
          ? b.timestamp
          : dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
        return {
          id: b.id,
          timestamp: b.timestamp,
          formattedDate,
          records: b.records
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setSavedForms(compiledSavedForms);

    // Sync visited heads for the current week from saved batches
    const currentWeekVisited = new Set<string>(getVisitedHeadsForWeek(weekDetails.weekKey));
    compiledSavedForms.forEach((sf) => {
      const sfDate = sf.timestamp ? sf.timestamp.split("T")[0] : "";
      if (sfDate && getWeekDetails(sfDate).weekKey === weekDetails.weekKey) {
        (sf.records || []).forEach((r: any) => {
          if (r.household_name && r.household_name.trim()) {
            currentWeekVisited.add(r.household_name.trim());
          }
        });
      }
    });
    const syncedList = Array.from(currentWeekVisited);
    saveVisitedHeadsForWeek(weekDetails.weekKey, syncedList);
    setWeeklyVisitedHeads(syncedList);

    // Active form resolution:
    // 1. First try restoring from active draft in localStorage
    // 2. If no draft, load unmapped DB records into the active form so filled-out data persists
    // 3. Only start with blank rows if both are empty
    let initialRows: any[] = [];

    const activeDraftStr = localStorage.getItem(STORAGE_KEY_ACTIVE_DRAFT);
    if (activeDraftStr) {
      try {
        const parsed = JSON.parse(activeDraftStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy dummy dengue-* records
          const cleanParsed = parsed.filter((r: any) => !r.id?.startsWith("dengue-"));
          const hasAnyData = cleanParsed.some((r: any) => !isRowEmpty(r));
          if (hasAnyData) {
            initialRows = cleanParsed.slice(0, MAX_ROWS);
          } else {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_DRAFT);
          }
        }
      } catch {}
    }

    // If no active draft, load unmapped DB records (excluding legacy dummy dengue-* records)
    if (initialRows.length === 0 && unmappedDbRecords.length > 0) {
      const cleanDb = unmappedDbRecords.filter((r: any) => !r.id?.startsWith("dengue-"));
      if (cleanDb.length > 0) {
        initialRows = cleanDb.slice(0, MAX_ROWS);
      }
    }

    // Only start with fresh blank rows if there is truly no data
    if (initialRows.length === 0) {
      initialRows = createBlankRows(MAX_ROWS);
    }

    // Auto-populate resident signatures ONLY if authorized via stored consent in localStorage
    initialRows = initialRows.map((r) => {
      if (r.household_name?.trim() && !r.signature) {
        const cleanName = (r.household_name || "").trim();
        const matched = householdHeads.find(
          (h) => normalizeResidentName(h.full_name) === normalizeResidentName(cleanName)
        );
        const sig = findSignatureForResident(
          cleanName,
          r.resident_id || matched?.id,
          matched?.full_name
        );
        if (sig) {
          return {
            ...r,
            signature: sig,
            resident_id: r.resident_id || matched?.id || null,
          };
        }
      }
      return r;
    });

    // Pad with blank rows up to MAX_ROWS (20)
    const padded = [...initialRows];
    for (let i = padded.length; i < MAX_ROWS; i++) {
      padded.push({
        id: `temp-${i}-${Date.now()}`,
        resident_id: null,
        household_name: "",
        container_type: "",
        has_larvae: null,
        action_plan: "",
        signature: ""
      });
    }

    setRecords(padded);
    localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(padded));

    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    fetchHouseholdHeads();
  }, []);

  const isRowEmpty = (row: any) => {
    return (
      !row.household_name?.trim() &&
      !row.container_type?.trim() &&
      !row.action_plan?.trim() &&
      !row.signature?.trim() &&
      (row.has_larvae === null || row.has_larvae === undefined)
    );
  };

  useEffect(() => {
    if (!signatureModalOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [signatureModalOpen]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const resolveResidentId = async (name: string, currentResId: string | null) => {
    const clean = (name || "").trim();
    if (!clean) return null;

    if (currentResId) return currentResId;

    const match = householdHeads.find(
      (h) => h.full_name.toLowerCase() === clean.toLowerCase()
    );
    if (match?.id) return match.id;

    const newId = await ensureResidentExists({ fullName: clean });
    return newId;
  };

  const autoSaveRowToDb = async (row: any) => {
    if (isMidwife) return;
    if (!row || !row.id) return;

    if (isRowEmpty(row)) {
      if (row.id && !row.id.startsWith("temp-") && !row.id.startsWith("blank-")) {
        await supabase.from("dengue_prevention").delete().eq("id", row.id);
        window.dispatchEvent(new Event("dengue-records-updated"));
      }
      return;
    }

    try {
      const resId = await resolveResidentId(row.household_name, row.resident_id);

      if (row.id && !row.id.startsWith("temp-") && !row.id.startsWith("blank-")) {
        // Update existing database record
        await supabase
          .from("dengue_prevention")
          .update({
            resident_id: resId,
            household_name: row.household_name || "",
            container_type: row.container_type || "",
            has_larvae: row.has_larvae,
            action_plan: row.action_plan || "",
            signature: row.signature || "",
          })
          .eq("id", row.id);
      } else {
        // Insert new record into database and save returned ID
        const { data, error } = await supabase
          .from("dengue_prevention")
          .insert({
            resident_id: resId,
            household_name: row.household_name || "",
            container_type: row.container_type || "",
            has_larvae: row.has_larvae,
            action_plan: row.action_plan || "",
            signature: row.signature || "",
          })
          .select()
          .single();

        if (!error && data) {
          setRecords((prev) => {
            const updated = prev.map((r) => (r.id === row.id ? { ...data } : r));
            localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(updated));
            return updated;
          });
        }
      }

      window.dispatchEvent(new Event("dengue-records-updated"));
      window.dispatchEvent(new Event("resident-records-updated"));
    } catch (err) {
      console.error("Dengue row auto-save error:", err);
    }
  };

  const queueAutoSaveRow = (row: any) => {
    if (isMidwife) return;
    if (!row || !row.id) return;
    if (saveTimeoutsRef.current[row.id]) {
      clearTimeout(saveTimeoutsRef.current[row.id]);
    }
    saveTimeoutsRef.current[row.id] = setTimeout(() => {
      autoSaveRowToDb(row);
      delete saveTimeoutsRef.current[row.id];
    }, 400);
  };

  const handleHouseholdNameChange = (id: string, value: string) => {
    if (isMidwife) return;
    const cleanName = value.trim();
    const normInput = normalizeResidentName(value);
    const matched = householdHeads.find(
      (h) => normalizeResidentName(h.full_name) === normInput
    );

    // Look up if this resident has an authorized signature in stored consent cache
    const existingSig = cleanName
      ? findSignatureForResident(value, matched?.id, matched?.full_name)
      : "";

    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const updatedRow = {
            ...r,
            household_name: value,
            resident_id: matched?.id || (matched ? r.resident_id : null),
            // Automatically populate signature ONLY if authorized with stored consent, or clear if blank
            signature: existingSig || (cleanName ? r.signature : "") || "",
          };
          queueAutoSaveRow(updatedRow);
          return updatedRow;
        }
        return r;
      });

      return updated;
    });
  };

  const handleContainerTypeChange = (id: string, value: string) => {
    if (isMidwife) return;
    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const updatedRow = { ...r, container_type: value };
          queueAutoSaveRow(updatedRow);
          return updatedRow;
        }
        return r;
      });

      return updated;
    });
  };

  const handleActionPlanChange = (id: string, value: string) => {
    if (isMidwife) return;
    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const updatedRow = { ...r, action_plan: value };
          queueAutoSaveRow(updatedRow);
          return updatedRow;
        }
        return r;
      });

      return updated;
    });
  };

  // Signature is saved: if consented, it is stored in persistent cache and auto-applied.
  // If not consented, it is ONLY applied to the active row and never saved for future auto-use.
  const saveSignature = () => {
    if (isMidwife) return;
    const canvas = canvasRef.current;
    if (!canvas || !activeSignRecordId) return;

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureModalOpen(false);

    const targetRow = records.find((r) => r.id === activeSignRecordId);
    const matchedHead = targetRow?.household_name
      ? householdHeads.find(
          (h) => normalizeResidentName(h.full_name) === normalizeResidentName(targetRow.household_name)
        )
      : null;

    const targetResId = targetRow?.resident_id || matchedHead?.id || "";
    const targetName = targetRow?.household_name || matchedHead?.full_name || "";
    const normTargetName = normalizeResidentName(targetName);
    const normMatchedHeadName = matchedHead ? normalizeResidentName(matchedHead.full_name) : "";

    if (targetName || targetResId) {
      if (consentChecked) {
        // Resident checked "I allow" -> persist signature for future automated use
        storeSignatureForResident(targetName, dataUrl, targetResId);
        if (matchedHead?.full_name && matchedHead.full_name !== targetName) {
          storeSignatureForResident(matchedHead.full_name, dataUrl, targetResId);
        }
      } else {
        // Resident did NOT check the box -> purge any stored signature so they will sign again next time
        removeStoredSignatureForResident(targetName, targetResId);
        if (matchedHead?.full_name) {
          removeStoredSignatureForResident(matchedHead.full_name, targetResId);
        }
      }
    }

    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === activeSignRecordId) {
          return { ...r, signature: dataUrl, resident_id: targetResId || r.resident_id };
        }

        // Only auto-populate other rows if resident explicitly checked the consent box
        if (consentChecked) {
          const rowNormName = normalizeResidentName(r.household_name);
          const matchesName =
            (normTargetName && rowNormName === normTargetName) ||
            (normMatchedHeadName && rowNormName === normMatchedHeadName);
          const matchesId = Boolean(targetResId && r.resident_id && r.resident_id === targetResId);

          if (!r.signature && (matchesName || matchesId)) {
            const autoSignedRow = {
              ...r,
              signature: dataUrl,
              resident_id: targetResId || r.resident_id,
            };
            autoSaveRowToDb(autoSignedRow);
            return autoSignedRow;
          }
        }
        return r;
      });

      const updatedTargetRow = updated.find((r) => r.id === activeSignRecordId);
      if (updatedTargetRow) {
        autoSaveRowToDb(updatedTargetRow);
      }

      return updated;
    });
  };

  // Toggle larvae checkmark and immediately auto-save to database
  const handleToggleLarvae = (id: string, hasLarvae: boolean) => {
    if (isMidwife) return;
    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const updatedRow = {
            ...r,
            has_larvae: r.has_larvae === hasLarvae ? null : hasLarvae,
          };
          autoSaveRowToDb(updatedRow);
          return updatedRow;
        }
        return r;
      });

      return updated;
    });
  };

  // Save Progress button: smoothly saves current records to DB while keeping the view directly on the form
  const handleSaveAll = async () => {
    if (isMidwife) return;
    const nonEmptyRecords = records.filter((r) => !isRowEmpty(r));
    if (nonEmptyRecords.length === 0) {
      toast.error(t("dengue.noRecordsToSave") || "No records to save.");
      return;
    }

    const missingName = nonEmptyRecords.find((r) => !r.household_name?.trim());
    if (missingName) {
      toast.error("Essential resident info missing: Please provide the household head's name.");
      return;
    }

    // Check for duplicate household head entries within the current form
    const cleanNames = nonEmptyRecords.map((r) => normalizeResidentName(r.household_name));
    const duplicate = cleanNames.find((name, idx) => cleanNames.indexOf(name) !== idx);
    if (duplicate) {
      const duplicateOriginal = nonEmptyRecords.find(
        (r) => normalizeResidentName(r.household_name) === duplicate
      )?.household_name;
      toast.error(
        language === "tl"
          ? `May dobleng maybahay sa talaan: "${duplicateOriginal}". Isa lamang bawat linggo.`
          : `Duplicate household head: "${duplicateOriginal}". Each household head should only be entered once per week.`
      );
      return;
    }

    // Check if any household head was already visited earlier this week
    const alreadyVisited = nonEmptyRecords.find((r) =>
      visitedSet.has(normalizeResidentName(r.household_name))
    );
    if (alreadyVisited) {
      toast.error(
        language === "tl"
          ? `Si "${alreadyVisited.household_name}" ay naitala na para sa linggong ito (${weekDetails.weekRangeLabel}).`
          : `"${alreadyVisited.household_name}" was already recorded for this week (${weekDetails.weekRangeLabel}).`
      );
      return;
    }

    const missingInspection = nonEmptyRecords.find(
      (r) =>
        !r.container_type?.trim() &&
        (r.has_larvae === null || r.has_larvae === undefined) &&
        !r.action_plan?.trim()
    );
    if (missingInspection) {
      toast.error(
        `Health details missing for "${missingInspection.household_name}": Please record container type, larvae inspection result, or action plan.`
      );
      return;
    }

    setSaving(true);

    // Cancel pending debounce timeouts so they don't conflict
    Object.values(saveTimeoutsRef.current).forEach((tId) => clearTimeout(tId));
    saveTimeoutsRef.current = {};

    try {
      const updatedRecords = await Promise.all(
        records.map(async (record) => {
          if (isRowEmpty(record)) return record;
          const resId = await resolveResidentId(record.household_name, record.resident_id);

          if (record.id && !record.id.startsWith("temp-") && !record.id.startsWith("blank-")) {
            const { data, error } = await supabase
              .from("dengue_prevention")
              .update({
                resident_id: resId,
                household_name: record.household_name || "",
                container_type: record.container_type || "",
                has_larvae: record.has_larvae,
                action_plan: record.action_plan || "",
                signature: record.signature || "",
              })
              .eq("id", record.id)
              .select()
              .single();

            if (!error && data) return { ...record, ...data };
            return record;
          } else {
            const { data, error } = await supabase
              .from("dengue_prevention")
              .insert({
                resident_id: resId,
                household_name: record.household_name || "",
                container_type: record.container_type || "",
                has_larvae: record.has_larvae,
                action_plan: record.action_plan || "",
                signature: record.signature || "",
              })
              .select()
              .single();

            if (!error && data) return { ...record, ...data };
            return record;
          }
        })
      );

      const savedNonEmpty = updatedRecords.filter((r) => !isRowEmpty(r));

      if (savedNonEmpty.length > 0) {
        // Archive the completed set as a saved batch in history
        const batchId = `dengue_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const batchTimestamp = new Date().toISOString();
        const savedBatchesMap = getSavedBatchesFromStorage();

        savedBatchesMap[batchId] = {
          timestamp: batchTimestamp,
          recordIds: savedNonEmpty.map((r) => r.id).filter(Boolean),
          records: savedNonEmpty,
        };
        saveBatchesToStorage(savedBatchesMap);

        // Add to the saved forms list in state
        const dateObj = new Date(batchTimestamp);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        setSavedForms((prev) => [
          {
            id: batchId,
            timestamp: batchTimestamp,
            formattedDate,
            records: savedNonEmpty,
          },
          ...prev,
        ]);

        // Register saved household heads as visited for this week
        const newlySavedHeads = savedNonEmpty
          .map((r) => (r.household_name || "").trim())
          .filter(Boolean);
        addVisitedHeads(newlySavedHeads);

        // Reset the active form to blank rows for a new set
        const blankRows = createBlankRows(MAX_ROWS);
        setRecords(blankRows);
        localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(blankRows));

        toast.success(
          language === "tl"
            ? `Nai-save sa history ang ${savedNonEmpty.length} tala! Na-reset ang form para sa bagong set. Ang mga natitirang maybahay ay maaari pa ring piliin.`
            : `Saved ${savedNonEmpty.length} record(s) to history! Form reset for a new set; remaining household heads are still available.`
        );

        logActivity("update_dengue", {
          entity_type: "dengue_prevention",
          description: `Archived ${savedNonEmpty.length} record(s) in Dengue prevention checklist for week ${weekDetails.weekRangeLabel}`,
        });
      }

      window.dispatchEvent(new Event("resident-records-updated"));
      window.dispatchEvent(new Event("dengue-records-updated"));

    } catch (err) {
      console.error("Failed to save progress:", err);
      toast.error("Some records failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Print Form button: triggers window.print while retaining all entered records in the form.
  const handlePrintForm = () => {
    window.print();
  };

  // Delete single previous record/batch stored in saved list
  const handleDeleteSavedForm = async (batchId: string) => {
    if (isMidwife) return;
    const savedBatchesMap = getSavedBatchesFromStorage();
    const batchInfo = savedBatchesMap[batchId];

    if (batchInfo && batchInfo.recordIds && batchInfo.recordIds.length > 0) {
      const { error } = await supabase
        .from("dengue_prevention")
        .delete()
        .in("id", batchInfo.recordIds);

      if (error) {
        toast.error("Failed to delete saved form records");
        return;
      }
    }

    delete savedBatchesMap[batchId];
    saveBatchesToStorage(savedBatchesMap);
    setSavedForms(prev => prev.filter(f => f.id !== batchId));
    setDeleteSavedFormConfirmId(null);
    toast.success("Saved form deleted");

    logActivity("delete_dengue_batch", {
      entity_type: "dengue_prevention",
      description: `Deleted saved Dengue prevention batch`
    });

    await fetchRecords();
  };

  // Print single saved form batch from the history modal
  const handlePrintSavedForm = (savedForm: SavedDengueForm) => {
    setViewingSavedForm(savedForm);
    setViewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (isMidwife) return;
    // Cancel any pending auto-save timeout for this row
    if (saveTimeoutsRef.current[id]) {
      clearTimeout(saveTimeoutsRef.current[id]);
      delete saveTimeoutsRef.current[id];
    }

    // 1. If the row had a persistent database record, remove it from the DB
    if (id && !id.startsWith("temp-") && !id.startsWith("blank-")) {
      const { error } = await supabase
        .from("dengue_prevention")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to clear row from database");
        return;
      }
    }

    // 2. Clear only the data entered in this row in-place so the row structure is preserved (always maintaining 20 rows)
    const blankRowTemplate = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      resident_id: null,
      household_name: "",
      container_type: "",
      has_larvae: null,
      action_plan: "",
      signature: ""
    };

    setRecords((prev) => {
      const updated = prev.map((r) => (r.id === id ? blankRowTemplate : r));
      // Ensure the table always contains exactly MAX_ROWS (20 rows)
      const padded = [...updated];
      while (padded.length < MAX_ROWS) {
        padded.push({
          id: `temp-${padded.length}-${Date.now()}`,
          resident_id: null,
          household_name: "",
          container_type: "",
          has_larvae: null,
          action_plan: "",
          signature: ""
        });
      }
      const final20 = padded.slice(0, MAX_ROWS);
      localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(final20));
      return final20;
    });

    const displayName = name?.trim() || "unnamed row";
    logActivity("delete_dengue", {
      entity_type: "dengue_prevention",
      description: `Cleared Dengue prevention record row for: ${displayName}`
    });

    toast.success("Row data cleared successfully");
    window.dispatchEvent(new Event("resident-records-updated"));
    window.dispatchEvent(new Event("dengue-records-updated"));
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only {
          display: none !important;
        }

        .cell-input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 0.8125rem;
          padding: 0.25rem 0.5rem;
          outline: none;
          color: inherit;
        }
        .cell-input:focus {
          background: hsl(var(--primary) / 0.05);
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          
          #dengue-print-area, #dengue-print-area *,
          #saved-form-print-area, #saved-form-print-area * {
            visibility: visible !important;
          }
          
          /* Full page positioning with clean spacing around all table and page edges */
          #dengue-print-area, #saved-form-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 16px 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }

          /* Radix dialog container override for printing history modal */
          [role="dialog"],
          div[role="dialog"],
          [data-state="open"][role="dialog"] {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            max-height: none !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          [data-radix-portal] {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }

          #dengue-print-area [class*="p-8"],
          #saved-form-print-area [class*="p-8"] {
            padding: 0 !important;
            margin: 0 !important;
          }

          #dengue-print-area .space-y-6 > :not([hidden]) ~ :not([hidden]),
          #saved-form-print-area .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
          }
          
          /* Official Printable Header Seal */
          .header-seal, .header-border {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            border-bottom: 4px double #000000 !important;
            padding-bottom: 16px !important;
            margin-bottom: 16px !important;
            text-align: center !important;
          }
          .header-seal img, .header-border img, .print-only img {
            height: 95px !important;
            max-height: 95px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }

          h1 {
            font-size: 15px !important;
            letter-spacing: 0.08em !important;
            margin: 2px 0 1px 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-weight: 800 !important;
            text-align: center !important;
          }

          p.font-serif {
            font-size: 10.5px !important;
            margin-top: 1px !important;
            margin-bottom: 8px !important;
            color: #333333 !important;
            text-align: center !important;
          }

          /* Clean Table with full borders and balanced row heights */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1.5px solid #000000 !important;
            margin-top: 2px !important;
          }
          
          thead th {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 3px 4px !important;
            font-size: 9px !important;
            line-height: 1.15 !important;
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            text-align: center !important;
          }
          
          tbody tr {
            height: 7.8mm !important;
          }

          tbody td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 1px 4px !important;
            font-size: 9px !important;
            line-height: 1.1 !important;
            height: 7.8mm !important;
            vertical-align: middle !important;
          }

          tbody td .print-only,
          tbody td span {
            display: inline-block !important;
            font-size: 9px !important;
            color: #000000 !important;
            font-weight: 500 !important;
            line-height: 1.1 !important;
          }

          tbody td div {
            font-size: 11px !important;
            font-weight: bold !important;
            color: #000000 !important;
          }

          td img {
            height: 22px !important;
            max-height: 24px !important;
            width: auto !important;
            object-fit: contain !important;
            margin: 0 auto !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .cell-input {
            display: none !important;
          }
          .print-only {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
          }
          .print-signatures,
          .print-footer-signatures {
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner Header matching Dashboard */}
      <PageHeaderBanner
        icon={ShieldAlert}
        badge={language === "tl" ? "Talaan ng Dengue Prevention" : "Dengue Prevention Record"}
        title={language === "tl" ? "Dengue Prevention — Search & Destroy 2026" : "Dengue Prevention — Search & Destroy 2026"}
        description={language === "tl" ? "Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue sa Barangay Subukin." : "Search and destruction checklist of dengue vector breeding containers and household inspection records in Barangay Subukin."}
        rightContent={
          <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("form")}
              className={`h-8 px-4 text-xs font-bold rounded-lg transition-all ${
                activeView === "form"
                  ? "bg-white text-slate-900 shadow-md font-extrabold hover:bg-white"
                  : "text-white/90 hover:text-white hover:bg-white/15"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Active Form
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("history")}
              className={`h-8 px-4 text-xs font-bold rounded-lg transition-all ${
                activeView === "history"
                  ? "bg-white text-slate-900 shadow-md font-extrabold hover:bg-white"
                  : "text-white/90 hover:text-white hover:bg-white/15"
              }`}
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              History
            </Button>
          </div>
        }
      />

      {/* Midwife read-only banner */}
      {isMidwife && <ReadOnlyBanner />}

      {/* Main Form Card (Form View) */}
      {activeView === "form" && (
      <Card 
        id="dengue-print-area" 
        className={`border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden ${viewModalOpen ? "no-print" : ""}`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <CardContent className="p-8 space-y-6">
          
          {/* Official Header Layout - Visible ONLY when printing */}
          <div className="print-only w-full" style={{ display: "none", width: "100%" }}>
            <OfficialHeader
              title={language === "tl" ? "PAG-IWAS SA DENGUE 2026 — Search and Destroy Checklist" : "SEARCH AND DESTROY 2026 — Dengue Prevention Checklist"}
              subtitle={language === "tl" ? "Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue • Barangay Subukin" : "Search and destruction of mosquitoes carrying Dengue virus • Barangay Subukin"}
              showDoubleBorder={true}
              logoHeight="95px"
            />
          </div>

          {/* Weekly Calendar & Controls Toolbar (Hidden when printing) */}
          <div className="flex flex-wrap items-center justify-between gap-3 no-print p-3 rounded-xl bg-muted/40 border border-border/60">
            {/* Left: Barangay indicator & Week Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                BRGY: <strong className="text-foreground">SUBUKIN</strong>
              </span>

              <Badge variant="outline" className="text-xs bg-background text-foreground border-border font-medium flex items-center gap-1.5 py-1 px-2.5 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">{weekDetails.weekRangeLabel}</span>
              </Badge>

              <Badge variant="secondary" className="text-[11px] font-semibold py-1 px-2.5">
                {remainingHeadsCount} {language === "tl" ? "natitirang maybahay" : "remaining head(s)"}
              </Badge>
            </div>

            {/* Right: Date Picker & End Week Button & Clear Form Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs shadow-sm hover:border-primary/50 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground font-medium mr-1">
                  {language === "tl" ? "Petsa:" : "Week:"}
                </span>
                <input
                  type="date"
                  value={currentWeekDate}
                  onChange={(e) => handleWeekDateChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                  title={language === "tl" ? "Pumili ng petsa para sa linggong ito" : "Select date for the current week"}
                />
              </div>

              {!isMidwife && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEndWeekDialogOpen(true)}
                    className="h-8 gap-1.5 text-xs font-bold border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 shadow-sm"
                    title={language === "tl" ? "Tapusin ang lingguhang pagbisita at muling ilabas ang lahat ng maybahay" : "Complete the week of visits and refresh all household head options"}
                  >
                    <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    {language === "tl" ? "Tapusin ang Linggo" : "End Week"}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setClearFormDialogOpen(true)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title={language === "tl" ? "Burahin ang mga nakasulat sa aktibong form" : "Clear all active rows"}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {language === "tl" ? "I-clear ang Form" : "Clear Form"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="text-center space-y-1 py-2 no-print">
            <h1 
              className="text-xl md:text-2xl font-bold tracking-widest text-foreground uppercase"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SEARCH AND DESTROY 2026
            </h1>
            <p className="font-serif italic text-xs md:text-sm text-muted-foreground tracking-wide">
              {language === "tl"
                ? "“Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue”"
                : "“Search and destruction of mosquitoes carrying Dengue virus”"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-primary/10 text-primary font-heading">
                  <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                    {language === "tl" ? "PANGALAN NG MAYBAHAY" : "HOUSEHOLD HEAD NAME"}
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                    {language === "tl" ? "URI NG LALAGYAN O TIRAHAN NG LAMOK" : "CONTAINER / BREEDING SITE"}
                  </th>
                  <th className="border border-border p-1.5 font-bold text-center w-[14%]" colSpan={2}>
                    {language === "tl" ? "KITI-KITI" : "LARVAE (KITI-KITI)"}
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[20%]" rowSpan={2}>
                    {language === "tl" ? "ACTION PLAN/DAPAT NA GAWIN" : "ACTION PLAN / MEASURES"}
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[10%]" rowSpan={2}>
                    {language === "tl" ? "LAGDA" : "SIGNATURE"}
                  </th>
                  {!isMidwife && (
                    <th className="border border-border p-2 font-bold text-center w-[5%] no-print" rowSpan={2}>
                      
                    </th>
                  )}
                </tr>
                <tr className="bg-primary/10 text-primary font-heading">
                  <th className="border border-border p-1 text-[10px] font-bold text-center">
                    {language === "tl" ? "MERON" : "PRESENT"}
                  </th>
                  <th className="border border-border p-1 text-[10px] font-bold text-center">
                    {language === "tl" ? "WALA" : "ABSENT"}
                  </th>
                </tr>
              </thead>
              <tbody className={isMidwife ? "pointer-events-none opacity-90" : ""}>
                {records.map((rec) => {
                  const availableHeads = getAvailableHeadsForRow(rec.id, rec.household_name || "");
                  const datalistId = `household-heads-list-${rec.id}`;
                  return (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border p-0 font-medium relative">
                      <span className="print-only px-2 py-0.5 font-medium text-black">
                        {rec.household_name || ""}
                      </span>
                      <input
                        disabled={isMidwife}
                        list={datalistId}
                        type="text"
                        value={rec.household_name || ""}
                        onKeyDown={allowOnlyLetters}
                        onChange={(e) => handleHouseholdNameChange(rec.id, sanitizeLetters(e.target.value))}
                        onBlur={() => {
                          if (isMidwife) return;
                          const cleanName = (rec.household_name || "").trim();
                          if (cleanName && !rec.signature) {
                            const matched = householdHeads.find(
                              (h) => normalizeResidentName(h.full_name) === normalizeResidentName(cleanName)
                            );
                            const sig = findSignatureForResident(
                              cleanName,
                              matched?.id || rec.resident_id,
                              matched?.full_name
                            );
                            if (sig) {
                              setRecords((prev) => {
                                const updated = prev.map((r) =>
                                  r.id === rec.id
                                    ? { ...r, signature: sig, resident_id: matched?.id || r.resident_id }
                                    : r
                                );
                                const target = updated.find((r) => r.id === rec.id);
                                if (target) autoSaveRowToDb(target);
                                return updated;
                              });
                              return;
                            }
                          }
                          autoSaveRowToDb(rec);
                        }}
                        className={`cell-input ${isMidwife ? "cursor-default select-text" : ""}`}
                        placeholder=""
                      />
                      <datalist id={datalistId}>
                        {availableHeads.map((head, idx) => (
                          <option key={head.id || `head-${rec.id}-${idx}`} value={head.full_name}>
                            {head.sitio ? `Sitio ${head.sitio}` : "Household Head"}
                          </option>
                        ))}
                      </datalist>
                    </td>
                    <td className="border border-border p-0">
                      <span className="print-only px-2 py-0.5 text-black">
                        {rec.container_type || ""}
                      </span>
                      <input
                        disabled={isMidwife}
                        type="text"
                        value={rec.container_type || ""}
                        onChange={(e) => handleContainerTypeChange(rec.id, e.target.value)}
                        onBlur={() => autoSaveRowToDb(rec)}
                        className={`cell-input ${isMidwife ? "cursor-default select-text" : ""}`}
                        placeholder=""
                      />
                    </td>
                    <td 
                      onClick={() => !isMidwife && handleToggleLarvae(rec.id, true)}
                      className={`border border-border p-0 text-center text-base text-primary font-bold ${isMidwife ? "cursor-default" : "cursor-pointer hover:bg-muted/20"} select-none w-7 h-10`}
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        {rec.has_larvae === true ? "✓" : ""}
                      </div>
                    </td>
                    <td 
                      onClick={() => !isMidwife && handleToggleLarvae(rec.id, false)}
                      className={`border border-border p-0 text-center text-base text-muted-foreground font-bold ${isMidwife ? "cursor-default" : "cursor-pointer hover:bg-muted/20"} select-none w-7 h-10`}
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        {rec.has_larvae === false ? "✓" : ""}
                      </div>
                    </td>
                    <td className="border border-border p-0">
                      <span className="print-only px-2 py-0.5 text-black">
                        {rec.action_plan || ""}
                      </span>
                      <input
                        disabled={isMidwife}
                        type="text"
                        value={rec.action_plan || ""}
                        onChange={(e) => handleActionPlanChange(rec.id, e.target.value)}
                        onBlur={() => autoSaveRowToDb(rec)}
                        className={`cell-input ${isMidwife ? "cursor-default select-text" : ""}`}
                        placeholder=""
                      />
                    </td>
                    <td 
                      onClick={() => {
                        if (isMidwife) return;
                        setActiveSignRecordId(rec.id);
                        setSignatureModalOpen(true);
                      }}
                      className={`border border-border p-1 text-center ${isMidwife ? "cursor-default" : "cursor-pointer hover:bg-muted/20"} w-[10%] h-10 select-none`}
                    >
                      {rec.signature ? (
                        <img 
                          src={rec.signature} 
                          alt="Signature" 
                          className="h-8 object-contain mx-auto" 
                        />
                      ) : (
                        ""
                      )}
                    </td>
                    {!isMidwife && (
                      <td className="border border-border p-1 text-center no-print w-10">
                        {!isRowEmpty(rec) && (
                          <Button 
                            onClick={() => setDeleteRowConfirm({ id: rec.id, name: rec.household_name || "this row" })} 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Clear entry"
                          >
                            <Trash className="h-4.5 w-4.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Printable Official Footer Signatures */}
          <div
            className="print-only print-footer-signatures pt-8 mt-6 border-t border-slate-300 text-xs text-slate-800 w-full"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <div style={{ textAlign: "left" }}>
              Certified Correct: ___________________________<br />
              <span className="text-[10px] text-slate-600">Attending Barangay Health Worker</span>
            </div>
            <div style={{ textAlign: "right" }}>
              Approved By: ___________________________<br />
              <span className="text-[10px] text-slate-600">Barangay Health Supervisor / Midwife</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 no-print flex-wrap">
            {!isMidwife && (
              <>
                <Button 
                  onClick={handleSaveAll} 
                  disabled={saving} 
                  size="sm" 
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Progress"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClearFormDialogOpen(true)}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {language === "tl" ? "I-clear ang Form" : "Clear Form"}
                </Button>
              </>
            )}
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrintForm} 
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold px-4 h-9 text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* SAVED DENGUE FORMS HISTORY LIST (History View) */}
      {activeView === "history" && (
        <div className="no-print space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
            <div>
              <h3 className="text-base font-bold font-heading flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Saved Dengue Prevention Checklist History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review and re-print previously completed and signed Search & Destroy monitoring forms.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search date or household..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={historySitio} onValueChange={setHistorySitio}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="All Sitios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sitios</SelectItem>
                  {sitioOptions.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {savedForms.length === 0 ? (
            <Card className="border border-dashed border-border/70 p-8 text-center bg-muted/20">
              <CardContent className="p-0 flex flex-col items-center justify-center">
                <FileCheck className="h-10 w-10 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">No saved forms yet.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When you fill out the checklist and click "Print Form", the completed form will be saved and listed here so you can view or re-print it anytime.
                </p>
              </CardContent>
            </Card>
          ) : filteredSavedForms.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-lg border border-border/40">
              No saved dengue forms match "{historySearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredSavedForms.map((sf, index) => {
                const positiveCount = sf.records.filter(r => r.has_larvae === true).length;
                return (
                  <Card key={sf.id} className="border border-border/60 hover:border-primary/40 transition-colors shadow-xs">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-foreground text-base">
                            Form #{savedForms.length - index}: Search & Destroy Form
                          </span>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                            {sf.records.length} {sf.records.length === 1 ? "Household" : "Households"}
                          </Badge>
                          {positiveCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {positiveCount} Larvae Positive
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                              0 Larvae Detected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary/70" />
                            {sf.formattedDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setViewingSavedForm(sf);
                            setViewModalOpen(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="View Form"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePrintSavedForm(sf)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Re-Print Form"
                        >
                          <Printer className="h-4.5 w-4.5" />
                        </Button>
                        {!isMidwife && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteSavedFormConfirmId(sf.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete Form"
                          >
                            <Trash2 className="h-4.5 w-4.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      <Dialog open={signatureModalOpen} onOpenChange={(open) => { setSignatureModalOpen(open); if (!open) setConsentChecked(false); }}>
        <DialogContent className="max-w-md bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {language === "tl" ? "Lagda ng Maybahay (Resident Signature)" : "Resident Signature"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {language === "tl"
                ? "Pumirma sa ibaba gamit ang iyong touchscreen, mouse, o touchpad."
                : "Sign below using your touchscreen, mouse, or touchpad."}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="border border-slate-300 dark:border-slate-700 rounded-md w-full bg-white dark:bg-slate-950 touch-none cursor-crosshair"
            />
          </div>

          {/* Consent Notice */}
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <p className="leading-snug">
              <span className="font-bold">
                {language === "tl" ? "Abiso ng Pahintulot (Consent Notice):" : "Consent Notice:"}
              </span>{" "}
              {language === "tl"
                ? "Sa pag-sign dito, inihahayag ng residente na siya/sila ay nagbibigay ng pahintulot sa Barangay Health Worker (BHW) na i-save ang kanilang electronic na lagda para sa awtomatikong paggamit sa susunod na mga okasyon."
                : "By signing here, the resident authorizes the Barangay Health Worker (BHW) system to save and automatically apply this electronic signature for future forms under the same name."}
            </p>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="signature-consent-checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-amber-600 shrink-0 cursor-pointer"
              />
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                {language === "tl"
                  ? "Pumapayag ako na i-save ang aking lagda para sa susunod na paggamit. (Magpatuloy)"
                  : "I allow the system to save this signature for future use. (Continue)"}
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={clearCanvas}>
              {language === "tl" ? "Burahin" : "Clear"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSignatureModalOpen(false); setConsentChecked(false); }}>
              {language === "tl" ? "Kanselahin" : "Cancel"}
            </Button>
            <Button type="button" onClick={saveSignature} className="bg-primary text-white font-bold">
              {language === "tl" ? "I-save ang Lagda" : "Save Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Re-Print Saved Form Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-5xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span>{language === "tl" ? "Nai-save na Checklist sa Pag-iwas sa Dengue" : "Saved Dengue Prevention Checklist"}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {viewingSavedForm?.formattedDate}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {language === "tl"
                ? "Tingnan ang mga opisyal na tala at i-print o muling i-print ang historical batch na ito."
                : "View official records and print or re-print this historical batch."}
            </DialogDescription>
          </DialogHeader>

          {viewingSavedForm && (
            <Card
              id="saved-form-print-area"
              className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <CardContent className="p-8 space-y-6">
                {/* Official Header Layout - Visible ONLY when printing */}
                <div className="print-only" style={{ display: "none" }}>
                  <OfficialHeader
                    title={language === "tl" ? "PAG-IWAS SA DENGUE 2026 — Search and Destroy Checklist" : "SEARCH AND DESTROY 2026 — Dengue Prevention Checklist"}
                    subtitle={language === "tl" ? "Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue • Barangay Subukin" : "Search and destruction of mosquitoes carrying Dengue virus • Barangay Subukin"}
                    showDoubleBorder={true}
                    logoHeight="95px"
                  />
                </div>

                <div className="text-center space-y-1 py-2">
                  <h1 
                    className="text-xl md:text-2xl font-bold tracking-widest text-foreground uppercase"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    SEARCH AND DESTROY 2026
                  </h1>
                  <p className="font-serif italic text-xs md:text-sm text-muted-foreground tracking-wide">
                    {language === "tl"
                      ? "“Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue”"
                      : "“Search and destruction of mosquitoes carrying Dengue virus”"}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border text-left text-xs md:text-sm">
                    <thead>
                      <tr className="bg-primary/10 text-primary font-heading">
                        <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                          {language === "tl" ? "PANGALAN NG MAYBAHAY" : "HOUSEHOLD HEAD NAME"}
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                          {language === "tl" ? "URI NG LALAGYAN O TIRAHAN NG LAMOK" : "CONTAINER / BREEDING SITE"}
                        </th>
                        <th className="border border-border p-1.5 font-bold text-center w-[14%]" colSpan={2}>
                          {language === "tl" ? "KITI-KITI" : "LARVAE (KITI-KITI)"}
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[20%]" rowSpan={2}>
                          {language === "tl" ? "ACTION PLAN/DAPAT NA GAWIN" : "ACTION PLAN / MEASURES"}
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[10%]" rowSpan={2}>
                          {language === "tl" ? "LAGDA" : "SIGNATURE"}
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[5%] no-print" rowSpan={2}>
                        </th>
                      </tr>
                      <tr className="bg-primary/10 text-primary font-heading">
                        <th className="border border-border p-1 text-[10px] font-bold text-center">
                          {language === "tl" ? "MERON" : "PRESENT"}
                        </th>
                        <th className="border border-border p-1 text-[10px] font-bold text-center">
                          {language === "tl" ? "WALA" : "ABSENT"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaddedSavedRecords(viewingSavedForm.records).map((rec: any, idx: number) => (
                        <tr key={rec.id || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="border border-border p-0 font-medium relative">
                            <span className="px-2 py-0.5 font-medium text-foreground dark:text-foreground">
                              {rec.household_name || ""}
                            </span>
                          </td>
                          <td className="border border-border p-0">
                            <span className="px-2 py-0.5 text-foreground dark:text-foreground">
                              {rec.container_type || ""}
                            </span>
                          </td>
                          <td className="border border-border p-0 text-center text-base text-primary font-bold w-7">
                            <div className="flex items-center justify-center h-full w-full">
                              {rec.has_larvae === true ? "✓" : ""}
                            </div>
                          </td>
                          <td className="border border-border p-0 text-center text-base text-muted-foreground font-bold w-7">
                            <div className="flex items-center justify-center h-full w-full">
                              {rec.has_larvae === false ? "✓" : ""}
                            </div>
                          </td>
                          <td className="border border-border p-0">
                            <span className="px-2 py-0.5 text-foreground dark:text-foreground">
                              {rec.action_plan || ""}
                            </span>
                          </td>
                          <td className="border border-border p-1 text-center w-[10%]">
                            {rec.signature ? (
                              <img 
                                src={rec.signature} 
                                alt="Signature" 
                                className="h-8 object-contain mx-auto" 
                              />
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Printable Official Footer Signatures */}
                <div
                  className="print-only print-footer-signatures pt-8 mt-6 border-t border-slate-300 text-xs text-slate-800 w-full"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    width: "100%",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    Certified Correct: ___________________________<br />
                    <span className="text-[10px] text-slate-600">Attending Barangay Health Worker</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    Approved By: ___________________________<br />
                    <span className="text-[10px] text-slate-600">Barangay Health Supervisor / Midwife</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2 mt-4 no-print">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Row Confirmation Dialog */}
      <AlertDialog open={!!deleteRowConfirm} onOpenChange={() => setDeleteRowConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear entry data?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the entered data for &ldquo;{deleteRowConfirm?.name}&rdquo;? The row will be reset to blank and stay on the form so it maintains a total of 20 rows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRowConfirm) {
                  handleDeleteRow(deleteRowConfirm.id, deleteRowConfirm.name);
                  setDeleteRowConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Saved Form Confirmation Dialog */}
      <AlertDialog open={!!deleteSavedFormConfirmId} onOpenChange={() => setDeleteSavedFormConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved Dengue form batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this saved Dengue form and its recorded entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSavedFormConfirmId) {
                  handleDeleteSavedForm(deleteSavedFormConfirmId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Week Confirmation Dialog */}
      <AlertDialog open={endWeekDialogOpen} onOpenChange={setEndWeekDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-amber-600" />
              {language === "tl" ? "Tapusin ang Lingguhang Pagbisita?" : "End Current Week Home Visits?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
              <p>
                {language === "tl"
                  ? `Tatapusin nito ang siklo ng pagbisita para sa kasalukuyang linggo (${weekDetails.weekRangeLabel}).`
                  : `This marks the completion of home visits for this week (${weekDetails.weekRangeLabel}).`}
              </p>
              <p>
                {language === "tl"
                  ? "Lahat ng pangalan ng maybahay ay muling makikita sa mga pagpipilian para sa susunod na linggo, at ang petsa ay ililipat sa bagong linggo."
                  : "All household head names will reappear in the options list for the new week, and the date will advance to the next week."}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "tl" ? "Kanselahin" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndWeek}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {language === "tl" ? "Oo, Tapusin ang Linggo" : "Yes, End Week"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Active Form Confirmation Dialog */}
      <AlertDialog open={clearFormDialogOpen} onOpenChange={setClearFormDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {language === "tl" ? "I-clear ang Aktibong Form?" : "Clear Active Form Rows?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {language === "tl"
                ? "Mabubura ang lahat ng kasalukuyang nakasulat sa 20 hanay ng aktibong form upang makapagsimula muli. Ang mga naitala na sa History ay hindi maaapektuhan."
                : "This will clear all 20 rows on the active form so you can start fresh. Records already saved to History will not be affected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "tl" ? "Kanselahin" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearForm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {language === "tl" ? "I-clear ang Form" : "Clear Form"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DenguePreventionForm;
