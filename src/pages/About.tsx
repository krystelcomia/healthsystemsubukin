import { useEffect, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Rocket, Target, MapPin, TrendingUp, Users, Home as HomeIcon, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const About = () => {
  const { t } = useSettings();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

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

  useEffect(() => {
    const loadLeaflet = async () => {
      // Dynamic load Leaflet CSS and JS to avoid bundler issues and bundle weight
      if (!(window as any).L) {
        // Load stylesheet
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        // Load script
        if (!document.querySelector('script[src*="leaflet.js"]')) {
          await new Promise<void>((resolve) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => resolve();
            document.body.appendChild(script);
          });
        }
      }

      const L = (window as any).L;
      if (L && mapContainerRef.current && !mapRef.current) {
        // Barangay Subukin coordinates: [13.7252, 121.4381]
        mapRef.current = L.map(mapContainerRef.current).setView([13.7252, 121.4381], 14);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);

        L.marker([13.7252, 121.4381])
          .addTo(mapRef.current)
          .bindPopup(`<b>Barangay Subukin</b><br>San Juan, Batangas, Philippines`)
          .openPopup();
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-8 max-w-7xl animate-fade-in">
      {/* Hero Header Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary/95 to-primary/80 text-primary-foreground p-8 md:p-12 shadow-lg overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
          <Info className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/15 border border-primary-foreground/20 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <MapPin className="h-4 w-4" />
            San Juan, Batangas, Philippines
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight">
            {t("about.title")}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 font-medium leading-relaxed">
            {t("about.description")}
          </p>
        </div>
      </div>

      {/* Vision, Mission, and Goal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vision Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.vision")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1">
            {t("about.visionText")}
          </CardContent>
        </Card>

        {/* Mission Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.mission")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1">
            {t("about.missionText")}
          </CardContent>
        </Card>

        {/* Goal Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
          <CardHeader className="pb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading font-bold text-foreground">
              {t("about.goal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm flex-1">
            {t("about.goalText")}
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            {t("about.mapTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden rounded-lg border border-border/50 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-[400px] z-10" />
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
