// Backend money is integer paise. Format for display; the app never does paise math itself.
export function formatPaise(paise: number | null | undefined): string {
  const p = paise ?? 0;
  const rupees = p / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Whole-rupee number (for tiles that render their own ₹ prefix). */
export function paiseToRupees(paise: number | null | undefined): number {
  return Math.round((paise ?? 0) / 100);
}
