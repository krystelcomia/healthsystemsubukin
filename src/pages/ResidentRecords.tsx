import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search } from "lucide-react";

const mockResidents = [
  { id: 1, name: "Maria Santos", sitio: "Sitio Uno", age: 34, forms: ["Consultation", "PhilPen Health"] },
  { id: 2, name: "Juan Dela Cruz", sitio: "Sitio Dos", age: 45, forms: ["Family Data", "Consultation"] },
  { id: 3, name: "Ana Reyes", sitio: "Sitio Tres", age: 28, forms: ["PhilPen Health", "Maternal Care"] },
  { id: 4, name: "Pedro Garcia", sitio: "Sitio Uno", age: 52, forms: ["Dengue Prevention", "Consultation"] },
  { id: 5, name: "Rosa Mendoza", sitio: "Sitio Dos", age: 31, forms: ["Maternal Care", "Family Data"] },
  { id: 6, name: "Carlos Villanueva", sitio: "Sitio Tres", age: 60, forms: ["PhilPen Health"] },
  { id: 7, name: "Elena Ramos", sitio: "Sitio Uno", age: 22, forms: ["Consultation"] },
];

const ResidentRecords = () => {
  const [search, setSearch] = useState("");

  const filtered = mockResidents.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.sitio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Resident Records
        </h1>
        <p className="text-muted-foreground mt-1">Search and view all resident health records.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name or sitio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((resident) => (
          <Card key={resident.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {resident.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{resident.name}</p>
                  <p className="text-sm text-muted-foreground">{resident.sitio} · Age {resident.age}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {resident.forms.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No residents found.</p>
        )}
      </div>
    </div>
  );
};

export default ResidentRecords;
