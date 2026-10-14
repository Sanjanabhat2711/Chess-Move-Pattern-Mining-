/** ChessIcon.jsx — inline SVG king piece icon */
import React from 'react';
export default function ChessIconSvg({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="url(#cg)" />
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#90caf9" />
          <stop offset="100%" stopColor="#ce93d8" />
        </linearGradient>
      </defs>
      {/* King crown shape */}
      <path d="M16 7v3M13 10l-2 4h10l-2-4M10 14h12v2H10z" stroke="#0a0e1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="16" width="12" height="2" rx="1" fill="#0a0e1a"/>
      <path d="M11 18h10l1 5H10l1-5z" fill="#0a0e1a"/>
    </svg>
  );
}
