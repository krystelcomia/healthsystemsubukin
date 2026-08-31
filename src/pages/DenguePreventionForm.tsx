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
import { Bug, Printer, Trash2, Trash, Save, Eye, History, FileCheck, Calendar, Search, FileText } from "lucide-react";
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

const findSignatureForResident = (
  name?: string | null,
  resId?: string | null,
  activeRows?: any[],
  fallbackName?: string | null
): string => {
  const cleanName = normalizeResidentName(name);
  const cleanFallbackName = normalizeResidentName(fallbackName);
  const cleanId = (resId || "").trim();

  // 1. Check current active rows in memory
  if (activeRows && Array.isArray(activeRows)) {
    const matchedRow = activeRows.find((r) => {
      if (!r.signature || !r.signature.trim()) return false;
      const rowName = normalizeResidentName(r.household_name);
      if (cleanName && rowName && rowName === cleanName) return true;
      if (cleanFallbackName && rowName && rowName === cleanFallbackName) return true;
      if (cleanId && r.resident_id && r.resident_id.trim() === cleanId) return true;
      return false;
    });
    if (matchedRow?.signature) return matchedRow.signature;
  }

  // 2. Check local storage cache
  const stored = getStoredSignatures();
  if (cleanName && stored[cleanName]) return stored[cleanName];
  if (cleanFallbackName && stored[cleanFallbackName]) return stored[cleanFallbackName];
  if (cleanId && stored[cleanId]) return stored[cleanId];

  return "";
};

const DenguePreventionForm = () => {
  const { t, language } = useSettings();
  const { userRole } = useAuth();
  const isMidwife = userRole === "midwife";
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

    // Collect and cache all existing resident signatures from database and historical batches
    dbRecords.forEach((rec: any) => {
      if (rec.signature && rec.signature.trim()) {
        storeSignatureForResident(rec.household_name, rec.signature, rec.resident_id);
      }
    });
    Object.values(savedBatchesMap).forEach((batch) => {
      (batch.records || []).forEach((rec: any) => {
        if (rec.signature && rec.signature.trim()) {
          storeSignatureForResident(rec.household_name, rec.signature, rec.resident_id);
        }
      });
    });

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
          const hasAnyData = parsed.some((r: any) => !isRowEmpty(r));
          if (hasAnyData) {
            initialRows = parsed.slice(0, MAX_ROWS);
          }
        }
      } catch {}
    }

    // If no active draft, load unmapped DB records so the form keeps its data
    if (initialRows.length === 0 && unmappedDbRecords.length > 0) {
      initialRows = unmappedDbRecords.slice(0, MAX_ROWS);
    }

    // Only start with fresh blank rows if there is truly no data
    if (initialRows.length === 0) {
      initialRows = createBlankRows(MAX_ROWS);
    }

    // Auto-populate resident signatures only for active rows that have a household name entered
    initialRows = initialRows.map((r) => {
      if (r.household_name?.trim() && !r.signature) {
        const cleanName = (r.household_name || "").trim();
        const matched = householdHeads.find(
          (h) => normalizeResidentName(h.full_name) === normalizeResidentName(cleanName)
        );
        const sig = findSignatureForResident(
          cleanName,
          r.resident_id || matched?.id,
          initialRows,
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
    if (!row) return;

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
          if (data.signature && data.signature.trim()) {
            storeSignatureForResident(data.household_name, data.signature, data.resident_id);
          }
          setRecords((prev) => {
            const updated = prev.map((r) => (r.id === row.id ? { ...data } : r));
            localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(updated));
            return updated;
          });
        }
      }

      if (row.signature && row.signature.trim()) {
        storeSignatureForResident(row.household_name, row.signature, resId || row.resident_id);
      }

      window.dispatchEvent(new Event("dengue-records-updated"));
      window.dispatchEvent(new Event("resident-records-updated"));
    } catch (err) {
      console.error("Dengue row auto-save error:", err);
    }
  };



  const queueAutoSaveRow = (row: any) => {
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
    const cleanName = value.trim();
    const normInput = normalizeResidentName(value);
    const matched = householdHeads.find(
      (h) => normalizeResidentName(h.full_name) === normInput
    );

    // Look up if this resident has an existing signature recorded from initial or past entry
    const existingSig = cleanName
      ? findSignatureForResident(value, matched?.id, records, matched?.full_name)
      : "";

    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          const updatedRow = {
            ...r,
            household_name: value,
            resident_id: matched?.id || (matched ? r.resident_id : null),
            // Automatically populate signature if previously provided, or clear if name was cleared
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

  // Signature is stored, cached for the resident, and auto-populated for any matching rows
  const saveSignature = () => {
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
      // Only persist the signature to storage if the resident has given consent
      if (consentChecked) {
        storeSignatureForResident(targetName, dataUrl, targetResId);
        if (matchedHead?.full_name && matchedHead.full_name !== targetName) {
          storeSignatureForResident(matchedHead.full_name, dataUrl, targetResId);
        }
      }
    }

    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.id === activeSignRecordId) {
          return { ...r, signature: dataUrl, resident_id: targetResId || r.resident_id };
        }
        const rowNormName = normalizeResidentName(r.household_name);
        const matchesName =
          (normTargetName && rowNormName === normTargetName) ||
          (normMatchedHeadName && rowNormName === normMatchedHeadName);
        const matchesId = Boolean(targetResId && r.resident_id && r.resident_id === targetResId);

        // Auto-populate for any other row with the same resident name/id currently lacking a signature
        if (!r.signature && (matchesName || matchesId)) {
          const autoSignedRow = {
            ...r,
            signature: dataUrl,
            resident_id: targetResId || r.resident_id,
          };
          autoSaveRowToDb(autoSignedRow);
          return autoSignedRow;
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
    const nonEmptyRecords = records.filter((r) => !isRowEmpty(r));
    if (nonEmptyRecords.length === 0) {
      toast.error(t("dengue.noRecordsToSave") || "No records to save.");
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

      // Check if the form is fully populated (all rows have data)
      const savedNonEmpty = updatedRecords.filter((r) => !isRowEmpty(r));
      const isFormComplete = savedNonEmpty.length >= MAX_ROWS;

      if (isFormComplete) {
        // Archive the completed form as a saved batch in history
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

        // Reset the active form to blank rows for the next batch
        const blankRows = createBlankRows(MAX_ROWS);
        setRecords(blankRows);
        localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(blankRows));

        toast.success("Form complete! All entries saved to history. The form has been reset for a new batch.");
      } else {
        // Partial save — keep entries on the form
        setRecords(updatedRecords);
        localStorage.setItem(STORAGE_KEY_ACTIVE_DRAFT, JSON.stringify(updatedRecords));
        toast.success(t("dengue.saveSuccess") || "Progress saved! All entries remain on the form.");
      }

      window.dispatchEvent(new Event("resident-records-updated"));
      window.dispatchEvent(new Event("dengue-records-updated"));

      logActivity("update_dengue", {
        entity_type: "dengue_prevention",
        description: isFormComplete
          ? `Completed and archived ${savedNonEmpty.length} record(s) in Dengue prevention checklist form`
          : `Saved ${nonEmptyRecords.length} record(s) in Dengue prevention checklist form`,
      });

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
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner Header matching Dashboard */}
      <PageHeaderBanner
        icon={Bug}
        badge={language === "tl" ? "Talaan ng Dengue Prevention" : "Dengue Prevention Record"}
        title={language === "tl" ? "Dengue Prevention — Search & Destroy 2026" : "Dengue Prevention — Search & Destroy 2026"}
        description={language === "tl" ? "Pagsubaybay sa kiti-kiti, inspeksyon ng lalagyan ng tubig, at pagsubaybay sa plano ng pagkilos sa Barangay Subukin." : "Household larvae monitoring, breeding container inspection, and action plan tracking for Barangay Subukin."}
        rightContent={
          <div className="flex items-center gap-1.5 p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xs">
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
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Form
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
              title="SEARCH AND DESTROY 2026 — Dengue Prevention Checklist"
              subtitle="Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue • Barangay Subukin"
              showDoubleBorder={true}
              logoHeight="95px"
            />
          </div>

          {/* Header Bar with Barangay Subukin note (Hidden when printing) */}
          <div className="flex items-center justify-between gap-2 no-print pb-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              BRGY: <strong className="text-foreground">SUBUKIN</strong>
            </span>
          </div>

          <div className="text-center space-y-1 py-2 no-print">
            <h1 
              className="text-xl md:text-2xl font-bold tracking-widest text-foreground uppercase"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SEARCH AND DESTROY 2026
            </h1>
            <p className="font-serif italic text-xs md:text-sm text-muted-foreground tracking-wide">
              &ldquo;Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue&rdquo;
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-primary/10 text-primary font-heading">
                  <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                    PANGALAN NG MAYBAHAY
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                    URI NG LALAGYAN O TIRAHAN NG LAMOK
                  </th>
                  <th className="border border-border p-1.5 font-bold text-center w-[14%]" colSpan={2}>
                    KITI-KITI
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[20%]" rowSpan={2}>
                    ACTION PLAN/DAPAT NA GAWIN
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[10%]" rowSpan={2}>
                    LAGDA
                  </th>
                  <th className="border border-border p-2 font-bold text-center w-[5%] no-print" rowSpan={2}>
                    
                  </th>
                </tr>
                <tr className="bg-primary/10 text-primary font-heading">
                  <th className="border border-border p-1 text-[10px] font-bold text-center">
                    MERON
                  </th>
                  <th className="border border-border p-1 text-[10px] font-bold text-center">
                    WALA
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border p-0 font-medium relative">
                      <span className="print-only px-2 py-0.5 font-medium text-black">
                        {rec.household_name || ""}
                      </span>
                      <input
                        list="household-heads-list"
                        type="text"
                        value={rec.household_name || ""}
                        onKeyDown={allowOnlyLetters}
                        onChange={(e) => handleHouseholdNameChange(rec.id, sanitizeLetters(e.target.value))}
                        onBlur={() => {
                          const cleanName = (rec.household_name || "").trim();
                          if (cleanName && !rec.signature) {
                            const matched = householdHeads.find(
                              (h) => normalizeResidentName(h.full_name) === normalizeResidentName(cleanName)
                            );
                            const sig = findSignatureForResident(
                              cleanName,
                              matched?.id || rec.resident_id,
                              records,
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
                        className="cell-input"
                        placeholder=""
                      />
                    </td>
                    <td className="border border-border p-0">
                      <span className="print-only px-2 py-0.5 text-black">
                        {rec.container_type || ""}
                      </span>
                      <input
                        type="text"
                        value={rec.container_type || ""}
                        onChange={(e) => handleContainerTypeChange(rec.id, e.target.value)}
                        onBlur={() => autoSaveRowToDb(rec)}
                        className="cell-input"
                        placeholder=""
                      />
                    </td>
                    <td 
                      onClick={() => handleToggleLarvae(rec.id, true)}
                      className="border border-border p-0 text-center text-base text-primary font-bold cursor-pointer hover:bg-muted/20 select-none w-7 h-10"
                    >
                      <div className="flex items-center justify-center h-full w-full">
                        {rec.has_larvae === true ? "✓" : ""}
                      </div>
                    </td>
                    <td 
                      onClick={() => handleToggleLarvae(rec.id, false)}
                      className="border border-border p-0 text-center text-base text-muted-foreground font-bold cursor-pointer hover:bg-muted/20 select-none w-7 h-10"
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
                        type="text"
                        value={rec.action_plan || ""}
                        onChange={(e) => handleActionPlanChange(rec.id, e.target.value)}
                        onBlur={() => autoSaveRowToDb(rec)}
                        className="cell-input"
                        placeholder=""
                      />
                    </td>
                    <td 
                      onClick={() => {
                        setActiveSignRecordId(rec.id);
                        setSignatureModalOpen(true);
                      }}
                      className="border border-border p-1 text-center cursor-pointer hover:bg-muted/20 w-[10%] h-10 select-none"
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

          <datalist id="household-heads-list">
            {householdHeads.map((head, idx) => (
              <option key={head.id || `head-${idx}`} value={head.full_name}>
                {head.sitio ? `Sitio ${head.sitio}` : "Household Head"}
              </option>
            ))}
          </datalist>

          <div className="flex items-center justify-end gap-2 mt-4 no-print flex-wrap">
            {!isMidwife && (
              <Button 
                onClick={handleSaveAll} 
                disabled={saving} 
                size="sm" 
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Progress"}
              </Button>
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
              Lagda ng Maybahay (Resident Signature)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Pumirma sa ibaba gamit ang iyong touchscreen, mouse, o touchpad.
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
              <span className="font-bold">Consent Notice / Abiso ng Pahintulot:</span>{" "}
              Sa pag-sign dito, inihahayag ng residente na siya/sila ay nagbibigay ng pahintulot sa Barangay Health Worker (BHW) na i-save ang kanilang electronic na lagda para sa awtomatikong paggamit sa susunod na mga okasyon.
            </p>
            <p className="leading-snug">
              By signing, the resident authorizes the BHW system to save and automatically apply this e-signature for future forms under the same name.
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
                I allow — Pumapayag ako na i-save ang aking lagda para sa susunod na paggamit. (Continue)
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={clearCanvas}>
              Clear
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSignatureModalOpen(false); setConsentChecked(false); }}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSignature} className="bg-primary text-white font-bold">
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Re-Print Saved Form Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-5xl bg-white text-slate-900 border border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span>Saved Dengue Prevention Checklist</span>
              <span className="text-xs font-normal text-muted-foreground">
                {viewingSavedForm?.formattedDate}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              View official records and print or re-print this historical batch.
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
                    title="SEARCH AND DESTROY 2026 — Dengue Prevention Checklist"
                    subtitle="Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue • Barangay Subukin"
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
                    &ldquo;Paghahanap at pagsugpo ng lamok na nagdadala ng sakit na Dengue&rdquo;
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border text-left text-xs md:text-sm">
                    <thead>
                      <tr className="bg-primary/10 text-primary font-heading">
                        <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                          PANGALAN NG MAYBAHAY
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[28%]" rowSpan={2}>
                          URI NG LALAGYAN O TIRAHAN NG LAMOK
                        </th>
                        <th className="border border-border p-1.5 font-bold text-center w-[14%]" colSpan={2}>
                          KITI-KITI
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[20%]" rowSpan={2}>
                          ACTION PLAN/DAPAT NA GAWIN
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[10%]" rowSpan={2}>
                          LAGDA
                        </th>
                        <th className="border border-border p-2 font-bold text-center w-[5%] no-print" rowSpan={2}>
                        </th>
                      </tr>
                      <tr className="bg-primary/10 text-primary font-heading">
                        <th className="border border-border p-1 text-[10px] font-bold text-center">
                          MERON
                        </th>
                        <th className="border border-border p-1 text-[10px] font-bold text-center">
                          WALA
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
    </div>
  );
};

export default DenguePreventionForm;
