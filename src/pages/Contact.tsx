import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Search,
  Users,
  PhoneCall,
  User,
  Shield,
  AlertTriangle,
  Building,
  Activity,
  Flame,
  Heart,
  HeartPulse
} from "lucide-react";

import { logActivity } from "@/lib/activityLogger";

interface Contact {
  id: number;
  name: string;
  phone: string;
  role: "supervisory" | "bns" | "worker";
}

interface EmergencyContact {
  id: number;
  service: string;
  phone: string;
  hasDirectCall: boolean;
  notes?: string;
  icon: "AlertTriangle" | "Shield" | "Activity" | "Building" | "Flame" | "HeartPulse";
}

interface HospitalContact {
  id: number;
  name: string;
  phone: string;
}

const BHW_CONTACTS: Contact[] = [
  { id: 1, name: "Cristeta R. Lanuza", phone: "0919-6980-712", role: "supervisory" },
  { id: 2, name: "Evelyn T. Ilao", phone: "0935-5638-247", role: "worker" },
  { id: 3, name: "Cecilia G. Benosa", phone: "0921-8509-320", role: "worker" },
  { id: 4, name: "Merlita R. Alonzo", phone: "0930-9085-713", role: "worker" },
  { id: 5, name: "Suzette B. Lopez", phone: "0935-2008-942", role: "worker" },
  { id: 6, name: "Amelita R. Sayat", phone: "0931-0232-973", role: "worker" },
  { id: 7, name: "Wilma D. Tanyag", phone: "0997-4971-138", role: "worker" },
  { id: 8, name: "Nenita M. Dimaculangan", phone: "0985-1225-857", role: "worker" },
  { id: 9, name: "Mercy O. Abanilla", phone: "0949-7768-394", role: "worker" },
  { id: 10, name: "Renchie V. Ilao", phone: "0965-6627-031", role: "worker" },
  { id: 11, name: "Renalyn D. Laurente", phone: "0985-1086-472", role: "worker" },
  { id: 12, name: "Maribel M. Abayon", phone: "0922-6722-134", role: "bns" }
];

const EMERGENCY_SERVICES: EmergencyContact[] = [
  { id: 1, service: "National Emergency Hotline", phone: "911", hasDirectCall: true, icon: "AlertTriangle" },
  { id: 2, service: "Emergency / Rescue (MDRRMO)", phone: "0998-590-5102", hasDirectCall: true, icon: "Shield" },
  { id: 3, service: "Ambulance", phone: "0905-669-927", hasDirectCall: true, icon: "HeartPulse" },
  { id: 4, service: "Police (San Juan Municipal Police Station)", phone: "0915-385-0205", hasDirectCall: true, icon: "Shield" },
  { id: 5, service: "Municipal Government Trunkline", phone: "(043) 726-5826", hasDirectCall: true, icon: "Building" },
  { id: 6, service: "Transfer to Isolation Facility", phone: "0918-518-7769 / 0919-080-7659", hasDirectCall: true, icon: "Activity" },
  { id: 7, service: "Fire Station", phone: "911 / MDRRMO", hasDirectCall: false, notes: "contact.fireStationDesc", icon: "Flame" }
];

const HOSPITAL_CONTACTS: HospitalContact[] = [
  { id: 1, name: "San Juan District Hospital", phone: "(043) 633-3756" },
  { id: 2, name: "San Juan Doctors' Hospital", phone: "(043) 575-3138" },
  { id: 3, name: "Divine Care Hospital", phone: "(043) 420-0062" },
  { id: 4, name: "St. Andrew Hospital", phone: "(043) 575-4097" },
  { id: 5, name: "Duque General Hospital", phone: "(034) 575-5090" }
];

const ContactPage = () => {
  const { t } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBHW = BHW_CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const getRoleBadge = (role: Contact["role"]) => {
    switch (role) {
      case "supervisory":
        return (
          <Badge className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-600 text-white">
            {t("contact.role.supervisory")}
          </Badge>
        );
      case "bns":
        return (
          <Badge className="bg-amber-600 dark:bg-amber-700 hover:bg-amber-600 text-white">
            {t("contact.role.bns")}
          </Badge>
        );
      case "worker":
      default:
        return (
          <Badge className="bg-teal-600 dark:bg-teal-700 hover:bg-teal-600 text-white">
            {t("contact.role.worker")}
          </Badge>
        );
    }
  };

  const getEmergencyIcon = (iconName: EmergencyContact["icon"]) => {
    switch (iconName) {
      case "AlertTriangle":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "Shield":
        return <Shield className="h-5 w-5 text-blue-500" />;
      case "HeartPulse":
        return <HeartPulse className="h-5 w-5 text-rose-500" />;
      case "Building":
        return <Building className="h-5 w-5 text-emerald-500" />;
      case "Flame":
        return <Flame className="h-5 w-5 text-orange-500" />;
      case "Activity":
      default:
        return <Activity className="h-5 w-5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Phone className="h-6 w-6 text-primary" />
          {t("contact.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("contact.desc")}</p>
      </div>

      <Tabs defaultValue="bhw" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="bhw" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("contact.tabWorkers")}
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("contact.tabEmergency")}
          </TabsTrigger>
        </TabsList>

        {/* BHW Workers Tab Content */}
        <TabsContent value="bhw" className="space-y-6">
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("contact.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredBHW.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBHW.map((c) => (
                    <Card
                      key={c.id}
                      className="border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-semibold text-lg animate-pulse-subtle">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-heading font-semibold text-foreground text-base">
                                {c.name}
                              </h3>
                              <div className="mt-1">{getRoleBadge(c.role)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/20">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                            <PhoneCall className="h-4 w-4 text-primary" />
                            <span>{c.phone}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-primary hover:text-white"
                            asChild
                          >
                            <a 
                              href={`tel:${c.phone.replace(/-/g, "")}`}
                              onClick={() => logActivity("call_bhw", { description: `Clicked call to BHW worker: ${c.name} (${c.phone})` })}
                            >
                              {t("contact.call")}
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p>{t("contact.noResults")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts Tab Content */}
        <TabsContent value="emergency" className="space-y-8">
          {/* Rescue and Public Services Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t("contact.emergencyHotlines")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EMERGENCY_SERVICES.map((c) => {
                const is911 = c.phone === "911";
                return (
                  <Card
                    key={c.id}
                    className={`border transition-all duration-300 ${
                      is911
                        ? "border-red-500/40 bg-red-500/5 dark:bg-red-950/20 hover:shadow-red-500/10"
                        : "border-border/40 hover:border-primary/40"
                    } hover:shadow-lg flex flex-col justify-between`}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          is911 ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                        }`}>
                          {getEmergencyIcon(c.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-semibold text-foreground text-base truncate">
                            {c.service}
                          </h3>
                          {c.notes && (
                            <p className="text-xs text-muted-foreground mt-1 leading-normal">
                              {t(c.notes)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/20">
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${is911 ? "text-red-500" : "text-foreground"}`}>
                            {c.phone}
                          </span>
                        </div>
                        {c.hasDirectCall ? (
                          <Button
                            size="sm"
                            variant={is911 ? "destructive" : "outline"}
                            className={!is911 ? "hover:bg-primary hover:text-white" : ""}
                            asChild
                          >
                            <a
                              href={`tel:${c.phone
                                .split("/")[0]
                                .trim()
                                .replace(/[()-\s]/g, "")}`}
                              onClick={() => logActivity("call_hotline", { description: `Clicked call to emergency hotline: ${c.service} (${c.phone})` })}
                            >
                              {t("contact.call")}
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="secondary">{t("common.worker")}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Hospitals & Medical Centers Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {t("contact.hospitals")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {HOSPITAL_CONTACTS.map((c) => (
                <Card
                  key={c.id}
                  className="border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <Heart className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-foreground text-base truncate">
                          {c.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                        <PhoneCall className="h-4 w-4 text-rose-500" />
                        <span>{c.phone}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:bg-rose-500 hover:text-white"
                        asChild
                      >
                        <a 
                          href={`tel:${c.phone.replace(/[()-\s]/g, "")}`}
                          onClick={() => logActivity("call_hospital", { description: `Clicked call to hospital: ${c.name} (${c.phone})` })}
                        >
                          {t("contact.call")}
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactPage;
