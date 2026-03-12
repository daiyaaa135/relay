'use client';

import React from 'react';

export type CameraOverlayProps = {
  /** Current step label, e.g. "Capture front" */
  stepLabel: string;
  /** Bounding box width as percentage of viewport (0–100) */
  boundingBoxWidthPercent: number;
  /** Bounding box height as percentage of viewport (0–100) */
  boundingBoxHeightPercent: number;
  /** Optional: step index and total for progress (e.g. "2 / 4") */
  stepIndex?: number;
  stepTotal?: number;
  /** Border color class (e.g. border-primary) */
  borderColorClass?: string;
};

/**
 * Overlay rendered on top of a live camera feed.
 * Shows a single bounding box as a visual guide (not a crop).
 * Camera feed remains fully visible; box is for framing only.
 */
export function CameraOverlay({
  stepLabel,
  boundingBoxWidthPercent,
  boundingBoxHeightPercent,
  stepIndex,
  stepTotal,
  borderColorClass = 'border-primary',
}: CameraOverlayProps) {
  const widthPct = Math.min(100, Math.max(10, boundingBoxWidthPercent));
  const heightPct = Math.min(100, Math.max(10, boundingBoxHeightPercent));

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'transparent' }}
      aria-hidden
    >
      {/* Centered bounding box: visual guide only; no crop, feed stays fully visible */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 ${borderColorClass} rounded-lg bg-transparent`}
        style={{
          width: `${widthPct}vw`,
          height: `${heightPct}vh`,
          boxSizing: 'border-box',
        }}
      />
      {/* Step label at top */}
      <div className="absolute left-0 right-0 top-6 px-4 flex flex-col items-center gap-1">
        <span className="text-white text-sm font-bold tracking-widest drop-shadow-md text-center">
          {stepLabel}
        </span>
        {stepIndex != null && stepTotal != null && (
          <span className="text-white/80 text-[10px] font-bold tracking-widest">
            {stepIndex + 1} / {stepTotal}
          </span>
        )}
      </div>
    </div>
  );
}
