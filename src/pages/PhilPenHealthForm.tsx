import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Save, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { logActivity } from "@/lib/activityLogger";
import { calculateAge } from "@/lib/residentLinker";

interface Resident {
  id: string;
  full_name: string;
  age?: number;
  birthday?: string;
  sitio?: string;
  address?: string;
}

const PhilPenHealthForm = () => {
  const { t } = useSettings();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    resident_id: "",
    address: "",
    age: "",
    birthdate: "",
    currentDate: new Date().toISOString().split("T")[0],
    bp: "",
    height: "",
    weight: "",
    
    // Checklist Answers
    smokes: false,
    smokes_no: false,
    smokes_remarks: "",
    
    drinks_alcohol: false,
    drinks_alcohol_no: false,
    drinks_remarks: "",
    
    high_bp: false,
    high_bp_no: false,
    bp_remarks_bp: "",
    bp_remarks_meds: "",
    bp_remarks_chest: "",
    
    diabetes: false,
    diabetes_no: false,
    
    // Diabetes symptoms sub-checklists
    diabetes_palakain: false,
    diabetes_palakain_no: false,
    diabetes_palaging_gutom: false,
    diabetes_palaging_gutom_no: false,
    diabetes_madalas_umihi: false,
    diabetes_madalas_umihi_no: false,
    diabetes_laging_uhaw: false,
    diabetes_laging_uhaw_no: false,
    
    diabetes_remarks: ""
  });

  useEffect(() => {
    supabase.from("residents")
      .select("*")
      .order("full_name")
      .then(({ data }) => setResidents(data || []));
  }, []);

  // Calculate BMI
  const bmi = form.height && form.weight 
    ? (Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1) 
    : "—";

  const handleResidentChange = (residentId: string) => {
    const res = residents.find(r => r.id === residentId);
    if (!res) return;

    let computedAge = "";
    if (res.birthday) {
      const birth = new Date(res.birthday);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      computedAge = String(age);
    } else if (res.age) {
      computedAge = String(res.age);
    }

    setForm(prev => ({
      ...prev,
      resident_id: residentId,
      address: res.sitio || res.address || "",
      age: computedAge,
      birthdate: res.birthday || ""
    }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleToggle = (yesField: string, noField: string, choice: "yes" | "no") => {
    setForm(prev => ({
      ...prev,
      [yesField]: choice === "yes",
      [noField]: choice === "no"
    }));
  };

  const handleReset = () => {
    setForm({
      resident_id: "",
      address: "",
      age: "",
      birthdate: "",
      currentDate: new Date().toISOString().split("T")[0],
      bp: "",
      height: "",
      weight: "",
      smokes: false,
      smokes_no: false,
      smokes_remarks: "",
      drinks_alcohol: false,
      drinks_alcohol_no: false,
      drinks_remarks: "",
      high_bp: false,
      high_bp_no: false,
      bp_remarks_bp: "",
      bp_remarks_meds: "",
      bp_remarks_chest: "",
      diabetes: false,
      diabetes_no: false,
      diabetes_palakain: false,
      diabetes_palakain_no: false,
      diabetes_palaging_gutom: false,
      diabetes_palaging_gutom_no: false,
      diabetes_madalas_umihi: false,
      diabetes_madalas_umihi_no: false,
      diabetes_laging_uhaw: false,
      diabetes_laging_uhaw_no: false,
      diabetes_remarks: ""
    });
    toast.success("Form cleared successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resident_id) {
      toast.error(t("consultation.selectResident"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("philpen_health").insert({
      resident_id: form.resident_id,
      address_sitio: form.address,
      age: Number(form.age) || null,
      birthdate: form.birthdate || null,
      record_date: form.currentDate,
      bp: form.bp,
      height: form.height,
      weight: form.weight,
      bmi: bmi !== "—" ? bmi : null,
      
      // Boolean mapping
      smokes: form.smokes,
      drinks_alcohol: form.drinks_alcohol,
      high_blood_pressure: form.high_bp,
      diabetes_symptoms: form.diabetes,
      
      // Store extra details as schema-less properties (fully supported in mock database local storage)
      smokes_remarks: form.smokes_remarks,
      drinks_remarks: form.drinks_remarks,
      bp_remarks_bp: form.bp_remarks_bp,
      bp_remarks_meds: form.bp_remarks_meds,
      bp_remarks_chest: form.bp_remarks_chest,
      diabetes_palakain: form.diabetes_palakain,
      diabetes_palaging_gutom: form.diabetes_palaging_gutom,
      diabetes_madalas_umihi: form.diabetes_madalas_umihi,
      diabetes_laging_uhaw: form.diabetes_laging_uhaw,
      diabetes_remarks: form.diabetes_remarks
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to save health checklist");
    } else {
      const selectedResident = residents.find(r => r.id === form.resident_id);
      const resName = selectedResident ? selectedResident.full_name : form.resident_id;
      logActivity("submit_philpen", {
        entity_type: "philpen_health",
        description: `Recorded a health checklist report for resident: ${resName}`
      });
      toast.success("Health check checklist saved successfully!");
      handleReset();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
        .check-cell {
          width: 50px;
          text-align: center;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.15s;
        }
        .check-cell:hover {
          background-color: hsl(var(--primary) / 0.05);
        }
        .print-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px dashed hsl(var(--border));
          padding: 2px 4px;
          outline: none;
          transition: border-bottom-color 0.2s;
        }
        .print-input:focus {
          border-bottom-style: solid;
          border-bottom-color: hsl(var(--primary));
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #philpen-print-area, #philpen-print-area * {
            visibility: visible !important;
          }
          #philpen-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          #philpen-print-area * {
            color: black !important;
            border-color: #94a3b8 !important; /* slate-400 */
          }
          .no-print {
            display: none !important;
          }
          .print-input {
            border-bottom: none !important;
            padding: 0 !important;
          }
          .print-input::placeholder {
            color: transparent !important;
          }
          select, select * {
            display: none !important;
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

      {/* Printable Sheet Canvas */}
      <Card 
        id="philpen-print-area" 
        className="border border-border/50 shadow-md bg-card text-card-foreground overflow-hidden w-full"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Top Personal Fields Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 pb-4 border-b border-border/60">
              
              {/* Left Side Group */}
              <div className="md:col-span-8 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Name:</span>
                  <div className="flex-1 no-print">
                    <Select value={form.resident_id} onValueChange={handleResidentChange}>
                      <SelectTrigger className="h-8 border-border bg-background text-sm">
                        <SelectValue placeholder="Select a resident..." />
                      </SelectTrigger>
                      <SelectContent>
                        {residents.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Print representation of name select */}
                  <span className="hidden print:inline border-b border-slate-400 flex-1 px-1 font-medium min-h-6">
                    {residents.find(r => r.id === form.resident_id)?.full_name || "____________________________________"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Address/Sitio:</span>
                  <input 
                    type="text"
                    value={form.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    className="print-input flex-1 font-medium"
                    placeholder="Type address..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Age:</span>
                  <input 
                    type="text"
                    value={form.age}
                    onChange={(e) => handleFieldChange("age", e.target.value)}
                    className="print-input flex-1 font-medium"
                    placeholder="Type age..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Birthdate:</span>
                  <input 
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => {
                      const bday = e.target.value;
                      const computed = calculateAge(bday);
                      setForm(prev => ({ ...prev, birthdate: bday, age: computed > 0 ? String(computed) : prev.age }));
                    }}
                    className="print-input flex-1 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Date:</span>
                  <input 
                    type="date"
                    value={form.currentDate}
                    onChange={(e) => handleFieldChange("currentDate", e.target.value)}
                    className="print-input flex-1 font-medium"
                  />
                </div>
              </div>

              {/* Right Side Group */}
              <div className="md:col-span-4 space-y-3.5 md:border-l md:border-border/60 md:pl-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>BP:</span>
                  <input 
                    type="text"
                    value={form.bp}
                    onChange={(e) => handleFieldChange("bp", e.target.value)}
                    className="print-input flex-1 text-center font-medium"
                    placeholder="120/80"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Ht:</span>
                  <input 
                    type="text"
                    value={form.height}
                    onChange={(e) => handleFieldChange("height", e.target.value)}
                    className="print-input flex-1 text-center font-medium"
                    placeholder="cm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>Wt:</span>
                  <input 
                    type="text"
                    value={form.weight}
                    onChange={(e) => handleFieldChange("weight", e.target.value)}
                    className="print-input flex-1 text-center font-medium"
                    placeholder="kg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-heading)" }}>BMI:</span>
                  <span className="flex-1 text-center font-semibold bg-muted/30 py-0.5 px-3 rounded text-primary border border-border/50">
                    {bmi}
                  </span>
                </div>
              </div>

            </div>

            {/* Checklist Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse border border-border text-left text-sm">
                <thead>
                  <tr className="bg-muted/40 font-heading">
                    <th className="border border-border p-2 font-bold text-foreground text-left w-[55%]">
                      Description/Question
                    </th>
                    <th className="border border-border p-2 font-bold text-foreground text-center w-[10%]">
                      Yes
                    </th>
                    <th className="border border-border p-2 font-bold text-foreground text-center w-[10%]">
                      No
                    </th>
                    <th className="border border-border p-2 font-bold text-foreground text-left w-[25%]">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* Row 1: Naninigarilyo */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      1. Naninigarilyo?
                    </td>
                    <td 
                      onClick={() => handleToggle("smokes", "smokes_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.smokes ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("smokes", "smokes_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.smokes_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
                        <span className="shrink-0 font-medium">Ilang stick kada araw:</span>
                        <input 
                          type="text"
                          value={form.smokes_remarks}
                          onChange={(e) => handleFieldChange("smokes_remarks", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="sticks/day..."
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: Manginginom */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      2. Manginginom?
                    </td>
                    <td 
                      onClick={() => handleToggle("drinks_alcohol", "drinks_alcohol_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.drinks_alcohol ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("drinks_alcohol", "drinks_alcohol_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.drinks_alcohol_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1">
                      <input 
                        type="text"
                        value={form.drinks_remarks}
                        onChange={(e) => handleFieldChange("drinks_remarks", e.target.value)}
                        className="print-input text-foreground text-xs"
                        placeholder="Remarks..."
                      />
                    </td>
                  </tr>

                  {/* Row 3: Tumataas ba ang BP */}
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      3. Tumataas ba ang BP?
                    </td>
                    <td 
                      onClick={() => handleToggle("high_bp", "high_bp_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold"
                    >
                      {form.high_bp ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("high_bp", "high_bp_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold"
                    >
                      {form.high_bp_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-2 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• If yes, ano BP mo:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_bp}
                          onChange={(e) => handleFieldChange("bp_remarks_bp", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="e.g. 130/90"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• Ano gamot iniinom:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_meds}
                          onChange={(e) => handleFieldChange("bp_remarks_meds", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="Medications..."
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="shrink-0">• Naninikip ba dibdib mo:</span>
                        <input 
                          type="text"
                          value={form.bp_remarks_chest}
                          onChange={(e) => handleFieldChange("bp_remarks_chest", e.target.value)}
                          className="print-input flex-1 text-foreground"
                          placeholder="Yes/No..."
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: May sintomas ba ng diabetes */}
                  <tr>
                    <td className="border border-border p-3 font-semibold text-foreground bg-muted/10">
                      4. May sintomas ba ng diabetes?
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes", "diabetes_no", "yes")}
                      className="border border-border check-cell text-primary text-lg font-bold bg-muted/10"
                    >
                      {form.diabetes ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes", "diabetes_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-lg font-bold bg-muted/10"
                    >
                      {form.diabetes_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/10">
                      <input 
                        type="text"
                        value={form.diabetes_remarks}
                        onChange={(e) => handleFieldChange("diabetes_remarks", e.target.value)}
                        className="print-input text-foreground text-xs"
                        placeholder="Remarks..."
                      />
                    </td>
                  </tr>

                  {/* Sub-row: Palakain */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Palakain
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palakain", "diabetes_palakain_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_palakain ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palakain", "diabetes_palakain_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_palakain_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Palaging gutom */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Palaging gutom
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palaging_gutom", "diabetes_palaging_gutom_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_palaging_gutom ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_palaging_gutom", "diabetes_palaging_gutom_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_palaging_gutom_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Madalas umihi sa madaling araw */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Madalas umihi sa madaling araw?
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_madalas_umihi", "diabetes_madalas_umihi_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_madalas_umihi ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_madalas_umihi", "diabetes_madalas_umihi_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_madalas_umihi_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                  {/* Sub-row: Laging uhaw */}
                  <tr>
                    <td className="border border-border py-2 px-5 text-sm text-muted-foreground">
                      • Laging uhaw
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_laging_uhaw", "diabetes_laging_uhaw_no", "yes")}
                      className="border border-border check-cell text-primary text-base font-bold"
                    >
                      {form.diabetes_laging_uhaw ? "✓" : ""}
                    </td>
                    <td 
                      onClick={() => handleToggle("diabetes_laging_uhaw", "diabetes_laging_uhaw_no", "no")}
                      className="border border-border check-cell text-muted-foreground text-base font-bold"
                    >
                      {form.diabetes_laging_uhaw_no ? "✓" : ""}
                    </td>
                    <td className="border border-border p-1 bg-muted/5">&nbsp;</td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Bottom Form Actions Row - Hidden in Print */}
            <div className="flex items-center justify-end gap-2.5 pt-4 no-print border-t border-border/40">
              <Button 
                type="submit" 
                disabled={loading} 
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              >
                <Save className="h-4.5 w-4.5" />
                {loading ? "Saving..." : "Save Record"}
              </Button>
              
              <Button 
                type="button" 
                onClick={handlePrint}
                className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10 font-medium shadow-sm"
                variant="outline"
              >
                <Printer className="h-4.5 w-4.5" />
                Print Form
              </Button>
              
              <Button 
                type="button" 
                onClick={handleReset}
                className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-medium shadow-sm"
                variant="outline"
              >
                <RefreshCw className="h-4.5 w-4.5" />
                Reset
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhilPenHealthForm;
