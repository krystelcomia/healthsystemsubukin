import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Language = "en" | "tl";

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  fontStyle: string;
  setFontStyle: (v: string) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType>({
  darkMode: false,
  setDarkMode: () => {},
  fontSize: "medium",
  setFontSize: () => {},
  fontStyle: "inter",
  setFontStyle: () => {},
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useSettings = () => useContext(SettingsContext);

const FONT_SIZE_MAP: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

const FONT_STYLE_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  system: "system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Sidebar
    "sidebar.adminPanel": "Admin Panel",
    "sidebar.bhwSystem": "BHW System",
    "sidebar.supervisor": "Supervisor",
    "sidebar.healthRecords": "Health Records",
    "sidebar.overview": "Overview",
    "sidebar.healthForms": "Health Forms",
    "sidebar.system": "System",
    "sidebar.signOut": "Sign Out",
    "sidebar.signOutTitle": "Sign Out?",
    "sidebar.signOutDesc": "Are you sure you want to sign out? You will need to log in again to access the system.",
    "sidebar.cancel": "Cancel",
    // Navigation Items
    "nav.dashboard": "Dashboard",
    "nav.residentRecords": "Resident Records",
    "nav.bhWorkers": "BH Workers",
    "nav.familyData": "Family Data",
    "nav.consultation": "Consultation",
    "nav.philpenHealth": "PhilPen Health",
    "nav.denguePrevention": "Dengue Prevention",
    "nav.maternalCare": "Maternal Care",
    "nav.childHealth": "Child Health",
    "nav.familyPlanning": "Family Planning",
    "nav.settings": "Settings",
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome back! Here's an overview of your barangay health data.",
    "dashboard.totalResidents": "Total Residents",
    "dashboard.consultations": "Consultations",
    "dashboard.familyRecords": "Family Records",
    "dashboard.children": "Children (≤12)",
    "dashboard.registeredResidents": "Registered residents",
    "dashboard.totalConsultations": "Total consultations",
    "dashboard.familiesRegistered": "Families registered",
    "dashboard.registeredChildren": "Registered children",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.newConsultation": "New Consultation",
    "dashboard.healthScreening": "Health Screening",
    "dashboard.viewResidents": "View Residents",
    "dashboard.loading": "Loading...",
    "dashboard.noActivity": "No recent activity.",
    // Settings
    "settings.title": "Settings",
    "settings.description": "Manage system preferences and data.",
    "settings.display": "Display",
    "settings.darkMode": "Dark Mode",
    "settings.fontSize": "Font Size",
    "settings.fontStyle": "Font Style",
    "settings.language": "Language",
    "settings.backup": "Backup & Recovery",
    "settings.export": "Export Data Backup",
    "settings.restore": "Restore from Backup",
    "settings.generateReport": "Generate Reports",
    "settings.generateReportDesc": "Generate a comprehensive report of all health forms, records, and resident data.",
    "settings.generateFullReport": "Generate Full Report",
    "settings.generating": "Generating...",
    // Common
    "common.small": "Small",
    "common.medium": "Medium",
    "common.large": "Large",
    "common.english": "English",
    "common.tagalog": "Tagalog",
    "common.worker": "Worker",
    // Admin Settings
    "admin.settings.title": "Admin Settings",
    "admin.settings.description": "Manage display preferences, reports, and data.",
  },
  tl: {
    // Sidebar
    "sidebar.adminPanel": "Admin Panel",
    "sidebar.bhwSystem": "BHW Sistema",
    "sidebar.supervisor": "Superbisor",
    "sidebar.healthRecords": "Mga Record ng Kalusugan",
    "sidebar.overview": "Pangkalahatang-Ideya",
    "sidebar.healthForms": "Mga Form ng Kalusugan",
    "sidebar.system": "Sistema",
    "sidebar.signOut": "Mag-sign Out",
    "sidebar.signOutTitle": "Mag-sign Out?",
    "sidebar.signOutDesc": "Sigurado ka bang gusto mong mag-sign out? Kailangan mong mag-log in muli upang ma-access ang sistema.",
    "sidebar.cancel": "Kanselahin",
    // Navigation Items
    "nav.dashboard": "Dashboard",
    "nav.residentRecords": "Mga Record ng Residente",
    "nav.bhWorkers": "Mga BH Worker",
    "nav.familyData": "Datos ng Pamilya",
    "nav.consultation": "Konsultasyon",
    "nav.philpenHealth": "PhilPen Health",
    "nav.denguePrevention": "Pag-iwas sa Dengue",
    "nav.maternalCare": "Pangangalaga sa Ina",
    "nav.childHealth": "Kalusugan ng Bata",
    "nav.familyPlanning": "Family Planning",
    "nav.settings": "Mga Setting",
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Maligayang pagbabalik! Narito ang pangkalahatang-ideya ng datos ng kalusugan ng inyong barangay.",
    "dashboard.totalResidents": "Kabuuang Residente",
    "dashboard.consultations": "Mga Konsultasyon",
    "dashboard.familyRecords": "Mga Record ng Pamilya",
    "dashboard.children": "Mga Bata (≤12)",
    "dashboard.registeredResidents": "Mga nakarehistrong residente",
    "dashboard.totalConsultations": "Kabuuang konsultasyon",
    "dashboard.familiesRegistered": "Mga nakarehistrong pamilya",
    "dashboard.registeredChildren": "Mga nakarehistrong bata",
    "dashboard.recentActivity": "Kamakailang Aktibidad",
    "dashboard.quickActions": "Mabilis na Aksyon",
    "dashboard.newConsultation": "Bagong Konsultasyon",
    "dashboard.healthScreening": "Health Screening",
    "dashboard.viewResidents": "Tingnan ang mga Residente",
    "dashboard.loading": "Naglo-load...",
    "dashboard.noActivity": "Walang kamakailang aktibidad.",
    // Settings
    "settings.title": "Mga Setting",
    "settings.description": "Pamahalaan ang mga kagustuhan at datos ng sistema.",
    "settings.display": "Display",
    "settings.darkMode": "Dark Mode",
    "settings.fontSize": "Laki ng Font",
    "settings.fontStyle": "Estilo ng Font",
    "settings.language": "Wika",
    "settings.backup": "Backup at Recovery",
    "settings.export": "I-export ang Data Backup",
    "settings.restore": "I-restore mula sa Backup",
    "settings.generateReport": "Gumawa ng mga Report",
    "settings.generateReportDesc": "Gumawa ng komprehensibong report ng lahat ng health forms, records, at datos ng residente.",
    "settings.generateFullReport": "Gumawa ng Buong Report",
    "settings.generating": "Ginagawa...",
    // Common
    "common.small": "Maliit",
    "common.medium": "Katamtaman",
    "common.large": "Malaki",
    "common.english": "English",
    "common.tagalog": "Tagalog",
    "common.worker": "Manggagawa",
    // Admin Settings
    "admin.settings.title": "Admin Settings",
    "admin.settings.description": "Pamahalaan ang display preferences, reports, at datos.",
  },
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("fontSize") || "medium");
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem("fontStyle") || "inter");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("language") as Language) || "en");

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] || "16px";
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.fontFamily = FONT_STYLE_MAP[fontStyle] || FONT_STYLE_MAP.inter;
    localStorage.setItem("fontStyle", fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
