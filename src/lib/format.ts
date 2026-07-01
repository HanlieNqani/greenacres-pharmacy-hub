export const formatZAR = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(Number(n ?? 0));

export const formatNumber = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA").format(Number(n ?? 0));

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
};
