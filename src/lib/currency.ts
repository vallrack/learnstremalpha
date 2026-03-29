
/**
 * Utility for currency handling in LearnStream
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'COP', symbol: '$', name: 'Peso Colombiano', locale: 'es-CO' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense', locale: 'en-US' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano', locale: 'es-MX' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', locale: 'pt-BR' },
];

/**
 * Formats a number as a currency string
 */
export function formatPrice(amount: number, currencyCode: string = 'COP'): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'COP' ? 0 : 2,
      maximumFractionDigits: currency.code === 'COP' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback simple formatting
    return `${currency.symbol}${amount.toLocaleString()} ${currency.code}`;
  }
}

/**
 * Gets the currency object by code
 */
export function getCurrency(code: string) {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}
