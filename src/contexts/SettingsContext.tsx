import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";

export type { Language };

export type ColorTheme = "emerald" | "ocean" | "purple" | "rose" | "amber" | "slate";

export const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string; vars: Record<string, string> }[] = [
  {
    id: "emerald", label: "Emerald Green", swatch: "hsl(123 46% 34%)",
    vars: {
      "--primary": "123 46% 34%", "--ring": "123 46% 34%", "--accent": "123 46% 40%",
      "--secondary": "123 40% 94%", "--secondary-foreground": "123 65% 30%",
      "--sidebar-background": "123 46% 22%", "--sidebar-primary": "123 46% 49%",
      "--sidebar-accent": "123 46% 30%", "--sidebar-border": "123 40% 32%", "--sidebar-ring": "123 46% 49%",
    },
  },
  {
    id: "ocean", label: "Ocean Blue", swatch: "hsl(210 70% 42%)",
    vars: {
      "--primary": "210 70% 42%", "--ring": "210 70% 42%", "--accent": "210 70% 50%",
      "--secondary": "210 60% 94%", "--secondary-foreground": "210 75% 30%",
      "--sidebar-background": "210 70% 22%", "--sidebar-primary": "210 70% 55%",
      "--sidebar-accent": "210 70% 30%", "--sidebar-border": "210 60% 32%", "--sidebar-ring": "210 70% 55%",
    },
  },
  {
    id: "purple", label: "Royal Purple", swatch: "hsl(265 55% 45%)",
    vars: {
      "--primary": "265 55% 45%", "--ring": "265 55% 45%", "--accent": "265 55% 55%",
      "--secondary": "265 50% 94%", "--secondary-foreground": "265 60% 32%",
      "--sidebar-background": "265 50% 22%", "--sidebar-primary": "265 60% 60%",
      "--sidebar-accent": "265 50% 30%", "--sidebar-border": "265 45% 32%", "--sidebar-ring": "265 60% 60%",
    },
  },
  {
    id: "rose", label: "Rose Pink", swatch: "hsl(340 65% 48%)",
    vars: {
      "--primary": "340 65% 48%", "--ring": "340 65% 48%", "--accent": "340 65% 55%",
      "--secondary": "340 55% 95%", "--secondary-foreground": "340 65% 35%",
      "--sidebar-background": "340 55% 24%", "--sidebar-primary": "340 70% 60%",
      "--sidebar-accent": "340 55% 32%", "--sidebar-border": "340 45% 34%", "--sidebar-ring": "340 70% 60%",
    },
  },
  {
    id: "amber", label: "Sunset Amber", swatch: "hsl(28 85% 48%)",
    vars: {
      "--primary": "28 85% 45%", "--ring": "28 85% 45%", "--accent": "28 85% 55%",
      "--secondary": "28 70% 94%", "--secondary-foreground": "28 80% 32%",
      "--sidebar-background": "22 55% 22%", "--sidebar-primary": "28 85% 58%",
      "--sidebar-accent": "22 55% 30%", "--sidebar-border": "22 45% 32%", "--sidebar-ring": "28 85% 58%",
    },
  },
  {
    id: "slate", label: "Graphite Slate", swatch: "hsl(215 20% 30%)",
    vars: {
      "--primary": "215 25% 28%", "--ring": "215 25% 28%", "--accent": "215 25% 40%",
      "--secondary": "215 20% 94%", "--secondary-foreground": "215 25% 25%",
      "--sidebar-background": "215 25% 18%", "--sidebar-primary": "215 25% 55%",
      "--sidebar-accent": "215 25% 26%", "--sidebar-border": "215 20% 30%", "--sidebar-ring": "215 25% 55%",
    },
  },
];

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  fontStyle: string;
  setFontStyle: (v: string) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  colorTheme: ColorTheme;
  setColorTheme: (v: ColorTheme) => void;
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
  colorTheme: "emerald",
  setColorTheme: () => {},
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
  poppins: "'Poppins', sans-serif",
  roboto: "'Roboto', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  nunito: "'Nunito', sans-serif",
  lora: "'Lora', serif",
  playfair: "'Playfair Display', serif",
  merriweather: "'Merriweather', serif",
  mono: "'JetBrains Mono', monospace",
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("fontSize") || "medium");
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem("fontStyle") || "inter");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("language") as Language) || "en");
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => (localStorage.getItem("colorTheme") as ColorTheme) || "emerald");

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
    const fontVal = FONT_STYLE_MAP[fontStyle] || FONT_STYLE_MAP.inter;
    document.documentElement.style.setProperty("--font-body", fontVal);
    document.documentElement.style.setProperty("--font-heading", fontVal);
    localStorage.setItem("fontStyle", fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    const theme = COLOR_THEMES.find((th) => th.id === colorTheme) || COLOR_THEMES[0];
    Object.entries(theme.vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    localStorage.setItem("colorTheme", colorTheme);
  }, [colorTheme]);

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
