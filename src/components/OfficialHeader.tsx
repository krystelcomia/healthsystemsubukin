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
  logoHeight = "95px",
}) => {
  const heightStyle = typeof logoHeight === "number" ? `${logoHeight}px` : logoHeight;

  return (
    <div
      className={`official-header-wrapper w-full flex flex-col items-center justify-center text-center ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
        minWidth: "100%",
        boxSizing: "border-box",
        marginBottom: "8px",
      }}
    >
      {/* Actual Official Barangay Header Area (Logos & Official Subukin Letterhead) */}
      <header
        role="banner"
        className={`header-seal official-barangay-header w-full flex items-center justify-center text-center ${
          showDoubleBorder ? "border-b-[3.5px] border-double border-slate-900 pb-0.5 mb-1" : "pb-0 mb-1"
        }`}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
          minWidth: "100%",
          boxSizing: "border-box",
          borderBottom: showDoubleBorder ? "3.5px double #000000" : "none",
          paddingBottom: showDoubleBorder ? "2px" : "0px",
          marginBottom: "4px",
        }}
      >
        <div
          className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 max-w-full"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            width: "100%",
          }}
        >
          <img
            src={sanjuanLogo}
            alt="San Juan Seal"
            className="h-20 w-20 md:h-24 md:w-24 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply"
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
            className="h-20 md:h-24 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply max-w-[65%] sm:max-w-none"
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
            className="h-20 w-20 md:h-24 md:w-24 object-contain shrink-0 mix-blend-multiply dark:mix-blend-multiply"
            style={{
              height: heightStyle,
              width: "auto",
              objectFit: "contain",
              mixBlendMode: "multiply",
            }}
          />
        </div>
      </header>

      {/* Document Title & Subtitle - Outside & Below the Double Lines */}
      {(title || subtitle) && (
        <div
          className="document-title-section w-full text-center"
          style={{
            width: "100%",
            textAlign: "center",
            marginTop: "2px",
            marginBottom: "6px",
          }}
        >
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
                textAlign: "center",
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400"
              style={{
                fontSize: "11px",
                color: "#4b5563",
                marginTop: "2px",
                marginBottom: "0",
                textAlign: "center",
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
