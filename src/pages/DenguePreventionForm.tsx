import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bug, Printer, Trash2, Trash, Save, Eye, History, FileCheck, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import { ensureResidentExists } from "@/lib/residentLinker";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

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

const DenguePreventionForm = () => {
  const { t } = useSettings();
  const [records, setRecords] = useState<any[]>([]);
  const [householdHeads, setHouseholdHeads] = useState<HouseholdHeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const [savedForms, setSavedForms] = useState<SavedDengueForm[]>([]);
  const [viewingSavedForm, setViewingSavedForm] = useState<SavedDengueForm | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const MAX_ROWS = 20;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [activeSignRecordId, setActiveSignRecordId] = useState<string | null>(null);

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

  // Check if all 20 rows are completed to notify user and offer archiving
  useEffect(() => {
    if (loading) return;
    const filledCount = records.filter(r => !isRowEmpty(r)).length;
    if (filledCount >= MAX_ROWS && !limitModalOpen) {
      setLimitModalOpen(true);
    }
  }, [records, loading]);

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
    Object.entries(savedBatchesMap).forEach(([batchId, batch]) => {
      batch.recordIds.forEach((recId) => {
        recordToBatchMap.set(recId, batchId);
      });
    });

    const batchGroupsMap = new Map<string, { id: string; timestamp: string; records: any[] }>();
    const unassignedRecords: any[] = [];

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
      } else {
        unassignedRecords.push(rec);
      }
    });

    if (unassignedRecords.length > 0) {
      const legacyGroups = new Map<string, any[]>();
      unassignedRecords.forEach((rec: any) => {
        const dateKey = rec.created_at ? rec.created_at.substring(0, 10) : "legacy";
        if (!legacyGroups.has(dateKey)) {
          legacyGroups.set(dateKey, []);
        }
        legacyGroups.get(dateKey)!.push(rec);
      });

      legacyGroups.forEach((recs, dateKey) => {
        const legacyBatchId = `legacy_${dateKey}`;
        batchGroupsMap.set(legacyBatchId, {
          id: legacyBatchId,
          timestamp: recs[0]?.created_at || new Date().toISOString(),
          records: recs
        });
      });
    }

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

    // Load active working draft from localStorage if available
    const activeDraftStr = localStorage.getItem(STORAGE_KEY_ACTIVE_DRAFT);
    if (activeDraftStr) {
      try {
        const parsed = JSON.parse(activeDraftStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const padded = parsed.slice(0, MAX_ROWS);
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
        } else {
          setRecords(createBlankRows(MAX_ROWS));
        }
      } catch {
        setRecords(createBlankRows(MAX_ROWS));
      }
    } else {
      setRecords(createBlankRows(MAX_ROWS));
    }

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

  const handleHouseholdNameChange = (id: string, value: string) => {
    const cleanName = value.trim();
    const matched = householdHeads.find(
      (h) => h.full_name.toLowerCase() === cleanName.toLowerCase()
    );

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            household_name: value,
            resident_id: matched?.id || (matched ? r.resident_id : null),
          };
        }
        return r;
      })
    );
  };

  // Signature is stored in local React state only; no DB call until explicitly saved/printed
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeSignRecordId) return;

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureModalOpen(false);

    setRecords(prev => prev.map(r => r.id === activeSignRecordId ? { ...r, signature: dataUrl } : r));
  };

  // Toggle larvae checkmark in local React state only; no auto-save network requests
  const handleToggleLarvae = (id: string, hasLarvae: boolean) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          has_larvae: r.has_larvae === hasLarvae ? null : hasLarvae
        };
      }
      return r;
    }));
  };

  // Save Progress button: explicitly saves current records to Supabase WITHOUT transferring to Saved Forms list
  const handleSaveAll = async () => {
    const nonEmptyRecords = records.filter(r => !isRowEmpty(r));
    if (nonEmptyRecords.length === 0) {
      toast.error(t("dengue.noRecordsToSave") || "No records to save.");
      return;
    }

    setSaving(true);
    let hasError = false;

    for (const record of records) {
      if (isRowEmpty(record)) continue;
      const resId = await resolveResidentId(record.household_name, record.resident_id);

      if (record.id.startsWith("temp-")) {
        const { data, error } = await supabase
          .from("dengue_prevention")
          .insert({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature
          })
          .select()
          .single();

        if (error) {
          hasError = true;
        } else if (data) {
          setRecords(prev => prev.map(r => r.id === record.id ? data : r));
        }
      } else {
        const { error } = await supabase
          .from("dengue_prevention")
          .update({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature
          })
          .eq("id", record.id);

        if (error) {
          hasError = true;
        }
      }
    }

    setSaving(false);
    if (hasError) {
      toast.error("Some records failed to save. Please try again.");
    } else {
      toast.success(t("dengue.saveSuccess"));
      logActivity("update_dengue", {
        entity_type: "dengue_prevention",
        description: "Saved all records in Dengue prevention checklist form"
      });
    }
  };

  // Triggered when 20 rows are completed: saves to DB, archives batch into Saved Forms, and resets active draft
  const handleAcknowledgeCompletion = async () => {
    setLimitModalOpen(false);

    const nonEmptyRecords = records.filter((r) => !isRowEmpty(r));
    if (nonEmptyRecords.length === 0) return;

    setSaving(true);
    const batchId = `batch_${Date.now()}`;
    const batchTimestamp = new Date().toISOString();
    const savedDbRecords: any[] = [];

    let hasError = false;

    for (const record of records) {
      if (isRowEmpty(record)) continue;
      const resId = await resolveResidentId(record.household_name, record.resident_id);

      if (record.id.startsWith("temp-")) {
        const { data, error } = await supabase
          .from("dengue_prevention")
          .insert({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature,
            created_at: batchTimestamp
          })
          .select()
          .single();

        if (error) {
          hasError = true;
        } else if (data) {
          savedDbRecords.push(data);
        }
      } else {
        const { data, error } = await supabase
          .from("dengue_prevention")
          .update({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature
          })
          .eq("id", record.id)
          .select()
          .single();

        if (error) {
          hasError = true;
        } else if (data) {
          savedDbRecords.push(data);
        }
      }
    }

    setSaving(false);

    if (!hasError) {
      const savedBatchesMap = getSavedBatchesFromStorage();
      savedBatchesMap[batchId] = {
        timestamp: batchTimestamp,
        recordIds: savedDbRecords.map((r) => r.id),
        records: savedDbRecords
      };
      saveBatchesToStorage(savedBatchesMap);

      // Clear active draft & reset to blank rows for new 20 items
      localStorage.removeItem(STORAGE_KEY_ACTIVE_DRAFT);
      setRecords(createBlankRows(MAX_ROWS));

      toast.success(`Data moved to Saved Dengue Prevention Forms (${savedForms.length + 1}). Form reset for new entries.`);
      await fetchRecords();
    }
  };

  // Print Form button: saves data to DB, archives batch into Saved Forms, prints, and resets active draft
  const handlePrintForm = async () => {
    setLimitModalOpen(false);

    const nonEmptyRecords = records.filter((r) => !isRowEmpty(r));

    // If no data has been entered, print the blank form directly
    if (nonEmptyRecords.length === 0) {
      window.print();
      return;
    }

    setSaving(true);
    const batchId = `batch_${Date.now()}`;
    const batchTimestamp = new Date().toISOString();
    const savedDbRecords: any[] = [];

    let hasError = false;

    for (const record of records) {
      if (isRowEmpty(record)) continue;
      const resId = await resolveResidentId(record.household_name, record.resident_id);

      if (record.id.startsWith("temp-")) {
        const { data, error } = await supabase
          .from("dengue_prevention")
          .insert({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature,
            created_at: batchTimestamp
          })
          .select()
          .single();

        if (error) {
          hasError = true;
        } else if (data) {
          savedDbRecords.push(data);
        }
      } else {
        const { data, error } = await supabase
          .from("dengue_prevention")
          .update({
            resident_id: resId,
            household_name: record.household_name,
            container_type: record.container_type,
            has_larvae: record.has_larvae,
            action_plan: record.action_plan,
            signature: record.signature
          })
          .eq("id", record.id)
          .select()
          .single();

        if (error) {
          hasError = true;
        } else if (data) {
          savedDbRecords.push(data);
        }
      }
    }

    setSaving(false);

    if (hasError) {
      toast.error("Some records failed to save. Please try again.");
    } else {
      const savedBatchesMap = getSavedBatchesFromStorage();
      savedBatchesMap[batchId] = {
        timestamp: batchTimestamp,
        recordIds: savedDbRecords.map((r) => r.id),
        records: savedDbRecords
      };
      saveBatchesToStorage(savedBatchesMap);

      toast.success("Form saved successfully and archived at the bottom!");
      logActivity("submit_dengue", {
        entity_type: "dengue_prevention",
        description: `Saved and archived Dengue prevention checklist form (${savedDbRecords.length} records)`
      });

      const dateObj = new Date(batchTimestamp);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      setSavedForms((prev) => [
        {
          id: batchId,
          timestamp: batchTimestamp,
          formattedDate,
          records: savedDbRecords
        },
        ...prev
      ]);

      // Print immediately while active `records` state holds all entered user inputs
      window.print();

      // Reset form after print workflow completes
      localStorage.removeItem(STORAGE_KEY_ACTIVE_DRAFT);
      setRecords(createBlankRows(MAX_ROWS));
    }
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

    logActivity("delete_dengue", {
      entity_type: "dengue_prevention",
      description: `Deleted saved Dengue prevention form batch: ${batchId}`
    });

    toast.success("Form deleted successfully");
    fetchRecords();
  };

  const handlePrintSavedForm = (form: SavedDengueForm) => {
    setViewingSavedForm(form);
    setViewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (id.startsWith("temp-")) {
      setRecords(prev => prev.map(r => r.id === id ? {
        id: `temp-${Date.now()}`,
        resident_id: null,
        household_name: "",
        container_type: "",
        has_larvae: null,
        action_plan: "",
        signature: ""
      } : r));
      toast.success("Row cleared");
      return;
    }

    const displayName = name?.trim() || "unnamed row";
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

  return (
    <div className="w-full space-y-6">
      <style>{`
        .print-only {
          display: none !important;
        }
        .cell-input {
          width: 100%;
          height: 100%;
          background-color: transparent;
          border: none;
          outline: none;
          padding: 6px 8px;
          color: currentColor;
          font-family: inherit;
          font-size: inherit;
          transition: background-color 0.2s;
        }
        .cell-input:hover {
          background-color: hsl(var(--primary) / 0.05);
        }
        .cell-input:focus {
          background-color: hsl(var(--primary) / 0.1);
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #dengue-print-area, #dengue-print-area *,
          #saved-form-print-area, #saved-form-print-area * {
            visibility: visible !important;
          }
          div[data-radix-portal],
          div[role="dialog"],
          .fixed,
          [data-state="open"] {
            position: static !important;
            transform: none !important;
            top: auto !important;
            left: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          #dengue-print-area, #saved-form-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          html, body {
            height: 100% !important;
            overflow: hidden !important;
          }
          tr {
            height: 22px !important;
            max-height: 22px !important;
            page-break-inside: avoid !important;
          }
          td, th {
            padding: 1px 2px !important;
            font-size: 10.5px !important;
            line-height: 1.1 !important;
          }
          h1, table, th, td {
            color: black !important;
          }
          table, th, td {
            border-color: #94a3b8 !important;
          }
          .header-border {
            border-bottom: 3px double #0f172a !important;
            padding-bottom: 4px !important;
            margin-bottom: 6px !important;
            width: 100% !important;
          }
          .header-border img, #saved-form-print-area .header-border img {
            height: 68px !important;
            max-height: 68px !important;
            width: auto !important;
            object-fit: contain !important;
            mix-blend-mode: multiply !important;
          }
          td img {
            height: 18px !important;
            max-height: 18px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .cell-input {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
        }
      `}</style>

      {/* Dynamic Theme Banner */}
      <div className="no-print bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Bug className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-heading font-extrabold text-foreground tracking-tight">
              Dengue Prevention — Search & Destroy 2025
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Household larvae monitoring, breeding container inspection, and action plan tracking for Barangay Subukin.
            </p>
          </div>
        </div>
      </div>

      <Card 
        id="dengue-print-area" 
        className={`border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden ${viewModalOpen ? "no-print" : ""}`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <CardContent className="p-8 space-y-6">
          
          {/* Official Header Layout - Visible ONLY when printing */}
          <div 
            className="print-only header-border flex items-center justify-center gap-6 md:gap-10 border-b-[3px] border-double border-slate-900 pb-3 mb-4 text-center"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "3px double #000", paddingBottom: "12px", marginBottom: "16px", textAlign: "center" }}
          >
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Subukin Logo" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
          </div>

          <div className="text-center space-y-1 py-2">
            <h1 
              className="text-xl md:text-2xl font-bold tracking-widest text-foreground uppercase"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SEARCH AND DESTROY 2025
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
                        onChange={(e) => handleHouseholdNameChange(rec.id, e.target.value)}
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
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, container_type: e.target.value } : r));
                        }}
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
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, action_plan: e.target.value } : r));
                        }}
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
                          className="h-8 object-contain mx-auto print:h-5" 
                        />
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="border border-border p-1 text-center no-print w-10">
                      {!isRowEmpty(rec) && (
                        <Button 
                          onClick={() => handleDeleteRow(rec.id, rec.household_name)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

          <datalist id="household-heads-list">
            {householdHeads.map((head, idx) => (
              <option key={head.id || `head-${idx}`} value={head.full_name}>
                {head.sitio ? `Sitio ${head.sitio}` : "Household Head"}
              </option>
            ))}
          </datalist>

          <div className="flex items-center justify-end gap-2 mt-4 no-print flex-wrap">
            <Button 
              onClick={handleSaveAll} 
              disabled={saving} 
              size="sm" 
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Progress"}
            </Button>
            <Button 
              onClick={handlePrintForm} 
              disabled={saving}
              size="sm" 
              variant="outline"
              className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10 font-medium shadow-xs"
            >
              <Printer className="h-4 w-4" /> Print Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Dengue Prevention Forms Section */}
      <div className="no-print mt-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-heading font-bold text-foreground">
              Saved Dengue Prevention Forms ({savedForms.length})
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Forms saved via "Print Form" appear here for viewing and re-printing.
          </span>
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
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {savedForms.map((sf, index) => {
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteSavedForm(sf.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Form"
                      >
                        <Trash2 className="h-4.5 w-4.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-foreground">
              Lagda ng Maybahay (Resident Signature)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-500">
            Pumirma sa ibaba gamit ang iyong touchscreen, mouse, o touchpad.
          </div>
          <div className="border border-slate-200 rounded-lg p-1 bg-slate-50 flex justify-center items-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="border border-slate-300 rounded-md w-full bg-white touch-none cursor-crosshair"
            />
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={clearCanvas}>
              Clear
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSignatureModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSignature} className="bg-primary text-white">
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 20 Rows Completion Notification Modal */}
      <Dialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-foreground">
              20 Rows Completed & Form Saved
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-3">
            <p>
              You have completed all 20 rows for Dengue Prevention.
            </p>
            <p className="bg-primary/10 p-3 rounded-lg border border-primary/20 text-foreground text-xs leading-relaxed">
              The filled out data has been automatically moved to <strong className="text-primary font-bold">&ldquo;Saved Dengue Prevention Forms ({savedForms.length + 1})&rdquo;</strong>, ensuring a record is retained even after printing.
            </p>
            <p className="text-xs">
              Acknowledging this notice will reset the form, allowing you to enter a new set of 20 items.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button 
              type="button" 
              onClick={handleAcknowledgeCompletion} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md w-full"
            >
              Acknowledge & Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Re-Print Saved Form Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground p-6">
          <DialogHeader className="no-print">
            <DialogTitle className="text-lg font-heading font-bold flex items-center justify-between pr-6">
              <span>Saved Dengue Prevention Form — {viewingSavedForm?.formattedDate}</span>
            </DialogTitle>
          </DialogHeader>

          {viewingSavedForm && (
            <Card
              id="saved-form-print-area"
              className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <CardContent className="p-8 space-y-6">
                {/* Official Header Layout - Visible ONLY when printing */}
                <div 
                  className="print-only header-border flex items-center justify-center gap-6 md:gap-10 border-b-[3px] border-double border-slate-900 pb-3 mb-4 text-center"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", borderBottom: "3px double #000", paddingBottom: "12px", marginBottom: "16px", textAlign: "center" }}
                >
                  <img src={sanjuanLogo} alt="San Juan Seal" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                  <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                  <img src={barangayLogo} alt="Subukin Logo" className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply" style={{ height: "68px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                </div>

                <div className="text-center space-y-1 py-2">
                  <h1 
                    className="text-xl md:text-2xl font-bold tracking-widest text-foreground uppercase"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    SEARCH AND DESTROY 2025
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
                          <td className="border border-border p-1 text-center w-[10%] h-7">
                            {rec.signature ? (
                              <img 
                                src={rec.signature} 
                                alt="Signature" 
                                className="h-5 object-contain mx-auto print:h-5" 
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
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2 mt-4 no-print">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingSavedForm) handlePrintSavedForm(viewingSavedForm);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print / Re-Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenguePreventionForm;
