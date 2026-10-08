import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  Sliders, 
  Check, 
  FileText,
  RotateCw
} from "lucide-react";
import { 
  PrintOrientation, 
  getSavedPrintOrientation, 
  setSavedPrintOrientation, 
  applyPrintOrientation,
  openPrintPageSettings,
  executePrintWithOrientation 
} from "@/lib/printSettings";
import { PrintPageSettingsModal } from "@/components/PrintPageSettingsModal";

interface PrintPageSettingsBarProps {
  onPrint?: (orientation: PrintOrientation) => void;
  className?: string;
  formName?: string;
  compact?: boolean;
  defaultOrientation?: PrintOrientation | string;
  disabled?: boolean;
}

export const PrintPageSettingsBar: React.FC<PrintPageSettingsBarProps> = ({
  onPrint,
  className = "",
  formName,
  compact = false,
  defaultOrientation,
  disabled = false,
}) => {
  const initialOrientation: PrintOrientation =
    defaultOrientation === "landscape" || defaultOrientation === "portrait"
      ? (defaultOrientation as PrintOrientation)
      : getSavedPrintOrientation();

  const [orientation, setOrientation] = useState<PrintOrientation>(initialOrientation);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (defaultOrientation === "landscape" || defaultOrientation === "portrait") {
      setOrientation(defaultOrientation as PrintOrientation);
    }
  }, [defaultOrientation]);

  useEffect(() => {
    const handleOrientationChange = (e: Event) => {
      const customEvent = e as CustomEvent<PrintOrientation>;
      if (customEvent.detail) {
        setOrientation(customEvent.detail);
      }
    };
    window.addEventListener("bhw-print-orientation-changed", handleOrientationChange);
    return () => {
      window.removeEventListener("bhw-print-orientation-changed", handleOrientationChange);
    };
  }, []);

  const handleSelectOrientation = (newOrientation: PrintOrientation) => {
    setOrientation(newOrientation);
    setSavedPrintOrientation(newOrientation);
  };

  const handleTriggerPrint = () => {
    if (disabled) return;
    applyPrintOrientation(orientation);
    if (onPrint) {
      onPrint(orientation);
    } else {
      executePrintWithOrientation(orientation);
    }
  };

  return (
    <>
      <div
        className={`no-print flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-foreground shadow-sm ${className}`}
      >
        <div className="flex items-center gap-2 text-xs">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Printer className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>Print Page Settings</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-normal">
                Times New Roman 12pt
              </span>
            </div>
            {!compact && (
              <p className="text-[11px] text-muted-foreground">
                Pumili ng orientation bago i-print {formName ? `ang ${formName}` : "ang form"}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Orientation Toggle Buttons */}
          <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-background shadow-xs text-xs">
            <button
              type="button"
              onClick={() => handleSelectOrientation("portrait")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                orientation === "portrait"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Portrait (Patayo)"
            >
              <span className="w-2.5 h-3.5 border border-current rounded-xs inline-block" />
              <span>Portrait</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectOrientation("landscape")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                orientation === "landscape"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Landscape (Pahiga)"
            >
              <span className="w-3.5 h-2.5 border border-current rounded-xs inline-block" />
              <span>Landscape</span>
            </button>
          </div>

          {/* Detailed Settings Modal Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setSettingsModalOpen(true)}
            className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            title="Buksan ang buong Print Page Settings dialog"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          {/* Primary Print Button */}
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={handleTriggerPrint}
            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-sm shadow-primary/20"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>I-print ({orientation === "landscape" ? "Landscape" : "Portrait"})</span>
          </Button>
        </div>
      </div>

      {/* Embedded Modal Dialog */}
      <PrintPageSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        onConfirmPrint={handleTriggerPrint}
        defaultOrientation={orientation}
        title={formName ? `Print Settings — ${formName}` : "Print Page Settings"}
      />
    </>
  );
};
