import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { 
  PrintOrientation, 
  getSavedPrintOrientation, 
  setSavedPrintOrientation, 
  applyPrintOrientation,
  executePrintWithOrientation 
} from "@/lib/printSettings";
import { PrintPageSettingsModal } from "@/components/PrintPageSettingsModal";
import { useSettings } from "@/contexts/SettingsContext";

interface PrintPageSettingsBarProps {
  onPrint?: (orientation: PrintOrientation) => void;
  className?: string;
  formName?: string;
  compact?: boolean;
  defaultOrientation?: PrintOrientation | string;
  disabled?: boolean;
  buttonText?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const PrintPageSettingsBar: React.FC<PrintPageSettingsBarProps> = ({
  onPrint,
  className = "",
  formName,
  defaultOrientation,
  disabled = false,
  buttonText,
  variant = "outline",
  size = "sm",
}) => {
  const { language } = useSettings();
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

  const handleTriggerPrint = (chosenOrientation?: PrintOrientation) => {
    if (disabled) return;
    const finalOrientation = chosenOrientation || orientation;
    setOrientation(finalOrientation);
    setSavedPrintOrientation(finalOrientation);
    applyPrintOrientation(finalOrientation);
    if (onPrint) {
      onPrint(finalOrientation);
    } else {
      executePrintWithOrientation(finalOrientation);
    }
  };

  const label = buttonText || (language === "tl" ? "I-print" : "Print");

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => setSettingsModalOpen(true)}
        className={`no-print gap-2 border-primary/30 text-primary hover:bg-primary/10 font-semibold h-9 text-xs sm:text-sm shrink-0 shadow-xs ${className}`}
        title={language === "tl" ? "I-print ang Form" : "Print Form"}
      >
        <Printer className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      {/* Embedded Modal Dialog: Landscape and portrait options only appear once clicked */}
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

