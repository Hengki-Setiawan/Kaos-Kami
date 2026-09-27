"use client";

import React from "react";
import type { ApparelType } from "@/lib/constants";

interface ApparelIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/** 1. T-Shirt Icon — Lucide Shirt (Standard crewneck tee) */
export function TShirtIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}

/** 2. Longsleeve Icon — Streetwear Long Sleeve Tee with Cuffs */
export function LongsleeveIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M16 2a4 4 0 0 1-8 0" />
      <path d="M8 2L3.5 3.5a2 2 0 0 0-1.4 1.9l-.6 12a1 1 0 0 0 1 1.1h2.5a1 1 0 0 0 1-.8L7 9.5H6v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5h-1l1 8.2a1 1 0 0 0 1 .8h2.5a1 1 0 0 0 1-1.1l-.6-12a2 2 0 0 0-1.4-1.9L16 2" />
      <line x1="2" y1="15.5" x2="5" y2="15.5" />
      <line x1="19" y1="15.5" x2="22" y2="15.5" />
    </svg>
  );
}

/** 3. Sweater Icon — Crewneck Sweatshirt with Ribbed Collar & Waistband */
export function SweaterIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M16 3a4 4 0 0 1-8 0" />
      <path d="M9.5 4.5a2.5 2.5 0 0 0 5 0" />
      <path d="M8 3L3.5 4.5a2 2 0 0 0-1.4 1.9l-.6 11.5a1 1 0 0 0 1 1.1h2.5a1 1 0 0 0 1-.8L7 10H6v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10h-1l1 8.2a1 1 0 0 0 1 .8h2.5a1 1 0 0 0 1-1.1l-.6-11.5a2 2 0 0 0-1.4-1.9L16 3" />
      <line x1="6" y1="18.5" x2="18" y2="18.5" />
    </svg>
  );
}

/** 4. Hoodie Icon — Streetwear Hoodie with Rounded Draped Hood, Drawstrings & Kangaroo Pocket */
export function HoodieIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M7 6.5C7 3.5 9.2 1.5 12 1.5s5 2 5 5" />
      <path d="M9 6.5l3 3.5l3-3.5" />
      <line x1="11" y1="10" x2="11" y2="13" />
      <line x1="13" y1="10" x2="13" y2="13" />
      <path d="M7 6.5L3 8a1.5 1.5 0 0 0-1 1.4l-.5 8.5a1 1 0 0 0 1 1.1h2.5a1 1 0 0 0 1-.8L7 10.5H6v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-1l1 7.7a1 1 0 0 0 1 .8h2.5a1 1 0 0 0 1-1.1l-.5-8.5a1.5 1.5 0 0 0-1-1.4L17 6.5" />
      <path d="M8.5 19.5v-2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/** 5. Jacket Icon — Streetwear Zip Coach Jacket with Lapels & Slanted Pockets */
export function JacketIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M7 3.5l5 3l5-3" />
      <path d="M7 3.5h10" />
      <path d="M7 3.5L3 5a1.5 1.5 0 0 0-1 1.4l-.5 11.5a1 1 0 0 0 1 1.1h2.5a1 1 0 0 0 1-.8L7 10.5H6v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-1l1 7.7a1 1 0 0 0 1 .8h2.5a1 1 0 0 0 1-1.1l-.5-11.5a1.5 1.5 0 0 0-1-1.4L17 3.5" />
      <line x1="12" y1="6.5" x2="12" y2="19.5" />
      <line x1="8" y1="14" x2="10" y2="16" />
      <line x1="16" y1="14" x2="14" y2="16" />
    </svg>
  );
}

/** 6. Baseball Cap Icon — Classic 3/4 Profile Dad Cap with Curved Bill & Button */
export function CapIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <path d="M4.5 14C4.5 9 7.2 5.5 12 5.5c4 0 6.5 2.5 7.5 7" />
      <path d="M14 12c2 0 5 .5 7.8 2.2c.4.3.2.9-.3 1.1c-3.5 1.2-7 .9-10.5.2" />
      <path d="M4.5 14c0 1 1.5 1.8 3.5 1.8h3" />
      <circle cx="12" cy="4.8" r="0.8" fill="currentColor" />
      <path d="M12 5.5c-.5 2.5-.5 5.5 0 8.5" />
    </svg>
  );
}

/** 7. Pants / Trousers Icon — Tailored Streetwear Trousers with Waistband & Pockets */
export function PantsIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <rect x="4" y="3" width="16" height="3" rx="1" />
      <line x1="12" y1="6" x2="12" y2="9.5" />
      <path d="M4 8c2 0 3-1 3-2" />
      <path d="M20 8c-2 0-3-1-3-2" />
      <path d="M4 6v14a1 1 0 0 0 1 1h4.5a1 1 0 0 0 1-.9L12 12l1.5 8.1a1 1 0 0 0 1 .9H19a1 1 0 0 0 1-1V6" />
    </svg>
  );
}

/** 8. Shorts Icon — Streetwear Sweatshorts with Waistband, Drawstrings & Pockets */
export function ShortsIcon({ size = 20, className = "", ...props }: ApparelIconProps) {
  return (
    <svg
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
      <rect x="4" y="3" width="16" height="3" rx="1" />
      <line x1="11" y1="5.5" x2="11" y2="8" />
      <line x1="13" y1="5.5" x2="13" y2="8" />
      <line x1="5" y1="8" x2="7" y2="10" />
      <line x1="19" y1="8" x2="17" y2="10" />
      <path d="M4 6l.5 9.5a1 1 0 0 0 1 1h4.5a1 1 0 0 0 1-.8L12 12l1 3.7a1 1 0 0 0 1 .8h4.5a1 1 0 0 0 1-1L20 6" />
    </svg>
  );
}

/** Helper function: Mendapatkan komponen icon resmi untuk setiap jenis pakaian */
export function getApparelIcon(type: ApparelType) {
  switch (type) {
    case "tshirt":
      return TShirtIcon;
    case "longsleeve":
      return LongsleeveIcon;
    case "crewneck":
      return SweaterIcon;
    case "hoodie":
      return HoodieIcon;
    case "shirt":
      return JacketIcon;
    case "cap":
      return CapIcon;
    case "pants":
      return PantsIcon;
    case "shorts":
      return ShortsIcon;
    default:
      return TShirtIcon;
  }
}

