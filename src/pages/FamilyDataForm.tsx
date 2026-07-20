import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Folder, 
  FolderOpen, 
  Search, 
  Plus, 
  Printer, 
  Trash2, 
  Trash, 
  Save, 
  Users, 
  UserPlus, 
  Grid, 
  Table as TableIcon,
  X,
  Edit,
  MapPin,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { ensureResidentExists, calculateAge } from "@/lib/residentLinker";
import { getAssignedSitio, SUBUKIN_SITIOS, getDatabaseSitios } from "@/lib/sitioMapping";
import { logActivity } from "@/lib/activityLogger";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

export interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  age: number | string;
  birthday?: string;
  gender: string;
  civil_status?: string;
  notes?: string;
}

export interface FamilyRecord {
  id: string;
  resident_id?: string | null;
  family_number: string;
  num_households: number | string;
  father_name: string;
  mother_name: string;
  num_males: number | string;
  num_females: number | string;
  total_members: number;
  sitio?: string;
  members_detail?: FamilyMember[] | string;
  created_at?: string;
}

const FamilyDataForm = () => {
  const { t } = useSettings();
  const [records, setRecords] = useState<FamilyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "ledger">("grid");

  // File Detail Dialog state
  const [selectedFile, setSelectedFile] = useState<FamilyRecord | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [activeMembers, setActiveMembers] = useState<FamilyMember[]>([]);
  const [isEditingFileDetails, setIsEditingFileDetails] = useState(false);

  // Edit file header fields
  const [editFamNum, setEditFamNum] = useState("");
  const [editFather, setEditFather] = useState("");
  const [editMother, setEditMother] = useState("");
  const [editSitio, setEditSitio] = useState("");
  const [editHouseholds, setEditHouseholds] = useState<number | string>(1);

  // New Family File Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFamNum, setNewFamNum] = useState("");
  const [newFather, setNewFather] = useState("");
  const [newMother, setNewMother] = useState("");
  const [newSitio, setNewSitio] = useState("Maligaya");
  const [newHouseholds, setNewHouseholds] = useState<number | string>(1);
  const [newMembers, setNewMembers] = useState<FamilyMember[]>([]);

  // Add member modal inside opened file
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memName, setMemName] = useState("");
  const [memRole, setMemRole] = useState("Child");
  const [memAge, setMemAge] = useState<number | string>("");
  const [memBirthday, setMemBirthday] = useState("");
  const [memGender, setMemGender] = useState("Male");
  const [memStatus, setMemStatus] = useState("Single");

  const parseMembers = (membersData: any): FamilyMember[] => {
    if (!membersData) return [];
    if (Array.isArray(membersData)) return membersData;
    if (typeof membersData === "string") {
      try {
        return JSON.parse(membersData);
      } catch {
        return [];
      }
    }
    return [];
  };

  const [sitioOptions, setSitioOptions] = useState<string[]>(SUBUKIN_SITIOS);

  const fetchRecords = async () => {
    setLoading(true);
    getDatabaseSitios().then(sits => setSitioOptions(sits));
    const { data, error } = await supabase
      .from("family_data")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load family data records");
    } else {
      const dbRecords = (data || []).map((rec: any) => ({
        ...rec,
        members_detail: parseMembers(rec.members_detail)
      }));
      
      // Ensure minimum padded rows for ledger mode
      const minRows = 2;
      const paddedRecords = [...dbRecords];
      for (let i = dbRecords.length; i < minRows; i++) {
        paddedRecords.push({
          id: `temp-${i}-${Date.now()}`,
          resident_id: null,
          family_number: "",
          num_households: "",
          father_name: "",
          mother_name: "",
          num_males: "",
          num_females: "",
          total_members: 0,
          sitio: "",
          members_detail: []
        });
      }
      setRecords(paddedRecords);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Real-time search filtering
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) {
      return records;
    }
    const q = searchQuery.toLowerCase().trim();
    return records.filter((rec) => {
      if (!rec.family_number && !rec.father_name && !rec.mother_name) return false;
      
      const famNumMatch = rec.family_number?.toLowerCase().includes(q);
      const fatherMatch = rec.father_name?.toLowerCase().includes(q);
      const motherMatch = rec.mother_name?.toLowerCase().includes(q);
      const sitioMatch = rec.sitio?.toLowerCase().includes(q);

      const membersList = parseMembers(rec.members_detail);
      const memberNameMatch = membersList.some((m) =>
        m.full_name?.toLowerCase().includes(q)
      );

      return famNumMatch || fatherMatch || motherMatch || sitioMatch || memberNameMatch;
    });
  }, [records, searchQuery]);

  // Non-empty valid records for folder grid view
  const activeFamilyFiles = useMemo(() => {
    return filteredRecords.filter(
      (r) => r.family_number?.trim() || r.father_name?.trim() || r.mother_name?.trim()
    );
  }, [filteredRecords]);

  // Add a temporary row to the ledger view
  const handleAddLedgerRow = () => {
    setRecords((prev) => [
      ...prev,
      {
        id: `temp-added-${Date.now()}`,
        resident_id: null,
        family_number: "",
        num_households: "",
        father_name: "",
        mother_name: "",
        num_males: "",
        num_females: "",
        total_members: 0,
        sitio: "",
        members_detail: []
      }
    ]);
  };

  // Auto-generate next Family Number (e.g. FAM-001, FAM-002)
  const generateNextFamilyNumber = () => {
    const validNums = records
      .map((r) => r.family_number)
      .filter(Boolean)
      .map((num) => {
        const match = num.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
    const maxNum = validNums.length > 0 ? Math.max(...validNums) : 0;
    const nextNum = (maxNum + 1).toString().padStart(3, "0");
    return `FAM-${nextNum}`;
  };

  // Open Create New Family File dialog
  const handleOpenCreateModal = () => {
    setNewFamNum("");
    setNewFather("");
    setNewMother("");
    setNewSitio(sitioOptions[0] || "");
    setNewHouseholds(1);
    setNewMembers([
      { id: "1", full_name: "", relationship: "Father", age: "", gender: "Male" },
      { id: "2", full_name: "", relationship: "Mother", age: "", gender: "Female" }
    ]);
    setCreateDialogOpen(true);
  };

  // Submit Create New Family File
  const handleCreateFamilyFile = async () => {
    if (!newFamNum.trim()) {
      toast.error("Please enter a Family Number");
      return;
    }

    if (!/^\d+[a-zA-Z]*$/.test(newFamNum.trim())) {
      toast.error("Must contain at least one number/digit.");
      return;
    }
    if (!newFather.trim() && !newMother.trim()) {
      toast.error("Please enter at least the Father's or Mother's name");
      return;
    }

    const validMembers = newMembers.filter((m) => m.full_name.trim());
    const malesCount = validMembers.filter((m) => m.gender === "Male").length;
    const femalesCount = validMembers.filter((m) => m.gender === "Female").length;
    const totalCount = validMembers.length || (newFather ? 1 : 0) + (newMother ? 1 : 0);

    // Auto-link residents in system database
    let mainResidentId: string | null = null;
    if (newFather.trim()) {
      mainResidentId = await ensureResidentExists({ fullName: newFather.trim(), sitio: newSitio, gender: "Male" });
    }
    if (newMother.trim()) {
      const motherId = await ensureResidentExists({ fullName: newMother.trim(), sitio: newSitio, gender: "Female" });
      if (!mainResidentId) mainResidentId = motherId;
    }

    for (const mem of validMembers) {
      await ensureResidentExists({
        fullName: mem.full_name,
        sitio: newSitio,
        gender: mem.gender,
        age: mem.age
      });
    }

    const payload = {
      resident_id: mainResidentId || null,
      family_number: newFamNum.trim(),
      father_name: newFather.trim(),
      mother_name: newMother.trim(),
      sitio: newSitio,
      num_households: Number(newHouseholds) || 1,
      num_males: malesCount,
      num_females: femalesCount,
      total_members: totalCount,
      members_detail: validMembers
    };

    const { data, error } = await supabase
      .from("family_data")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create family file");
    } else {
      toast.success(`Family file "${newFamNum} - ${newFather || "Family"}" created!`);
      logActivity("submit_family_data", {
        entity_type: "family_data",
        description: `Created new family file: ${newFamNum} - ${newFather || newMother}`
      });
      setCreateDialogOpen(false);
      fetchRecords();
    }
  };

  // Open a Family File
  const handleOpenFile = (rec: FamilyRecord) => {
    setSelectedFile(rec);
    const members = parseMembers(rec.members_detail);
    
    if (members.length === 0) {
      const defaultMembers: FamilyMember[] = [];
      if (rec.father_name) {
        defaultMembers.push({ id: `f-${Date.now()}`, full_name: rec.father_name, relationship: "Father", age: "", gender: "Male" });
      }
      if (rec.mother_name) {
        defaultMembers.push({ id: `m-${Date.now()}`, full_name: rec.mother_name, relationship: "Mother", age: "", gender: "Female" });
      }
      setActiveMembers(defaultMembers);
    } else {
      setActiveMembers(members);
    }

    setEditFamNum(rec.family_number || "");
    setEditFather(rec.father_name || "");
    setEditMother(rec.mother_name || "");
    setEditSitio(rec.sitio || "Centro");
    setEditHouseholds(rec.num_households ?? 1);
    setIsEditingFileDetails(false);
    setFileDialogOpen(true);
  };

  // Save changes inside opened file
  const handleSaveFileChanges = async () => {
    if (!selectedFile) return;

    if (!editFamNum.trim()) {
      toast.error("Please enter a Family Number");
      return;
    }

    if (!/^\d+[a-zA-Z]*$/.test(editFamNum.trim())) {
      toast.error("Must contain at least one number/digit.");
      return;
    }

    const malesCount = activeMembers.filter((m) => m.gender === "Male").length;
    const femalesCount = activeMembers.filter((m) => m.gender === "Female").length;
    const totalCount = activeMembers.length;

    // Link father, mother, and all family members to the family_number in residents system
    const famNumStr = editFamNum.trim();
    if (editFather.trim()) {
      await ensureResidentExists({ fullName: editFather.trim(), sitio: editSitio, gender: "Male", familyNumber: famNumStr });
    }
    if (editMother.trim()) {
      await ensureResidentExists({ fullName: editMother.trim(), sitio: editSitio, gender: "Female", familyNumber: famNumStr });
    }
    for (const mem of activeMembers) {
      await ensureResidentExists({
        fullName: mem.full_name,
        sitio: editSitio,
        gender: mem.gender,
        age: mem.age,
        birthday: mem.birthday,
        familyNumber: famNumStr
      });
    }

    const updatePayload = {
      family_number: editFamNum,
      father_name: editFather,
      mother_name: editMother,
      sitio: editSitio,
      num_households: Number(editHouseholds) || 1,
      num_males: malesCount,
      num_females: femalesCount,
      total_members: totalCount,
      members_detail: activeMembers
    };

    if (selectedFile.id.startsWith("temp-")) {
      const { data, error } = await supabase
        .from("family_data")
        .insert(updatePayload)
        .select()
        .single();

      if (error) {
        toast.error("Failed to save family file");
      } else {
        toast.success("Family file created and saved!");
        setSelectedFile(data);
        fetchRecords();
      }
    } else {
      const { error } = await supabase
        .from("family_data")
        .update(updatePayload)
        .eq("id", selectedFile.id);

      if (error) {
        toast.error("Failed to update family file");
      } else {
        toast.success("Family file updated and family numbers assigned!");
        logActivity("update_family_data", {
          entity_type: "family_data",
          description: `Updated family file ${editFamNum} - ${editFather}`
        });
        setSelectedFile((prev) => (prev ? { ...prev, ...updatePayload } : null));
        setIsEditingFileDetails(false);
        fetchRecords();
      }
    }
  };

  // Add member inside opened file modal
  const handleAddMemberToActiveFile = () => {
    if (!memName.trim()) {
      toast.error("Please enter member's full name");
      return;
    }

    const newMemObj: FamilyMember = {
      id: `mem-${Date.now()}`,
      full_name: memName.trim(),
      relationship: memRole,
      age: memAge || "",
      birthday: memBirthday || "",
      gender: memGender,
      civil_status: memStatus
    };

    const updated = [...activeMembers, newMemObj];
    setActiveMembers(updated);
    setMemName("");
    setMemAge("");
    setMemBirthday("");
    setAddMemberDialogOpen(false);
    toast.success(`Added ${memName} to family members list`);
  };

  // Remove member inside opened file
  const handleRemoveMember = (id: string) => {
    setActiveMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Delete family file
  const handleDeleteFile = async (id: string, name: string) => {
    if (id.startsWith("temp-")) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setFileDialogOpen(false);
      toast.success("Family file removed");
      return;
    }

    const { error } = await supabase.from("family_data").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete family file");
    } else {
      toast.success("Family file deleted successfully");
      logActivity("delete_family_data", {
        entity_type: "family_data",
        description: `Deleted family file: ${name}`
      });
      setFileDialogOpen(false);
      fetchRecords();
    }
  };

  const handlePrintIndividualFile = () => {
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
          color: #000000 !important;
          font-family: inherit;
          font-size: inherit;
        }
        #family-print-area {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        #family-print-area table,
        #family-print-area table th,
        #family-print-area table td {
          color: #000000 !important;
          border-color: #cbd5e1 !important;
        }
        #family-print-area h2,
        #family-print-area p,
        #family-print-area span {
          color: #000000 !important;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #individual-file-print-area, #individual-file-print-area *,
          #family-print-area, #family-print-area * {
            visibility: visible !important;
          }
          #individual-file-print-area, #family-print-area {
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
          .no-print {
            display: none !important;
          }
          .print-only {
            display: flex !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-end gap-4 bg-card border border-border/60 p-4 rounded-xl shadow-xs">

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t("familyData.createNewFile")}
          </Button>

          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-3.5 w-3.5" />
              {t("familyData.folderView")}
            </Button>
            <Button
              variant={viewMode === "ledger" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode("ledger")}
            >
              <TableIcon className="h-3.5 w-3.5" />
              {t("familyData.ledgerView")}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("familyData.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 py-5 bg-card border-border/60 shadow-xs focus:ring-primary/20 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid of Family Folders (Primary File Directory View) */}
      {viewMode === "grid" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{activeFamilyFiles.length}</strong> Family File Folder(s)
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : activeFamilyFiles.length === 0 ? (
            <Card className="border-dashed border-2 border-border/80 bg-muted/20 py-12 text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Folder className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  {searchQuery ? "No matching family files found" : "No family data files yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {searchQuery
                    ? `Try searching for a different family number or father/mother/member name.`
                    : `Use the top toolbar to create your family data record files.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeFamilyFiles.map((rec) => {
                const famNum = rec.family_number || "FN";
                const fatherName = rec.father_name || "Father's Name";
                const motherName = rec.mother_name || "";
                const fileName = `${famNum} - ${fatherName}`;
                const membersList = parseMembers(rec.members_detail);
                const totalCount = rec.total_members || membersList.length || 0;

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleOpenFile(rec)}
                    className="group relative cursor-pointer rounded-xl border border-amber-900/10 dark:border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-card p-4 transition-all duration-200 hover:shadow-md hover:border-amber-500/40 hover:-translate-y-0.5 flex flex-col justify-between space-y-3"
                  >
                    {/* Folder Tab Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Folder className="h-5.5 w-5.5" />
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                            {famNum}
                          </Badge>
                          <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                            {fatherName}
                          </h3>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* File Folder Body Preview */}
                    <div className="text-xs text-muted-foreground space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground/80">File Folder Name:</span>
                        <span className="font-medium text-foreground font-mono truncate max-w-[170px]">
                          {fileName}
                        </span>
                      </div>
                      {motherName && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground/80">Mother:</span>
                          <span className="font-medium text-foreground truncate max-w-[170px]">
                            {motherName}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground/80">Sitio:</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary/70" />
                          {rec.sitio || "Centro"}
                        </span>
                      </div>
                    </div>

                    {/* Folder Footer Badges */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span><strong>{totalCount}</strong> Family Member(s)</span>
                      </div>
                      <span className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        Open File <FolderOpen className="h-3 w-3 inline ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Master Ledger Sheet View (Print & Spreadsheet Table View) */}
      {viewMode === "ledger" && (
        <Card 
          id="family-print-area" 
          className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden"
        >
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Official Barangay Printable Header */}
            <div className="print-only flex items-center justify-center gap-8 border-b-4 border-double border-slate-900 pb-4 mb-4" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
              <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
              <img src={headerTextImg} alt="Header Text" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
              <img src={barangayLogo} alt="Barangay Subukin" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div>
                <h2 className="font-heading font-semibold text-lg text-foreground">
                  Master Family Data Sheet Directory
                </h2>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button onClick={handleAddLedgerRow} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Row
                </Button>
                <Button onClick={handlePrintIndividualFile} size="sm" variant="outline" className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print Ledger
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-transparent">
                    <th className="border border-border p-2 font-bold text-center w-[15%]">
                      Family Number
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[15%]">
                      Number of Households
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[25%]">
                      Name of Household (Father)
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[25%]">
                      Mother
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[7%]">
                      Male
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[7%]">
                      Female
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[7%]">
                      Total
                    </th>
                    <th className="border border-border p-2 font-bold text-center w-[8%] no-print">
                      Open File
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => {
                    const totalMembers = (Number(rec.num_males) || 0) + (Number(rec.num_females) || 0);
                    return (
                      <tr key={rec.id} className="transition-colors">
                        <td className="border border-border p-0">
                          <input
                            type="text"
                            value={rec.family_number || ""}
                            onChange={(e) => {
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, family_number: e.target.value } : r))
                              );
                            }}
                            className="cell-input text-center font-mono"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <input
                            type="number"
                            value={rec.num_households === "" ? "" : (rec.num_households ?? "")}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, num_households: val } : r))
                              );
                            }}
                            className="cell-input text-center"
                            min="0"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <input
                            type="text"
                            value={rec.father_name || ""}
                            onChange={(e) => {
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, father_name: e.target.value } : r))
                              );
                            }}
                            className="cell-input font-medium"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <input
                            type="text"
                            value={rec.mother_name || ""}
                            onChange={(e) => {
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, mother_name: e.target.value } : r))
                              );
                            }}
                            className="cell-input"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <input
                            type="number"
                            value={rec.num_males === "" ? "" : (rec.num_males ?? "")}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, num_males: val } : r))
                              );
                            }}
                            className="cell-input text-center"
                            min="0"
                          />
                        </td>
                        <td className="border border-border p-0">
                          <input
                            type="number"
                            value={rec.num_females === "" ? "" : (rec.num_females ?? "")}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setRecords((prev) =>
                                prev.map((r) => (r.id === rec.id ? { ...r, num_females: val } : r))
                              );
                            }}
                            className="cell-input text-center"
                            min="0"
                          />
                        </td>
                        <td className="border border-border p-2 text-center font-bold">
                          {totalMembers > 0 || rec.total_members > 0 ? (totalMembers || rec.total_members) : ""}
                        </td>
                        <td className="border border-border p-1 text-center no-print">
                          <Button
                            onClick={() => handleOpenFile(rec)}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                          >
                            <FolderOpen className="h-3.5 w-3.5 mr-1" /> Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= OPENED FAMILY FILE DIALOG ================= */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent 
          id="individual-file-print-area"
          className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border shadow-2xl p-6 md:p-8"
        >
          {selectedFile && (
            <div className="space-y-6">
              {/* Official Barangay Printable Header */}
              <div className="print-only flex items-center justify-center gap-8 border-b-4 border-double border-slate-900 pb-4 mb-4" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
                <img src={sanjuanLogo} alt="San Juan Seal" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                <img src={headerTextImg} alt="Header Text" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
                <img src={barangayLogo} alt="Barangay Subukin" className="h-24 md:h-32 object-contain mix-blend-multiply" style={{ height: "115px", width: "auto", objectFit: "contain", mixBlendMode: "multiply" }} />
              </div>

              {/* Opened File Folder Banner */}
              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-600 text-white font-mono text-xs">
                        {editFamNum || "FN"}
                      </Badge>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        Official Family File Record
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-heading font-bold text-foreground mt-0.5">
                      {`${editFamNum || "FN"} - ${editFather || "Father's Name"}`}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print self-end md:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingFileDetails(!isEditingFileDetails)}
                    className="gap-1 text-xs"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {isEditingFileDetails ? "Done Editing" : "Edit File Headers"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintIndividualFile}
                    className="gap-1 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print File
                  </Button>
                </div>
              </div>

              {/* Header Fields (Father, Mother, Sitio, Households) */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-4">
                  {isEditingFileDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Family Number</Label>
                        <Input
                          value={editFamNum}
                          onChange={(e) => setEditFamNum(e.target.value)}
                          className={`h-8 text-xs font-mono ${editFamNum.trim() !== "" && !/^\d+[a-zA-Z]*$/.test(editFamNum.trim()) ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5" : ""}`}
                        />
                        {editFamNum.trim() !== "" && !/^\d+[a-zA-Z]*$/.test(editFamNum.trim()) && (
                          <p className="text-[10px] text-destructive mt-1 font-medium">
                            Must contain at least one number/digit.
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Father's Name (Household Head)</Label>
                        <Input
                          value={editFather}
                          onChange={(e) => setEditFather(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Mother's Name</Label>
                        <Input
                          value={editMother}
                          onChange={(e) => setEditMother(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Sitio</Label>
                        <Select value={editSitio} onValueChange={setEditSitio}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sitioOptions.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Number of Households</Label>
                        <Input
                          type="number"
                          value={editHouseholds}
                          onChange={(e) => setEditHouseholds(e.target.value)}
                          className="h-8 text-xs"
                          min="1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Father (Head):</span>
                        <strong className="text-foreground text-sm font-semibold">{editFather || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Mother:</span>
                        <strong className="text-foreground text-sm font-semibold">{editMother || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Sitio:</span>
                        <strong className="text-foreground text-sm font-semibold">{editSitio || "Centro"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Households:</span>
                        <strong className="text-foreground text-sm font-semibold">{editHouseholds || 1}</strong>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Family Members Section inside Opened File */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Family Members Directory
                    </h3>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setAddMemberDialogOpen(true)}
                    className="gap-1.5 text-xs no-print bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Family Member
                  </Button>
                </div>

                <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs md:text-sm text-left">
                    <thead>
                      <tr className="bg-muted/70 border-b border-border/80">
                        <th className="p-3 font-semibold text-muted-foreground">Full Name</th>
                        <th className="p-3 font-semibold text-muted-foreground">Relationship / Role</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Birthday</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Age</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Gender</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center no-print">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground italic">
                            No family members added yet. Click "Add Family Member" above to record members.
                          </td>
                        </tr>
                      ) : (
                        activeMembers.map((m) => (
                          <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30">
                            <td className="p-3 font-medium text-foreground">{m.full_name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                {m.relationship}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">{m.birthday || "—"}</td>
                            <td className="p-3 text-center">{m.age || "—"}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  m.gender === "Female"
                                    ? "bg-pink-500/10 text-pink-700 dark:text-pink-300"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                }`}
                              >
                                {m.gender}
                              </span>
                            </td>
                            <td className="p-3 text-center no-print">
                              <Button
                                onClick={() => handleRemoveMember(m.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary counters */}
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                  <span>
                    Total Males: <strong>{activeMembers.filter((m) => m.gender === "Male").length}</strong> | Total Females: <strong>{activeMembers.filter((m) => m.gender === "Female").length}</strong>
                  </span>
                  <span>
                    Total Members: <strong className="text-foreground text-sm">{activeMembers.length}</strong>
                  </span>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50 no-print">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile(selectedFile.id, `${editFamNum} - ${editFather}`)}
                  className="text-destructive hover:bg-destructive/10 border-destructive/20 text-xs gap-1.5 w-full sm:w-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete File
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFileDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveFileChanges}
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Save className="h-3.5 w-3.5" /> Save File Changes
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= CREATE NEW FAMILY FILE DIALOG ================= */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border shadow-xl p-4 sm:p-6">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Family Number *</Label>
                <Input
                  value={newFamNum}
                  onChange={(e) => setNewFamNum(e.target.value)}
                  className={`font-mono text-sm mt-1 ${newFamNum.trim() !== "" && !/^\d+[a-zA-Z]*$/.test(newFamNum.trim()) ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5" : ""}`}
                />
                {newFamNum.trim() !== "" && !/^\d+[a-zA-Z]*$/.test(newFamNum.trim()) && (
                  <p className="text-[10px] text-destructive mt-1 font-medium">
                    Must contain at least one number/digit.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Sitio</Label>
                <Select value={newSitio} onValueChange={setNewSitio}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sitioOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Father's Name (Household Head)</Label>
                <Input
                  value={newFather}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewFather(val);
                    setNewMembers(prev => prev.map(m => m.relationship === "Father" ? { ...m, full_name: val } : m));
                  }}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Mother's Name</Label>
                <Input
                  value={newMother}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMother(val);
                    setNewMembers(prev => prev.map(m => m.relationship === "Mother" ? { ...m, full_name: val } : m));
                  }}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs w-full overflow-hidden">
              <span className="text-muted-foreground">Generated File Folder Name:</span>
              <div className="font-mono font-bold text-foreground text-sm mt-0.5 truncate">
                {`${newFamNum || "FN"} - ${newFather.trim() || "Father's Name"}`}
              </div>
            </div>

            {/* Initial Family Members setup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Initial Family Members</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2 gap-1"
                  onClick={() =>
                    setNewMembers((prev) => [
                      ...prev,
                      { id: Date.now().toString(), full_name: "", relationship: "Child", age: "", gender: "Male" }
                    ])
                  }
                >
                  <Plus className="h-3 w-3" /> Add Member Row
                </Button>
              </div>

              <div className="overflow-x-auto border border-border/60 rounded-lg max-h-52 overflow-y-auto">
                <table className="w-full text-xs min-w-[620px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/50 text-muted-foreground font-semibold">
                      <th className="p-2 text-left w-48">Full Name</th>
                      <th className="p-2 text-left w-32">Birthday</th>
                      <th className="p-2 text-center w-20">Age</th>
                      <th className="p-2 text-left w-24">Role</th>
                      <th className="p-2 text-left w-24">Gender</th>
                      <th className="p-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newMembers.map((mem) => (
                      <tr key={mem.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-1.5">
                          <Input
                            placeholder="Full Name"
                            value={mem.full_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewMembers((prev) =>
                                prev.map((m) => (m.id === mem.id ? { ...m, full_name: val } : m))
                              );
                              if (mem.relationship === "Father") setNewFather(val);
                              if (mem.relationship === "Mother") setNewMother(val);
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="date"
                            value={mem.birthday || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const computedAge = calculateAge(val);
                              setNewMembers((prev) =>
                                prev.map((m) =>
                                  m.id === mem.id
                                    ? { ...m, birthday: val, age: computedAge > 0 ? computedAge : m.age }
                                    : m
                                )
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            placeholder="Age"
                            value={mem.age || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewMembers((prev) =>
                                prev.map((m) => (m.id === mem.id ? { ...m, age: val } : m))
                              );
                            }}
                            className="h-8 text-xs text-center"
                            min="0"
                          />
                        </td>
                        <td className="p-1.5">
                          <Select
                            value={mem.relationship}
                            onValueChange={(val) =>
                              setNewMembers((prev) =>
                                prev.map((m) => (m.id === mem.id ? { ...m, relationship: val } : m))
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Grandparent">Grandparent</SelectItem>
                              <SelectItem value="Relative">Relative</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Select
                            value={mem.gender}
                            onValueChange={(val) =>
                              setNewMembers((prev) =>
                                prev.map((m) => (m.id === mem.id ? { ...m, gender: val } : m))
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setNewMembers((prev) => prev.filter((m) => m.id !== mem.id))}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateFamilyFile}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Family File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= ADD MEMBER MODAL (INSIDE OPENED FILE) ================= */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Add Member to Family File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={memName}
                onChange={(e) => setMemName(e.target.value)}
                placeholder="e.g. Juan dela Cruz Jr."
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Relationship / Role</Label>
                <Select value={memRole} onValueChange={setMemRole}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father (Head)</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Son">Son</SelectItem>
                    <SelectItem value="Daughter">Daughter</SelectItem>
                    <SelectItem value="Grandfather">Grandfather</SelectItem>
                    <SelectItem value="Grandmother">Grandmother</SelectItem>
                    <SelectItem value="Relative">Relative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={memGender} onValueChange={setMemGender}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Birthday</Label>
                <Input
                  type="date"
                  value={memBirthday}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemBirthday(val);
                    if (val) {
                      const calculated = calculateAge(val);
                      if (calculated >= 0) setMemAge(calculated);
                    }
                  }}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Age</Label>
                <Input
                  type="number"
                  value={memAge}
                  onChange={(e) => setMemAge(e.target.value)}
                  placeholder="e.g. 12"
                  className="h-8 text-xs mt-1"
                  min="0"
                />
              </div>

              <div>
                <Label className="text-xs">Civil Status</Label>
                <Select value={memStatus} onValueChange={setMemStatus}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleAddMemberToActiveFile}>
              Add to Family Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyDataForm;
