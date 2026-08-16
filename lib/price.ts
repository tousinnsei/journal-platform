const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: "¥",
  CNY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KRW: "₩",
  HKD: "HK$",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  CHF: "CHF",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

export function formatPrice(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${amount.toLocaleString("en-US")}`;
}

export function formatPriceWithCurrency(amount: number, currency: string): string {
  return `${formatPrice(amount, currency)} ${currency.toUpperCase()}`;
}
