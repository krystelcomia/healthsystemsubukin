import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";

export type { Language };

export type ColorTheme = "emerald" | "ocean" | "purple" | "rose" | "maroon" | "amber" | "slate";

export const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string; vars: Record<string, string> }[] = [
  {
    id: "emerald", label: "Emerald Green", swatch: "hsl(123 38% 46%)",
    vars: {
      "--primary": "123 38% 46%", "--ring": "123 38% 46%", "--accent": "123 38% 54%",
      "--secondary": "123 30% 93%", "--secondary-foreground": "123 50% 32%",
      "--sidebar-background": "123 35% 32%", "--sidebar-primary": "123 38% 62%",
      "--sidebar-accent": "123 35% 42%", "--sidebar-border": "123 30% 42%", "--sidebar-ring": "123 38% 62%",
    },
  },
  {
    id: "ocean", label: "Ocean Blue", swatch: "hsl(210 58% 52%)",
    vars: {
      "--primary": "210 58% 52%", "--ring": "210 58% 52%", "--accent": "210 58% 60%",
      "--secondary": "210 45% 93%", "--secondary-foreground": "210 60% 34%",
      "--sidebar-background": "210 50% 30%", "--sidebar-primary": "210 58% 66%",
      "--sidebar-accent": "210 50% 40%", "--sidebar-border": "210 45% 40%", "--sidebar-ring": "210 58% 66%",
    },
  },
  {
    id: "purple", label: "Royal Purple", swatch: "hsl(265 45% 54%)",
    vars: {
      "--primary": "265 45% 54%", "--ring": "265 45% 54%", "--accent": "265 45% 62%",
      "--secondary": "265 35% 94%", "--secondary-foreground": "265 50% 36%",
      "--sidebar-background": "265 40% 30%", "--sidebar-primary": "265 50% 68%",
      "--sidebar-accent": "265 40% 40%", "--sidebar-border": "265 35% 40%", "--sidebar-ring": "265 50% 68%",
    },
  },
  {
    id: "rose", label: "Rose Pink", swatch: "hsl(340 55% 56%)",
    vars: {
      "--primary": "340 55% 56%", "--ring": "340 55% 56%", "--accent": "340 55% 64%",
      "--secondary": "340 40% 95%", "--secondary-foreground": "340 55% 38%",
      "--sidebar-background": "340 45% 32%", "--sidebar-primary": "340 60% 68%",
      "--sidebar-accent": "340 45% 42%", "--sidebar-border": "340 36% 42%", "--sidebar-ring": "340 60% 68%",
    },
  },
  {
    id: "maroon", label: "Barangay Maroon", swatch: "hsl(345 60% 38%)",
    vars: {
      "--primary": "345 60% 38%", "--ring": "345 60% 38%", "--accent": "345 60% 48%",
      "--secondary": "345 30% 94%", "--secondary-foreground": "345 55% 30%",
      "--sidebar-background": "345 58% 26%", "--sidebar-primary": "345 60% 55%",
      "--sidebar-accent": "345 58% 34%", "--sidebar-border": "345 32% 34%", "--sidebar-ring": "345 60% 55%",
    },
  },
  {
    id: "amber", label: "Sunset Amber", swatch: "hsl(32 80% 52%)",
    vars: {
      "--primary": "32 75% 52%", "--ring": "32 75% 52%", "--accent": "32 75% 62%",
      "--secondary": "32 55% 94%", "--secondary-foreground": "32 65% 36%",
      "--sidebar-background": "26 45% 30%", "--sidebar-primary": "32 75% 65%",
      "--sidebar-accent": "26 45% 40%", "--sidebar-border": "26 38% 40%", "--sidebar-ring": "32 75% 65%",
    },
  },
  {
    id: "slate", label: "Graphite Slate", swatch: "hsl(215 20% 40%)",
    vars: {
      "--primary": "215 22% 40%", "--ring": "215 22% 40%", "--accent": "215 22% 50%",
      "--secondary": "215 18% 94%", "--secondary-foreground": "215 22% 28%",
      "--sidebar-background": "215 22% 26%", "--sidebar-primary": "215 22% 62%",
      "--sidebar-accent": "215 22% 34%", "--sidebar-border": "215 18% 36%", "--sidebar-ring": "215 22% 62%",
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
  language: "tl",
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
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    if (saved === "en" || saved === "tl") return saved;
    try {
      localStorage.setItem("language", "tl");
    } catch {}
    return "tl";
  });
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => (localStorage.getItem("colorTheme") as ColorTheme) || "emerald");

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["tl"]?.[key] || translations["en"]?.[key] || key;
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
    // Also apply directly to body so all elements inherit the font change immediately
    document.body.style.fontFamily = fontVal;
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
