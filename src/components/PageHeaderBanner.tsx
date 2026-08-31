import React, { ReactNode } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { getThemeStyle } from "@/lib/themeStyles";
import { LucideIcon } from "lucide-react";

interface PageHeaderBannerProps {
  icon?: LucideIcon;
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}

export const PageHeaderBanner: React.FC<PageHeaderBannerProps> = ({
  icon: Icon,
  badge,
  title,
  description,
  rightContent,
  className = "",
}) => {
  const { colorTheme } = useSettings();
  const currentStyle = getThemeStyle(colorTheme);

  return (
    <div
      className={`no-print relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentStyle.heroGradient} p-5 md:p-7 text-white shadow-xl border ${currentStyle.heroBorder} flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${className}`}
    >
      <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-start sm:items-center gap-4 max-w-2xl">
        {Icon && (
          <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-1">
          {badge && (
            <div className="flex items-center gap-2 mb-1">
              {typeof badge === "string" ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${currentStyle.badgeStyle}`}
                >
                  {badge}
                </div>
              ) : (
                badge
              )}
            </div>
          )}
          <h1 className="text-xl md:text-2xl lg:text-3xl font-heading font-extrabold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          {description && (
            <p className="text-xs md:text-sm text-white/80 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>

      {rightContent && (
        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
          {rightContent}
        </div>
      )}
    </div>
  );
};

export default PageHeaderBanner;
