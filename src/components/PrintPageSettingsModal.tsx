import React, { useState, useEffect, useRef } from "react";
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
import { useSettings } from "@/contexts/SettingsContext";

export interface PrintPageSettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirmPrint?: (orientation: PrintOrientation) => void;
  onCancel?: () => void;
  defaultOrientation?: PrintOrientation;
  title?: string;
}

export const PrintPageSettingsModal: React.FC<PrintPageSettingsModalProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onConfirmPrint,
  onCancel,
  defaultOrientation,
  title,
}) => {
  const { language } = useSettings();
  const isTagalog = language === "tl";

  const [internalOpen, setInternalOpen] = useState(false);
  const [activeCallback, setActiveCallback] = useState<((orientation: PrintOrientation) => void) | null>(null);
  const [activeCancelCallback, setActiveCancelCallback] = useState<(() => void) | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [selectedOrientation, setSelectedOrientation] = useState<PrintOrientation>(() => {
    return defaultOrientation || getSavedPrintOrientation();
  });

  // Track the original orientation so cancellation can cleanly restore it
  const originalOrientationRef = useRef<PrintOrientation>(selectedOrientation);

  // When modal becomes open, snapshot current orientation
  useEffect(() => {
    if (isOpen) {
      const current = defaultOrientation || getSavedPrintOrientation();
      setSelectedOrientation(current);
      originalOrientationRef.current = current;
    }
  }, [isOpen, defaultOrientation]);

  // Listen to global open event only on the uncontrolled root instance
  useEffect(() => {
    if (isControlled) return;

    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PrintSettingsEventDetail>;
      const detail = customEvent.detail;
      const initial = detail?.defaultOrientation || getSavedPrintOrientation();
      setSelectedOrientation(initial);
      originalOrientationRef.current = initial;

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
      if (detail?.onCancel) {
        setActiveCancelCallback(() => detail.onCancel);
      } else {
        setActiveCancelCallback(null);
      }
      setInternalOpen(true);
    };

    window.addEventListener("bhw-open-print-settings", handleOpenEvent);
    return () => {
      window.removeEventListener("bhw-open-print-settings", handleOpenEvent);
    };
  }, [isControlled]);

  const handleSelectOrientation = (orientation: PrintOrientation) => {
    setSelectedOrientation(orientation);
    applyPrintOrientation(orientation);
  };

  const handleCancel = () => {
    // Revert previewed orientation back to the original orientation
    if (originalOrientationRef.current) {
      applyPrintOrientation(originalOrientationRef.current);
      setSelectedOrientation(originalOrientationRef.current);
    }
    setIsOpen(false);
    if (onCancel) {
      onCancel();
    } else if (activeCancelCallback) {
      activeCancelCallback();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    } else {
      setIsOpen(true);
    }
  };

  const handleProceedPrint = () => {
    // Save chosen preference
    setSavedPrintOrientation(selectedOrientation);

    // Apply orientation
    applyPrintOrientation(selectedOrientation);
    originalOrientationRef.current = selectedOrientation;

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

  const resolvedTitle =
    customTitle ||
    title ||
    (isTagalog ? "Mga Setting sa Pag-print ng Pahina" : "Print Page Settings");

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-primary/20 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                {resolvedTitle}
                <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                  {isTagalog ? "Opisyal na Format" : "Official Format"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isTagalog
                  ? "Pumili ng orientation at ayusin ang mga setting ng pahina bago i-print ang dokumento."
                  : "Select page orientation and configure print settings before printing the document."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Orientation Chooser */}
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>{isTagalog ? "Pumili ng Oryentasyon (Page Orientation)" : "Page Orientation"}</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              {isTagalog
                ? "Awtomatikong ia-apply sa browser print preview"
                : "Automatically applied to browser print preview"}
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
                  {isTagalog ? "Portrait (Patayo)" : "Portrait"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  8.5 × 11 in ({isTagalog ? "Patayo / Vertical" : "Vertical"})
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  {isTagalog
                    ? "Inirerekomenda para sa mga karaniwang form, indibidwal na rekord, at mga consultation slip."
                    : "Recommended for standard forms, individual records, and consultation slips."}
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
                  {isTagalog ? "Landscape (Pahiga)" : "Landscape"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  11 × 8.5 in ({isTagalog ? "Pahiga / Horizontal" : "Horizontal"})
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  {isTagalog
                    ? "Inirerekomenda para sa malalawak na ledger, multi-column masterlist, at mga talaan ng sensus."
                    : "Recommended for wide ledgers, multi-column masterlists, and census tables."}
                </p>
              </div>
            </div>
          </div>

          {/* Official Printing Typography & Standards Info Banner */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Type className="h-4 w-4 text-primary" />
              <span>{isTagalog ? "Opisyal na Pamantayan sa Pag-print (Print Specifications)" : "Official Print Specifications"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{isTagalog ? "Estilo ng Font:" : "Font Style:"}</span>
                <span className="font-serif italic font-medium">Times New Roman, 12pt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{isTagalog ? "Footer ng Pahina:" : "Page Footer:"}</span>
                <span className="font-serif italic text-slate-700 dark:text-slate-300">system generated (11pt)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/50 flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto font-medium"
          >
            {isTagalog ? "Kanselahin" : "Cancel"}
          </Button>

          <Button
            type="button"
            onClick={handleProceedPrint}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 shadow-md shadow-primary/20"
          >
            <Printer className="h-4 w-4" />
            {isTagalog
              ? `I-print Ngayon (${selectedOrientation === "landscape" ? "Landscape" : "Portrait"})`
              : `Print Now (${selectedOrientation === "landscape" ? "Landscape" : "Portrait"})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
