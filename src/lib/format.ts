export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Doku";

export function baht(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
}
