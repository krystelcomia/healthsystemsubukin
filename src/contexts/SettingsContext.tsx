import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";

export type { Language };

export type ColorTheme = "emerald" | "ocean" | "purple" | "rose" | "maroon" | "amber" | "slate" | "mint" | "sky";

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
  {
    id: "mint", label: "Mint Breeze", swatch: "hsl(165 60% 48%)",
    vars: {
      "--primary": "165 60% 44%", "--ring": "165 60% 44%", "--accent": "165 60% 54%",
      "--secondary": "165 40% 94%", "--secondary-foreground": "165 60% 28%",
      "--sidebar-background": "165 48% 26%", "--sidebar-primary": "165 60% 64%",
      "--sidebar-accent": "165 48% 36%", "--sidebar-border": "165 35% 36%", "--sidebar-ring": "165 60% 64%",
    },
  },
  {
    id: "sky", label: "Sky Cyan", swatch: "hsl(198 85% 54%)",
    vars: {
      "--primary": "198 85% 50%", "--ring": "198 85% 50%", "--accent": "198 85% 60%",
      "--secondary": "198 50% 94%", "--secondary-foreground": "198 75% 30%",
      "--sidebar-background": "198 55% 26%", "--sidebar-primary": "198 85% 66%",
      "--sidebar-accent": "198 55% 36%", "--sidebar-border": "198 40% 36%", "--sidebar-ring": "198 85% 66%",
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

  const persistActiveUserSettings = (settings: {
    colorTheme?: ColorTheme;
    fontSize?: string;
    fontStyle?: string;
    darkMode?: boolean;
    language?: Language;
  }) => {
    try {
      const activeUserId = localStorage.getItem("bhw_active_user_id") || localStorage.getItem("active_user_id");
      const activeEmail = (localStorage.getItem("bhw_active_user_email") || "").toLowerCase().trim();

      let current: any = {};
      let raw: string | null = null;
      if (activeUserId) {
        raw = localStorage.getItem("bhw_settings_" + activeUserId);
        if (raw) current = JSON.parse(raw);
      } else if (activeEmail) {
        raw = localStorage.getItem("bhw_settings_" + activeEmail);
        if (raw) current = JSON.parse(raw);
      }

      const updated = {
        colorTheme: settings.colorTheme ?? current.colorTheme ?? colorTheme,
        fontSize: settings.fontSize ?? current.fontSize ?? fontSize,
        fontStyle: settings.fontStyle ?? current.fontStyle ?? fontStyle,
        darkMode: settings.darkMode !== undefined ? settings.darkMode : (current.darkMode ?? darkMode),
        language: settings.language ?? current.language ?? language,
      };

      const json = JSON.stringify(updated);
      if (raw === json) return; // Prevent duplicate DB writes if identical

      if (activeUserId) {
        localStorage.setItem("bhw_settings_" + activeUserId, json);
      }
      if (activeEmail) {
        localStorage.setItem("bhw_settings_" + activeEmail, json);
      }

      if (activeUserId) {
        (supabase.from as any)("profiles")
          .update({ settings: updated })
          .eq("user_id", activeUserId)
          .then(() => {})
          .catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to persist user settings:", e);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
    persistActiveUserSettings({ darkMode });
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] || "16px";
    localStorage.setItem("fontSize", fontSize);
    persistActiveUserSettings({ fontSize });
  }, [fontSize]);

  useEffect(() => {
    const fontVal = FONT_STYLE_MAP[fontStyle] || FONT_STYLE_MAP.inter;
    document.documentElement.style.setProperty("--font-body", fontVal);
    document.documentElement.style.setProperty("--font-heading", fontVal);
    // Also apply directly to body so all elements inherit the font change immediately
    document.body.style.fontFamily = fontVal;
    localStorage.setItem("fontStyle", fontStyle);
    persistActiveUserSettings({ fontStyle });
  }, [fontStyle]);

  useEffect(() => {
    localStorage.setItem("language", language);
    persistActiveUserSettings({ language });
  }, [language]);

  useEffect(() => {
    const theme = COLOR_THEMES.find((th) => th.id === colorTheme) || COLOR_THEMES[0];
    Object.entries(theme.vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    localStorage.setItem("colorTheme", colorTheme);
    persistActiveUserSettings({ colorTheme });
  }, [colorTheme]);

  // Restore user-specific settings upon sign in or user switch
  useEffect(() => {
    const restoreUserSettings = (detail?: { userId?: string; email?: string; settings?: any }) => {
      try {
        const uid = detail?.userId || localStorage.getItem("bhw_active_user_id");
        const email = (detail?.email || localStorage.getItem("bhw_active_user_email") || "").toLowerCase().trim();

        let saved: any = detail?.settings;
        if (!saved && uid) {
          const raw = localStorage.getItem("bhw_settings_" + uid);
          if (raw) saved = JSON.parse(raw);
        }
        if (!saved && email) {
          const raw = localStorage.getItem("bhw_settings_" + email);
          if (raw) saved = JSON.parse(raw);
        }

        if (saved) {
          if (saved.colorTheme && COLOR_THEMES.some((t) => t.id === saved.colorTheme)) {
            setColorTheme(saved.colorTheme);
          }
          if (saved.fontSize && FONT_SIZE_MAP[saved.fontSize]) {
            setFontSize(saved.fontSize);
          }
          if (saved.fontStyle && FONT_STYLE_MAP[saved.fontStyle]) {
            setFontStyle(saved.fontStyle);
          }
          if (saved.darkMode !== undefined) {
            setDarkMode(Boolean(saved.darkMode));
          }
          if (saved.language === "en" || saved.language === "tl") {
            setLanguage(saved.language);
          }
        }
      } catch (err) {
        console.warn("Error restoring user settings:", err);
      }
    };

    const handleSyncEvent = (e: any) => {
      restoreUserSettings(e?.detail);
    };

    const handleDbUpdate = (e: any) => {
      const db = e?.detail;
      const uid = localStorage.getItem("bhw_active_user_id");
      const email = (localStorage.getItem("bhw_active_user_email") || "").toLowerCase().trim();
      if (db?.profiles && Array.isArray(db.profiles)) {
        const p = db.profiles.find((x: any) => 
          (uid && (x.user_id === uid || x.id === uid)) ||
          (email && x.email && x.email.toLowerCase().trim() === email)
        );
        if (p?.settings) {
          restoreUserSettings({ userId: uid || undefined, email: email || undefined, settings: p.settings });
        }
      }
    };

    window.addEventListener("bhw-user-settings-sync", handleSyncEvent);
    window.addEventListener("bhw-db-updated", handleDbUpdate);
    restoreUserSettings();

    return () => {
      window.removeEventListener("bhw-user-settings-sync", handleSyncEvent);
      window.removeEventListener("bhw-db-updated", handleDbUpdate);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize, fontStyle, setFontStyle, language, setLanguage, colorTheme, setColorTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
