import React from 'react';
import { Box } from 'lucide-react';
import { type ApparelType } from '@/store/useMobileStudioStore';

/**
 * Sleek modern vector icon untuk kategori apparel mobile.
 * Merender SVG stroke 1.8px yang adaptif terhadap status aktif dan tema.
 */
export function ApparelVectorIcon({
  type,
  className = 'w-5 h-5',
}: {
  type: ApparelType;
  className?: string;
}) {
  switch (type) {
    case 'tshirt':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 3.5L2 8l4 2 2-3h8l2 3 4-2-4-4.5L15 2h-6L6 3.5z" />
          <path d="M8 5a4 4 0 0 0 8 0" />
          <path d="M6 10v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
        </svg>
      );
    case 'longsleeve':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 3.5L1 11l3 1.5 2-5.5h12l2 5.5 3-1.5-5-7.5L15 2h-6L6 3.5z" />
          <path d="M8 5a4 4 0 0 0 8 0" />
          <path d="M6 10v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
        </svg>
      );
    case 'crewneck':
    case 'sweater':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 4L1 11.5l3.5 1.5 2-6h11l2 6 3.5-1.5L18 4l-3-2H9L6 4z" />
          <path d="M8.5 4.5a3.5 3.5 0 0 0 7 0" />
          <path d="M6 11v9.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V11" />
          <line x1="6" y1="20" x2="18" y2="20" strokeWidth="2.2" />
        </svg>
      );
    case 'hoodie':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M9 2a3 3 0 0 0-3 3v2l-4 3.5 3 2 2-2.5V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10l2 2.5 3-2-4-3.5V5a3 3 0 0 0-3-3H9z" />
          <path d="M9 2v4a3 3 0 0 0 6 0V2" />
          <path d="M8 15h8v4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-4z" strokeDasharray="1 1" />
        </svg>
      );
    case 'shirt': // Coach Jacket / Windbreaker
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 4L2 9l3.5 2 1.5-4h10l1.5 4 3.5-2-4-5L15 2h-6L6 4z" />
          <path d="M7 7v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
          <line x1="12" y1="6" x2="12" y2="22" strokeDasharray="2 2" />
          <path d="M9 3l3 4 3-4" />
        </svg>
      );
    case 'cap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 14a8 8 0 0 1 16 0v2H4v-2z" />
          <path d="M4 16c-1.5 0-3 1-3 2.5S2.5 21 4 21h12c2 0 3-1.5 3-3v-2" />
          <circle cx="12" cy="6" r="1" />
        </svg>
      );
    case 'pants':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 2h14v3l-2 16a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1l-1-10-1 10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L3 5V2h2z" />
          <line x1="5" y1="5" x2="19" y2="5" />
          <line x1="12" y1="5" x2="12" y2="11" />
        </svg>
      );
    case 'shorts':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 4h14v2l-1 9a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1l-.5-4-.5 4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6V4z" />
          <line x1="5" y1="7" x2="19" y2="7" />
        </svg>
      );
    default:
      return <Box className={className} />;
  }
}
