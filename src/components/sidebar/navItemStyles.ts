// Shared sidebar row states. Solid theme tokens only: the sand/forest colors are
// CSS variables, so Tailwind opacity modifiers (e.g. bg-sand-200/50) emit no CSS.
export const NAV_ITEM_ACTIVE =
  'bg-[var(--bg-surface)] text-forest-700 font-semibold shadow-[inset_3px_0_0_var(--accent-color)]';

export const NAV_ITEM_IDLE = 'text-stone-600 hover:bg-sand-200 hover:text-stone-900';
