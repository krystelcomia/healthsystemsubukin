import { Eye, Lock } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * ReadOnlyBanner — shown at the top of form pages for midwife users.
 * Informs the midwife they are in view-only mode and cannot submit records.
 */
export const ReadOnlyBanner = () => {
  const { language } = useSettings();
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-700 dark:text-amber-300 mb-4 shadow-sm">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/15 shrink-0">
        <Eye className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          {language === "tl" ? "View Only — Midwife Mode" : "View Only — Midwife Mode"}
        </p>
        <p className="text-xs opacity-80 mt-0.5">
          {language === "tl"
            ? "Ikaw ay naka-log in bilang Midwife. Maaari kang tumingin ngunit hindi maaaring magdagdag, mag-edit, o mag-delete ng mga rekord."
            : "You are logged in as a Midwife. You may view records but cannot add, edit, or delete any data."}
        </p>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold shrink-0">
        <Lock className="h-3 w-3" />
        {language === "tl" ? "Read Only" : "Read Only"}
      </div>
    </div>
  );
};
