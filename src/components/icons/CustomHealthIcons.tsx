import React from "react";

export interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * Custom Dengue Mosquito Icon
 * Depicts an Aedes mosquito with slender striped/segmented body, needle proboscis,
 * wings, and long jointed legs.
 */
export const MosquitoIcon: React.FC<CustomIconProps> = ({
  size = 24,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Proboscis (long needle feeding tube) */}
      <line x1="12" y1="2" x2="12" y2="6" />
      {/* Antennae */}
      <path d="M9.5 4.5 12 6.5l2.5-2" />
      {/* Head */}
      <circle cx="12" cy="7.5" r="1.25" fill="currentColor" fillOpacity="0.2" />
      {/* Thorax */}
      <path d="M10.5 9.5a1.5 2 0 0 1 3 0v2.5a1.5 2 0 0 1-3 0z" />
      {/* Slender Abdomen */}
      <path d="M11 14.5c0 2.5.5 5.5 1 7.5.5-2 1-5 1-7.5" />
      <line x1="11.2" y1="17" x2="12.8" y2="17" />
      <line x1="11.5" y1="19.5" x2="12.5" y2="19.5" />
      {/* Delicate Angled Wings */}
      <path d="M10.5 10.5C7.5 7.5 4 8.5 5 12.5c.8 3.2 4.5 1.5 5.5-.5" />
      <path d="M13.5 10.5c3-3 6.5-2 5.5 2-.8 3.2-4.5 1.5-5.5-.5" />
      {/* Long Jointed Mosquito Legs */}
      {/* Front legs */}
      <path d="M9.5 9 5.5 6 3 7.5" />
      <path d="M14.5 9l4-3 2.5 1.5" />
      {/* Middle legs */}
      <path d="M9.5 11.5 4.5 12 2.5 15" />
      <path d="M14.5 11.5l5 .5 2 3" />
      {/* Hind long legs */}
      <path d="M10.5 13.5 6 16.5 4.5 20.5" />
      <path d="M13.5 13.5l4.5 3 1.5 4" />
    </svg>
  );
};

/**
 * Custom Maternal Care Icon (Pregnant Woman / Expectant Mother)
 * Depicts a pregnant woman in profile with a visible baby bump and hands gently cradling her belly.
 */
export const PregnantWomanIcon: React.FC<CustomIconProps> = ({
  size = 24,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Mother's Head */}
      <circle cx="9.5" cy="4.5" r="2.25" />
      {/* Hair curve */}
      <path d="M7.5 5c-.5 2 0 4 1 5" />
      {/* Mother's back line curving down to base */}
      <path d="M8 8.5c-.5 3-1 7.5-.5 12.5" />
      {/* Upper chest and pronounced pregnant belly */}
      <path d="M10 8.5c1.5 1 2 2.2 1 3.5 2.8.6 5 2.8 5 5.5 0 2.8-2.2 4.5-5.5 4.5" />
      {/* Caring arm/hands gently cradling the baby bump */}
      <path d="M10.5 12.5c1.8.8 2.5 2.2 2 3.5-.6 1.4-1.8 1.8-3.5 1.8" />
      {/* Ground/stand accent */}
      <path d="M6.5 21.5h6" />
    </svg>
  );
};

/**
 * Custom Family Planning Icon (Married Couple - Husband & Wife)
 * Depicts a man and a woman demonstrating that they are a married couple.
 */
export const FamilyPlanningIcon: React.FC<CustomIconProps> = ({
  size = 24,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Husband / Man (Left) */}
      <circle cx="7.5" cy="7.5" r="2.5" />
      <path d="M3.5 21v-2.5a3.5 3.5 0 0 1 3.5-3.5h1a3.5 3.5 0 0 1 3.5 3.5V21" />

      {/* Wife / Woman (Right) with hair silhouette & dress */}
      <circle cx="16.5" cy="7.5" r="2.5" />
      <path d="M14 8c0 2 1 3.2 2.5 3.2s2.5-1.2 2.5-3.2" />
      <path d="M12.5 21l1.2-5.5a2.8 2.8 0 0 1 2.8-2h0a2.8 2.8 0 0 1 2.8 2L20.5 21" />

      {/* Married Couple Union (Heart symbol between the couple) */}
      <path d="M12 2.8c-.4-.5-1-.5-1.4 0-.3.4-.3 1 0 1.4L12 5.5l1.4-1.3c.3-.4.3-1 0-1.4-.4-.5-1-.5-1.4 0z" fill="currentColor" fillOpacity="0.3" />

      {/* Holding hands connection */}
      <path d="M9.5 17.5h5" />
    </svg>
  );
};

