import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby } from "lucide-react";

const ChildHealthForm = () => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Baby className="h-6 w-6 text-primary" />
          Child Health
        </h1>
        <p className="text-muted-foreground mt-1">Child vaccination and deworming records.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-heading">Coming Soon</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The Child Vaccine and Deworming Form will be available in the next update.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChildHealthForm;
