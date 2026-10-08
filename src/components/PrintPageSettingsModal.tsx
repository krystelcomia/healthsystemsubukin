import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  FileText, 
  Sliders, 
  Check, 
  Type, 
  Info,
  Sparkles,
  RotateCcw
} from "lucide-react";
import {
  PrintOrientation,
  getSavedPrintOrientation,
  setSavedPrintOrientation,
  applyPrintOrientation,
  executePrintWithOrientation,
  PrintSettingsEventDetail
} from "@/lib/printSettings";

interface PrintPageSettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirmPrint?: (orientation: PrintOrientation) => void;
  defaultOrientation?: PrintOrientation;
  title?: string;
}

export const PrintPageSettingsModal: React.FC<PrintPageSettingsModalProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onConfirmPrint,
  defaultOrientation,
  title = "Print Page Settings",
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeCallback, setActiveCallback] = useState<((orientation: PrintOrientation) => void) | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [selectedOrientation, setSelectedOrientation] = useState<PrintOrientation>(() => {
    return defaultOrientation || getSavedPrintOrientation();
  });

  // Listen to global open event so ANY form or button can trigger the print settings modal
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PrintSettingsEventDetail>;
      const detail = customEvent.detail;
      if (detail?.defaultOrientation) {
        setSelectedOrientation(detail.defaultOrientation);
      } else {
        setSelectedOrientation(getSavedPrintOrientation());
      }
      if (detail?.title) {
        setCustomTitle(detail.title);
      } else {
        setCustomTitle(null);
      }
      if (detail?.onConfirm) {
        setActiveCallback(() => detail.onConfirm);
      } else {
        setActiveCallback(null);
      }
      setInternalOpen(true);
    };

    window.addEventListener("bhw-open-print-settings", handleOpenEvent);
    return () => {
      window.removeEventListener("bhw-open-print-settings", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (defaultOrientation) {
      setSelectedOrientation(defaultOrientation);
    }
  }, [defaultOrientation]);

  const handleSelectOrientation = (orientation: PrintOrientation) => {
    setSelectedOrientation(orientation);
    applyPrintOrientation(orientation);
  };

  const handleProceedPrint = () => {
    // Save chosen preference
    setSavedPrintOrientation(selectedOrientation);

    // Apply orientation
    applyPrintOrientation(selectedOrientation);

    setIsOpen(false);

    // If an external callback was registered, run it
    if (onConfirmPrint) {
      onConfirmPrint(selectedOrientation);
    } else if (activeCallback) {
      activeCallback(selectedOrientation);
    } else {
      // Default print execution
      executePrintWithOrientation(selectedOrientation);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[540px] border-primary/20 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                {customTitle || title}
                <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                  Official Format
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pumili ng orientation at ayusin ang page settings bago i-print ang dokumento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Orientation Chooser */}
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Pumili ng Orientation (Page Orientation)</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              Awtomatikong ia-apply sa browser print preview
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Portrait Card */}
            <div
              onClick={() => handleSelectOrientation("portrait")}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                selectedOrientation === "portrait"
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              {selectedOrientation === "portrait" && (
                <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}

              {/* Visual Portrait Page Icon */}
              <div className="w-16 h-22 rounded-lg border-2 border-current bg-background flex flex-col justify-between p-2 shadow-sm transition-transform group-hover:scale-105">
                <div className="w-full flex flex-col gap-1">
                  <div className="w-3/4 h-1.5 bg-current rounded-full opacity-60" />
                  <div className="w-full h-1 bg-current rounded-full opacity-30" />
                  <div className="w-full h-1 bg-current rounded-full opacity-30" />
                  <div className="w-2/3 h-1 bg-current rounded-full opacity-30" />
                </div>
                <div className="w-1/2 h-1 bg-current rounded-full opacity-40 self-end" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground mb-0.5">
                  Portrait (Patayo)
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  8.5 × 11 in (Vertical)
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Inirerekomenda para sa mga standard forms, individual records, at consultation slips.
                </p>
              </div>
            </div>

            {/* Landscape Card */}
            <div
              onClick={() => handleSelectOrientation("landscape")}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 flex flex-col items-center text-center gap-3 ${
                selectedOrientation === "landscape"
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              {selectedOrientation === "landscape" && (
                <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}

              {/* Visual Landscape Page Icon */}
              <div className="w-22 h-16 rounded-lg border-2 border-current bg-background flex flex-col justify-between p-2 shadow-sm transition-transform group-hover:scale-105">
                <div className="w-full flex flex-col gap-1">
                  <div className="w-1/2 h-1.5 bg-current rounded-full opacity-60" />
                  <div className="grid grid-cols-3 gap-1 my-0.5">
                    <div className="h-1 bg-current rounded-full opacity-30" />
                    <div className="h-1 bg-current rounded-full opacity-30" />
                    <div className="h-1 bg-current rounded-full opacity-30" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-1 bg-current rounded-full opacity-20" />
                    <div className="h-1 bg-current rounded-full opacity-20" />
                    <div className="h-1 bg-current rounded-full opacity-20" />
                  </div>
                </div>
                <div className="w-1/3 h-1 bg-current rounded-full opacity-40 self-end" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground mb-0.5">
                  Landscape (Pahiga)
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  11 × 8.5 in (Horizontal)
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Inirerekomenda para sa malalawak na ledger, multi-column masterlists, at census tables.
                </p>
              </div>
            </div>
          </div>

          {/* Official Printing Typography & Standards Info Banner */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Type className="h-4 w-4 text-primary" />
              <span>Opisyal na Pamantayan sa Pag-print (Print Specifications)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">Font Style:</span>
                <span className="font-serif italic font-medium">Times New Roman, 12pt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">Paper Footer:</span>
                <span className="font-serif italic text-slate-700 dark:text-slate-300">system generated (11pt)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/50 flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Kanselahin (Cancel)
          </Button>

          <Button
            type="button"
            onClick={handleProceedPrint}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-md shadow-primary/20"
          >
            <Printer className="h-4 w-4" />
            I-print Ngayon ({selectedOrientation === "landscape" ? "Landscape" : "Portrait"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
