import React from 'react';

/**
 * Lucide-compatible Philippine Peso (₱) SVG Icon
 * Renders the official ₱ symbol with standard Lucide stroke, viewBox, and sizing.
 */
export function PesoSign({ className = 'w-4 h-4', size, strokeWidth = 2, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size || undefined}
      height={size || undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Letter P */}
      <path d="M7 20V4h7a5 5 0 0 1 0 10H7" />
      {/* Philippine Peso Crossbars */}
      <path d="M4.5 8.5h11" />
      <path d="M4.5 12.5h11" />
    </svg>
  );
}

export default PesoSign;
