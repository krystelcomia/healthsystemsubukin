export const THEME_STYLES: Record<string, {
  heroGradient: string;
  heroBorder: string;
  badgeStyle: string;
  btnStyle: string;
  accentText: string;
  chartColors: string[];
}> = {
  emerald: {
    heroGradient: "from-emerald-950 via-teal-900 to-slate-950",
    heroBorder: "border-emerald-700/40",
    badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    btnStyle: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold",
    accentText: "text-emerald-300",
    chartColors: ["#059669", "#0284c7", "#7c3aed", "#d97706", "#e11d48", "#2563eb", "#db2777"],
  },
  ocean: {
    heroGradient: "from-blue-950 via-sky-900 to-slate-950",
    heroBorder: "border-sky-700/40",
    badgeStyle: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    btnStyle: "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold",
    accentText: "text-sky-300",
    chartColors: ["#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb", "#db2777"],
  },
  purple: {
    heroGradient: "from-purple-950 via-indigo-900 to-slate-950",
    heroBorder: "border-purple-700/40",
    badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    btnStyle: "bg-purple-500 hover:bg-purple-400 text-white font-bold",
    accentText: "text-purple-300",
    chartColors: ["#7c3aed", "#0284c7", "#059669", "#d97706", "#e11d48", "#2563eb", "#db2777"],
  },
  rose: {
    heroGradient: "from-rose-950 via-pink-950 to-slate-950",
    heroBorder: "border-rose-700/40",
    badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    btnStyle: "bg-rose-500 hover:bg-rose-400 text-white font-bold",
    accentText: "text-rose-300",
    chartColors: ["#e11d48", "#db2777", "#7c3aed", "#0284c7", "#059669", "#d97706", "#2563eb"],
  },
  maroon: {
    heroGradient: "from-rose-950 via-red-950 to-slate-950",
    heroBorder: "border-rose-800/40",
    badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    btnStyle: "bg-rose-600 hover:bg-rose-500 text-white font-bold",
    accentText: "text-rose-300",
    chartColors: ["#be123c", "#e11d48", "#7c3aed", "#0284c7", "#059669", "#d97706", "#db2777"],
  },
  amber: {
    heroGradient: "from-amber-950 via-orange-950 to-slate-950",
    heroBorder: "border-amber-700/40",
    badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    btnStyle: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold",
    accentText: "text-amber-300",
    chartColors: ["#d97706", "#059669", "#0284c7", "#7c3aed", "#e11d48", "#2563eb", "#db2777"],
  },
  slate: {
    heroGradient: "from-slate-900 via-zinc-900 to-stone-950",
    heroBorder: "border-slate-700/40",
    badgeStyle: "bg-slate-500/20 text-slate-300 border-slate-400/30",
    btnStyle: "bg-slate-700 hover:bg-slate-600 text-white font-bold",
    accentText: "text-slate-300",
    chartColors: ["#475569", "#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb"],
  },
  mint: {
    heroGradient: "from-teal-950 via-emerald-900 to-slate-950",
    heroBorder: "border-teal-700/40",
    badgeStyle: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    btnStyle: "bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold",
    accentText: "text-teal-300",
    chartColors: ["#0d9488", "#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb"],
  },
  sky: {
    heroGradient: "from-sky-950 via-cyan-900 to-slate-950",
    heroBorder: "border-sky-600/40",
    badgeStyle: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    btnStyle: "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold",
    accentText: "text-sky-300",
    chartColors: ["#0284c7", "#06b6d4", "#059669", "#7c3aed", "#d97706", "#e11d48", "#2563eb"],
  },
};

export const getThemeStyle = (colorTheme?: string) => {
  return THEME_STYLES[colorTheme || "ocean"] || THEME_STYLES.ocean;
};
