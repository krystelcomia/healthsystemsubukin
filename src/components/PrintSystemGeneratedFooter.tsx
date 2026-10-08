import React from "react";

interface PrintSystemGeneratedFooterProps {
  className?: string;
  extraText?: string;
}

/**
 * Printable footer placed at the end of the paper across all printable forms.
 * Specifications:
 * - Font: Times New Roman
 * - Size: 11-point (11pt)
 * - Style: Italic
 * - Content: "system generated"
 */
export const PrintSystemGeneratedFooter: React.FC<PrintSystemGeneratedFooterProps> = ({
  className = "",
  extraText,
}) => {
  return (
    <div
      className={`print-only print-system-generated w-full ${className}`}
      style={{
        display: "block",
        width: "100%",
        textAlign: "right",
        marginTop: "16px",
        paddingTop: "6px",
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "11pt",
        fontStyle: "italic",
        color: "#000000",
        pageBreakBefore: "avoid",
        breakBefore: "avoid",
      }}
    >
      system generated{extraText ? ` • ${extraText}` : ""}
    </div>
  );
};
