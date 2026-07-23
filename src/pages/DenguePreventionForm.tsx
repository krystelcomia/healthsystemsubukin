import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bug, Plus, Printer, Trash2, Trash, Save, UserCheck } from "lucide-react";
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

const DenguePreventionForm = () => {
  const { t } = useSettings();
  const [records, setRecords] = useState<any[]>([]);
  const [householdHeads, setHouseholdHeads] = useState<HouseholdHeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const MAX_ROWS = 20;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [activeSignRecordId, setActiveSignRecordId] = useState<string | null>(null);

  const fetchHouseholdHeads = async () => {
    try {
      const [famRes, resRes] = await Promise.all([
        supabase.from("family_data").select("id, father_name, resident_id, sitio"),
        supabase.from("residents").select("id, full_name, sitio"),
      ]);

      const famData = famRes.data || [];
      const resData = resRes.data || [];

      const headsMap = new Map<string, HouseholdHeadOption>();

      // Household heads refer ONLY to father_name (household head) in family_data
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
      .order("created_at", { ascending: true });
    
    if (error) {
      toast.error("Failed to load records");
    } else {
      const dbRecords = data || [];
      // Pad to exactly 20 rows in state
      const paddedRecords = dbRecords.slice(0, MAX_ROWS);
      for (let i = paddedRecords.length; i < MAX_ROWS; i++) {
        paddedRecords.push({
          id: `temp-${i}-${Date.now()}`,
          resident_id: null,
          household_name: "",
          container_type: "",
          has_larvae: null,
          action_plan: "",
          signature: ""
        });
      }
      setRecords(paddedRecords);
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

    // Auto-link/create resident record in DB
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

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeSignRecordId) return;

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureModalOpen(false);

    const record = records.find(r => r.id === activeSignRecordId);
    if (!record) return;

    const resId = await resolveResidentId(record.household_name, record.resident_id);

    if (activeSignRecordId.startsWith("temp-")) {
      setRecords(prev => prev.map(r => r.id === activeSignRecordId ? { ...r, signature: dataUrl, resident_id: resId } : r));

      const isCurrentlyEmpty = 
        !record.household_name?.trim() &&
        !record.container_type?.trim() &&
        !record.action_plan?.trim();

      if (isCurrentlyEmpty) return;

      const newRow = {
        resident_id: resId,
        household_name: record.household_name,
        container_type: record.container_type,
        has_larvae: record.has_larvae,
        action_plan: record.action_plan,
        signature: dataUrl
      };

      const { data, error } = await supabase
        .from("dengue_prevention")
        .insert(newRow)
        .select()
        .single();

      if (error) {
        toast.error("Failed to save row");
      } else {
        setRecords(prev => prev.map(r => r.id === activeSignRecordId ? data : r));
        logActivity("submit_dengue", {
          entity_type: "dengue_prevention",
          description: `Saved new Dengue prevention checklist row with signature for: ${data.household_name || "—"}`
        });
        fetchHouseholdHeads();
      }
    } else {
      const { error } = await supabase
        .from("dengue_prevention")
        .update({ signature: dataUrl, resident_id: resId })
        .eq("id", activeSignRecordId);

      if (error) {
        toast.error("Failed to save signature");
      } else {
        setRecords(prev => prev.map(r => r.id === activeSignRecordId ? { ...r, signature: dataUrl, resident_id: resId } : r));
        logActivity("update_dengue", {
          entity_type: "dengue_prevention",
          description: `Updated signature for Dengue checklist row`
        });
      }
    }
  };

  const handleCellBlur = async (id: string, field: string, value: any) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    if (record[field] === value && !id.startsWith("temp-")) return;

    const targetName = field === "household_name" ? value : record.household_name;

    if (id.startsWith("temp-")) {
      const isCurrentlyEmpty = 
        (field === "household_name" ? !value?.trim() : !record.household_name?.trim()) &&
        (field === "container_type" ? !value?.trim() : !record.container_type?.trim()) &&
        (field === "action_plan" ? !value?.trim() : !record.action_plan?.trim()) &&
        (field === "signature" ? !value?.trim() : !record.signature?.trim());

      if (isCurrentlyEmpty) return;

      const resId = await resolveResidentId(targetName, record.resident_id);

      const newRow = {
        resident_id: resId,
        household_name: field === "household_name" ? value : record.household_name,
        container_type: field === "container_type" ? value : record.container_type,
        has_larvae: field === "has_larvae" ? value : record.has_larvae,
        action_plan: field === "action_plan" ? value : record.action_plan,
        signature: field === "signature" ? value : record.signature
      };

      const { data, error } = await supabase
        .from("dengue_prevention")
        .insert(newRow)
        .select()
        .single();

      if (error) {
        toast.error("Failed to save row");
      } else {
        setRecords(prev => prev.map(r => r.id === id ? data : r));
        logActivity("submit_dengue", {
          entity_type: "dengue_prevention",
          description: `Saved new Dengue prevention checklist row for Maybahay: ${data.household_name || "—"}`
        });
        fetchHouseholdHeads();
      }
    } else {
      const resId = await resolveResidentId(targetName, record.resident_id);

      const updates: any = { [field]: value };
      if (resId) updates.resident_id = resId;

      const { error } = await supabase
        .from("dengue_prevention")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast.error("Failed to save changes");
      } else {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value, resident_id: resId } : r));
        logActivity("update_dengue", {
          entity_type: "dengue_prevention",
          description: `Updated ${field.replace('_', ' ')} for Dengue checklist row`
        });
      }
    }
  };

  const handleToggleLarvae = async (id: string, hasLarvae: boolean) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    const targetVal = record.has_larvae === hasLarvae ? null : hasLarvae;
    const resId = await resolveResidentId(record.household_name, record.resident_id);

    if (id.startsWith("temp-")) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, has_larvae: targetVal, resident_id: resId } : r));

      const otherFieldsEmpty = 
        !record.household_name?.trim() &&
        !record.container_type?.trim() &&
        !record.action_plan?.trim() &&
        !record.signature?.trim();

      if (otherFieldsEmpty) return;

      const newRow = {
        resident_id: resId,
        household_name: record.household_name,
        container_type: record.container_type,
        has_larvae: targetVal,
        action_plan: record.action_plan,
        signature: record.signature
      };

      const { data, error } = await supabase
        .from("dengue_prevention")
        .insert(newRow)
        .select()
        .single();

      if (!error) {
        setRecords(prev => prev.map(r => r.id === id ? data : r));
        fetchHouseholdHeads();
      }
    } else {
      const { error } = await supabase
        .from("dengue_prevention")
        .update({ has_larvae: targetVal, resident_id: resId })
        .eq("id", id);

      if (error) {
        toast.error("Failed to save larvae status");
      } else {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, has_larvae: targetVal, resident_id: resId } : r));
        logActivity("update_dengue", {
          entity_type: "dengue_prevention",
          description: `Set larvae status to ${targetVal === null ? "unspecified" : targetVal ? "Meron" : "Wala"} in Dengue prevention form`
        });
      }
    }
  };

  const handleSaveAll = async () => {
    const nonEmptyRecords = records.filter(r => !isRowEmpty(r));
    if (nonEmptyRecords.length === 0) {
      toast.error(t("dengue.noRecordsToSave"));
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
        } else {
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
      fetchRecords();
    }
  };

  const handlePrintAndDelete = async () => {
    setLimitModalOpen(false);

    // 1. Trigger print window
    window.print();

    // 2. Clear records from database
    try {
      const dbRecordIds = records.filter(r => !r.id.startsWith("temp-")).map(r => r.id);
      if (dbRecordIds.length > 0) {
        await supabase
          .from("dengue_prevention")
          .delete()
          .in("id", dbRecordIds);
      } else {
        await supabase
          .from("dengue_prevention")
          .delete()
          .neq("id", "");
      }

      logActivity("delete_dengue", {
        entity_type: "dengue_prevention",
        description: "Printed and cleared Dengue prevention records (20-row limit reset)"
      });

      toast.success(t("dengue.printAndDeleteSuccess"));
      await fetchRecords();
    } catch (err) {
      console.error("Failed to clear records:", err);
      toast.error("Failed to clear records after print.");
    }
  };

  const handleAddRow = () => {
    if (records.length >= MAX_ROWS) {
      setLimitModalOpen(true);
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const newRow = {
      id: tempId,
      resident_id: null,
      household_name: "",
      container_type: "",
      has_larvae: null,
      action_plan: "",
      signature: ""
    };
    setRecords(prev => [...prev, newRow]);
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (id.startsWith("temp-")) {
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success("Row removed");
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

  const handlePrint = () => {
    window.print();
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
          #dengue-print-area, #dengue-print-area * {
            visibility: visible !important;
          }
          #dengue-print-area {
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
          #dengue-print-area tr {
            height: 32px !important;
            page-break-inside: avoid !important;
          }
          #dengue-print-area h1,
          #dengue-print-area table,
          #dengue-print-area th,
          #dengue-print-area td {
            color: black !important;
          }
          #dengue-print-area table,
          #dengue-print-area th,
          #dengue-print-area td {
            border-color: #94a3b8 !important;
          }
          .header-border {
            border-color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
          }
          .cell-input {
            border: none !important;
            box-shadow: none !important;
            background-color: transparent !important;
            padding: 0 !important;
            color: black !important;
          }
          .cell-input::placeholder,
          .cell-input::-webkit-input-placeholder,
          .cell-input:-ms-input-placeholder,
          ::placeholder {
            color: transparent !important;
            opacity: 0 !important;
            -webkit-text-fill-color: transparent !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>



      <Card 
        id="dengue-print-area" 
        className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <CardContent className="p-8 space-y-6">
          
          {/* Header Seal Layout - Visible ONLY when printing */}
          <div className="print-only flex items-center justify-center gap-8 md:gap-12 border-b-[4px] border-double border-slate-900 pb-4 header-border" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
            <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={headerTextImg} alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            <img src={barangayLogo} alt="Subukin Logo" className="h-24 md:h-32 object-contain shrink-0 mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
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
                <tr>
                  <th className="border border-border bg-muted/40 p-2 font-bold text-center text-muted-foreground w-[28%]" rowSpan={2}>
                    PANGALAN NG MAYBAHAY
                  </th>
                  <th className="border border-border bg-muted/40 p-2 font-bold text-center text-muted-foreground w-[28%]" rowSpan={2}>
                    URI NG LALAGYAN O TIRAHAN NG LAMOK
                  </th>
                  <th className="border border-border bg-muted/40 p-1.5 font-bold text-center text-muted-foreground w-[14%]" colSpan={2}>
                    KITI-KITI
                  </th>
                  <th className="border border-border bg-muted/40 p-2 font-bold text-center text-muted-foreground w-[20%]" rowSpan={2}>
                    ACTION PLAN/DAPAT NA GAWIN
                  </th>
                  <th className="border border-border bg-muted/40 p-2 font-bold text-center text-muted-foreground w-[10%]" rowSpan={2}>
                    LAGDA
                  </th>
                  <th className="border border-border bg-muted/40 p-2 font-bold text-center text-muted-foreground w-[5%] no-print" rowSpan={2}>
                    
                  </th>
                </tr>
                <tr>
                  <th className="border border-border bg-muted/40 p-1 text-[10px] font-bold text-center text-muted-foreground">
                    MERON
                  </th>
                  <th className="border border-border bg-muted/40 p-1 text-[10px] font-bold text-center text-muted-foreground">
                    WALA
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border p-0 font-medium relative">
                      <input
                        list="household-heads-list"
                        type="text"
                        value={rec.household_name || ""}
                        onChange={(e) => handleHouseholdNameChange(rec.id, e.target.value)}
                        onBlur={(e) => handleCellBlur(rec.id, "household_name", e.target.value)}
                        className="cell-input"
                        placeholder=""
                      />
                    </td>
                    <td className="border border-border p-0">
                      <input
                        type="text"
                        value={rec.container_type || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, container_type: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "container_type", e.target.value)}
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
                      <input
                        type="text"
                        value={rec.action_plan || ""}
                        onChange={(e) => {
                          setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, action_plan: e.target.value } : r));
                        }}
                        onBlur={(e) => handleCellBlur(rec.id, "action_plan", e.target.value)}
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
                          className="h-8 object-contain mx-auto print:h-8" 
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

          <div className="flex items-center justify-end gap-2 mt-4 no-print">
            <Button 
              onClick={handleSaveAll} 
              disabled={saving} 
              size="sm" 
              className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button 
              onClick={handleAddRow} 
              size="sm" 
              className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Row
            </Button>
            <Button 
              onClick={handlePrint} 
              size="sm" 
              variant="outline" 
              className="gap-1 border-primary/20 text-primary hover:bg-primary/10 font-medium shadow-sm"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

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

      <Dialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-bold text-foreground">
              {t("dengue.limitTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600 space-y-2">
            <p>
              {t("dengue.limitDesc1")}
            </p>
            <p>
              {t("dengue.limitDesc2")}
            </p>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setLimitModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handlePrintAndDelete} className="bg-destructive text-white hover:bg-destructive/90 font-medium">
              {t("dengue.printAndDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenguePreventionForm;
