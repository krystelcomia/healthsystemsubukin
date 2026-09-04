import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Rocket, 
  Target, 
  MapPin, 
  TrendingUp, 
  Users, 
  Home as HomeIcon, 
  Info,
  ExternalLink,
  Layers,
  Globe,
  Compass,
  Building,
  Anchor,
  School,
  Navigation
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PageHeaderBanner } from "@/components/PageHeaderBanner";

// Verified exact coordinates for Barangay Subukin, San Juan, Batangas
const SUBUKIN_COORDS = {
  lat: 13.72335,
  lng: 121.44059,
  name: "Barangay Subukin",
  municipality: "San Juan, Batangas",
  postalCode: "4226",
  region: "Region IV-A (CALABARZON)",
  bay: "Tayabas Bay",
  plusCode: "PCFR+JHH, San Juan, Batangas",
};

const About = () => {
  const { t, language } = useSettings();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapViewMode, setMapViewMode] = useState<"google" | "satellite" | "interactive">("google");

  // Historical census data for Barangay Subukin
  const demographicData = [
    { year: "1990", population: 866, households: 168, averageSize: 5.15 },
    { year: "1995", population: 885, households: 198, averageSize: 4.47 },
    { year: "2000", population: 1026, households: 217, averageSize: 4.73 },
    { year: "2007", population: 1106, households: 252, averageSize: 4.39 },
    { year: "2010", population: 1444, households: 365, averageSize: 3.96 },
    { year: "2015", population: 1635, households: 351, averageSize: 4.66 },
    { year: "2020", population: 2056, households: null, averageSize: null }, // 2020 census only details total population
  ];

  // For the secondary charts that only show households/average size up to 2015
  const householdData = demographicData.filter(d => d.households !== null);

  // Initialize interactive Leaflet map when "interactive" tab is selected
  useEffect(() => {
    if (mapViewMode !== "interactive") return;

    let isMounted = true;

    const initLeaflet = async () => {
      if (!(window as any).L) {
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        if (!document.querySelector('script[src*="leaflet.js"]')) {
          await new Promise<void>((resolve) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => resolve();
            document.body.appendChild(script);
          });
        }
      }

      if (!isMounted || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const subukinCoords: [number, number] = [SUBUKIN_COORDS.lat, SUBUKIN_COORDS.lng];
      const map = L.map(mapContainerRef.current).setView(subukinCoords, 15);
      mapRef.current = map;

      // Use CartoDB Voyager tiles for clear, crisp, modern labeling
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Highlight Barangay Subukin Area Circle
      L.circle(subukinCoords, {
        color: "#059669",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        radius: 950,
        weight: 2,
        dashArray: "6, 6",
      }).addTo(map).bindTooltip("Barangay Subukin Territorial Boundary", { permanent: false });

      // Primary Marker: Subukin Barangay Hall & Health Center
      const hallMarker = L.marker(subukinCoords).addTo(map);
      hallMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <strong style="color: #047857; font-size: 14px; font-weight: 700;">Barangay Subukin</strong>
            <span style="background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; border: 1px solid #a7f3d0;">Official</span>
          </div>
          <div style="font-size: 11.5px; color: #475569; margin-bottom: 4px;">
            📍 San Juan, Batangas • Postal 4226
          </div>
          <div style="font-size: 11px; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; color: #1e293b; margin-top: 4px;">
            🏥 <strong>Subukin Health Center & Barangay Hall</strong><br/>
            Primary Public Health Services & Registry
          </div>
        </div>
      `).openPopup();

      // Secondary Marker: Subukin Elementary School
      L.marker([13.72400, 121.44140]).addTo(map).bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <strong style="color: #1e40af;">🏫 Subukin Elementary School</strong><br/>
          <span style="color: #64748b; font-size: 11px;">DepEd San Juan District • Plus Code: PCFR+JHH</span>
        </div>
      `);

      // Tertiary Marker: Subukin Port (San Juan Seaport)
      L.marker([13.72186, 121.44861]).addTo(map).bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <strong style="color: #0891b2;">⚓ San Juan Seaport (Subukin Port)</strong><br/>
          <span style="color: #64748b; font-size: 11px;">Barangay Subukin • Tayabas Bay Coastline</span>
        </div>
      `);
    };

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapViewMode]);

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Hero Header Section matching Dashboard */}
      <PageHeaderBanner
        icon={Info}
        badge="San Juan, Batangas, Philippines"
        title={t("about.title")}
        description={t("about.description")}
        className="p-8 md:p-10"
      />

      {/* Vision, Mission, and Goal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vision Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.vision")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1 text-center">
            {t("about.visionText")}
          </CardContent>
        </Card>

        {/* Mission Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.mission")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1 text-center">
            {t("about.missionText")}
          </CardContent>
        </Card>

        {/* Goal Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.goal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1 text-center">
            {t("about.goalText")}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Clear Geographical Location Map Section */}
      <Card className="border-border/50 shadow-md overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xl font-heading font-bold text-foreground">
                    {t("about.mapTitle")} — Barangay Subukin
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exact Location: 13.7234° N, 121.4406° E • Municipality of San Juan, Batangas
                  </p>
                </div>
              </div>
            </div>

            {/* Map Mode Selector Controls */}
            <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border/60 shadow-xs self-start sm:self-auto">
              <Button
                type="button"
                variant={mapViewMode === "google" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapViewMode("google")}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Google Map</span>
              </Button>
              <Button
                type="button"
                variant={mapViewMode === "satellite" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapViewMode("satellite")}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Satellite</span>
              </Button>
              <Button
                type="button"
                variant={mapViewMode === "interactive" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapViewMode("interactive")}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>GIS / Sitios</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Map Display Container */}
          <div className="relative w-full h-[460px] bg-slate-100 dark:bg-slate-900">
            {mapViewMode === "google" && (
              <iframe
                title="Barangay Subukin Google Map"
                src="https://maps.google.com/maps?q=Barangay+Subukin,+San+Juan,+Batangas&t=m&z=15&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}

            {mapViewMode === "satellite" && (
              <iframe
                title="Barangay Subukin Satellite Map"
                src="https://maps.google.com/maps?q=Barangay+Subukin,+San+Juan,+Batangas&t=k&z=16&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}

            {mapViewMode === "interactive" && (
              <div ref={mapContainerRef} className="w-full h-full z-10" />
            )}
          </div>

          {/* Quick Geographic Information Banner */}
          <div className="p-4 sm:p-5 bg-card border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-[11px]">
                <Building className="h-3.5 w-3.5 text-primary" /> Administrative Location
              </span>
              <p className="font-bold text-foreground text-sm">Barangay Subukin</p>
              <p className="text-muted-foreground text-[11px]">San Juan, Batangas • Zip Code: 4226</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-[11px]">
                <Navigation className="h-3.5 w-3.5 text-emerald-600" /> Geographic GPS Coordinates
              </span>
              <p className="font-bold text-foreground font-mono text-sm">13.7234° N, 121.4406° E</p>
              <p className="text-muted-foreground text-[11px]">Plus Code: PCFR+JHH, San Juan</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-[11px]">
                <Anchor className="h-3.5 w-3.5 text-sky-600" /> Key Barangay Landmarks
              </span>
              <p className="font-bold text-foreground text-xs">Health Center & Port</p>
              <p className="text-muted-foreground text-[11px]">Subukin Port • Subukin Elem School</p>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Barangay+Subukin,+San+Juan,+Batangas"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                </Button>
              </a>
              <a
                href="https://waze.com/ul?ll=13.72335,121.44059&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="ghost" size="sm" className="w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                  <Navigation className="h-3.5 w-3.5" /> Open Navigation in Waze
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics & Trend Charts */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t("about.demographics")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical census data provided by the Philippine Statistics Authority (PSA)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Population Growth Chart */}
          <Card className="border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("about.householdTrends")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={demographicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    name={t("about.population")}
                    dataKey="population"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    name={t("about.households")}
                    dataKey="households"
                    stroke="hsl(210, 70%, 42%)"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Household Size Chart */}
          <Card className="border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <HomeIcon className="h-4 w-4 text-primary" />
                {t("about.householdSize")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={householdData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[3, 6]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    name={t("about.averageSize")}
                    dataKey="averageSize"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Raw Demographics Data Table */}
        <Card className="border-border/50 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b border-border/50 font-bold">
                <tr>
                  <th scope="col" className="px-6 py-4">{t("about.year")}</th>
                  <th scope="col" className="px-6 py-4">{t("about.population")}</th>
                  <th scope="col" className="px-6 py-4">{t("about.households")}</th>
                  <th scope="col" className="px-6 py-4">{t("about.averageSize")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card text-foreground">
                {demographicData.map((data, index) => (
                  <tr key={index} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium">{data.year}</td>
                    <td className="px-6 py-3.5">{data.population.toLocaleString()}</td>
                    <td className="px-6 py-3.5">{data.households ? data.households.toLocaleString() : "—"}</td>
                    <td className="px-6 py-3.5">{data.averageSize ? data.averageSize.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default About;
