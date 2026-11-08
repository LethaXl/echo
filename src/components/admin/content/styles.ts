const SMALL_BASE =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 max-md:h-11";

/** Compact buttons for content rows, where full-size buttons would crowd the list. */
export const SMALL_BUTTON = `${SMALL_BASE} border border-line text-foreground hover:border-muted/40 hover:bg-elevated`;
export const SMALL_PRIMARY_BUTTON = `${SMALL_BASE} bg-accent text-on-accent hover:bg-accent-hover`;

export const PANEL = "rounded-xl border border-line bg-surface";

export const ERROR_NOTE =
  "rounded-xl border border-danger/30 bg-danger/10 px-6 py-5 text-center text-sm text-danger max-md:px-4 max-md:py-4 max-md:[overflow-wrap:anywhere]";

export const EMPTY_NOTE = `${PANEL} px-6 py-10 text-center text-sm text-muted max-md:px-4 max-md:py-6 max-md:[overflow-wrap:anywhere]`;
