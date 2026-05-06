export const formatBRL = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthRange = (date = new Date()) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: first.toISOString().slice(0, 10),
    end: last.toISOString().slice(0, 10),
  };
};

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
