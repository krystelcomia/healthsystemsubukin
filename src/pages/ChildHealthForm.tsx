import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const ChildHealthForm = () => {
  const { t } = useSettings();
  return (
    <div className="w-full space-y-6">

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("common.comingSoon")}</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">{t("child.comingSoonDesc")}</p></CardContent>
      </Card>
    </div>
  );
};

export default ChildHealthForm;
