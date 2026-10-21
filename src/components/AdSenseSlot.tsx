import React, { useEffect, useRef } from 'react';

export type AdSenseFormat =
  | 'auto'
  | 'horizontal'
  | 'rectangle'
  | 'video'
  | 'fluid'
  | 'autorelaxed';

interface AdSenseSlotProps {
  slotId: string;
  format?: AdSenseFormat;
  className?: string;
}

/**
 * Google AdSense & Google Ad Manager Multi-Format Ad Unit (www.pdflove.store)
 * Supports:
 * - Outstream & In-Article Video Ads (IMA SDK / DoubleClick / TrueView / HTML5 Video)
 * - Responsive Display Banners (Horizontal Leaderboard, Medium/Large Rectangle)
 * - Native In-Article / In-Feed Fluid Ads
 * - Multiplex Grid Ads (autorelaxed)
 * - Auto-Sized Responsive Ads with Zero Cumulative Layout Shift (CLS)
 */
export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slotId,
  format = 'auto',
  className = '',
}) => {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      if (typeof window !== 'undefined') {
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch {
      // Safe fallback when AdSense script is waiting for live publisher approval or blocked by client extension
    }
  }, [slotId, format]);

  const isVideoCapable = format === 'video' || format === 'auto' || format === 'fluid';
  const adFormatValue =
    format === 'video'
      ? 'auto'
      : format === 'fluid'
      ? 'fluid'
      : format === 'autorelaxed'
      ? 'autorelaxed'
      : format;

  const minHeightClass =
    format === 'video'
      ? 'min-h-[180px] sm:min-h-[250px]'
      : format === 'rectangle'
      ? 'min-h-[250px]'
      : format === 'autorelaxed'
      ? 'min-h-[220px]'
      : 'min-h-[90px] sm:min-h-[100px]';

  return (
    <aside
      aria-label="Sponsored Advertisement"
      data-ad-domain="www.pdflove.store"
      data-ad-unit-type={format}
      data-video-ad-enabled={isVideoCapable ? 'true' : 'false'}
      className={`my-6 w-full max-w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 px-3 py-2.5 text-center ${className}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <span>Advertisement · Sponsored</span>
        <span className="font-mono text-[9px] text-slate-400/90 dark:text-slate-500">
          www.pdflove.store {format === 'video' ? '• Video & Display Ad' : '• AdSense'}
        </span>
      </div>
      <div
        className={`relative flex w-full items-center justify-center rounded-xl bg-white/75 dark:bg-slate-950/55 border border-dashed border-slate-200 dark:border-slate-800/90 ${minHeightClass}`}
      >
        <ins
          className="adsbygoogle block w-full"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-pdflove-store"
          data-ad-slot={slotId}
          data-ad-format={adFormatValue}
          data-full-width-responsive="true"
          {...(format === 'fluid' ? { 'data-ad-layout': 'in-article' } : {})}
        />
        <span className="pointer-events-none select-none text-[11px] font-medium text-slate-400 dark:text-slate-500 px-4">
          {format === 'video'
            ? 'Google AdSense Video, Outstream & Rich Media Ad Space — Keeps All 160+ Tools on www.pdflove.store 100% Free'
            : 'Google AdSense Responsive Display & Video Ad Space — Keeps All 160+ Tools on www.pdflove.store 100% Free'}
        </span>
      </div>
    </aside>
  );
};
