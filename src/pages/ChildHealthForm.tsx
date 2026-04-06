import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const ChildHealthForm = () => {
  const { t } = useSettings();
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Baby className="h-6 w-6 text-primary" />{t("child.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("child.desc")}</p>
      </div>
      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">{t("common.comingSoon")}</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">{t("child.comingSoonDesc")}</p></CardContent>
      </Card>
    </div>
  );
};

export default ChildHealthForm;
