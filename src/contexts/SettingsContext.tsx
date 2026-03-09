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
    // Admin Settings
    "admin.settings.title": "Admin Settings",
    "admin.settings.description": "Manage display preferences, reports, and data.",
  },
  tl: {
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
