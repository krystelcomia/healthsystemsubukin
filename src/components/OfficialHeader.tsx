import React from "react";
import sanjuanLogo from "@/assets/sanjuan_logo.png";
import barangayLogo from "@/assets/barangay-logo.png";
import headerTextImg from "@/assets/header_text.png";

interface OfficialHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  showDoubleBorder?: boolean;
  logoHeight?: number | string;
}

export const OfficialHeader: React.FC<OfficialHeaderProps> = ({
  title,
  subtitle,
  className = "",
  showDoubleBorder = true,
  logoHeight = "80px",
}) => {
  const heightStyle = typeof logoHeight === "number" ? `${logoHeight}px` : logoHeight;

  return (
    <div
      className={`header-seal official-barangay-header w-full flex flex-col items-center justify-center text-center ${
        showDoubleBorder ? "border-b-[4px] border-double border-slate-900 pb-3 mb-4" : "pb-2 mb-3"
      } ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
        minWidth: "100%",
        boxSizing: "border-box",
        borderBottom: showDoubleBorder ? "4px double #000000" : "none",
        paddingBottom: showDoubleBorder ? "12px" : "8px",
        marginBottom: "16px",
      }}
    >
      <div
        className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 max-w-full"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          width: "100%",
        }}
      >
        <img
          src={sanjuanLogo}
          alt="San Juan Seal"
          className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply"
          style={{
            height: heightStyle,
            width: "auto",
            objectFit: "contain",
            mixBlendMode: "multiply",
          }}
        />
        <img
          src={headerTextImg}
          alt="Republika ng Pilipinas Lalawigan ng Batangas Munisipalidad ng San Juan Barangay Subukin"
          className="h-16 md:h-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply max-w-[65%] sm:max-w-none"
          style={{
            height: heightStyle,
            width: "auto",
            objectFit: "contain",
            mixBlendMode: "multiply",
          }}
        />
        <img
          src={barangayLogo}
          alt="Barangay Subukin Logo"
          className="h-16 w-16 md:h-20 md:w-20 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply"
          style={{
            height: heightStyle,
            width: "auto",
            objectFit: "contain",
            mixBlendMode: "multiply",
          }}
        />
      </div>

      {(title || subtitle) && (
        <div className="mt-2 text-center" style={{ marginTop: "8px", textAlign: "center" }}>
          {title && (
            <h2
              className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100"
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#000000",
                margin: "0",
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5"
              style={{
                fontSize: "11px",
                color: "#4b5563",
                marginTop: "2px",
                margin: "2px 0 0 0",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default OfficialHeader;
