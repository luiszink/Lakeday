export type SupportedLocale = 'de' | 'en';

const intlLocales: Record<SupportedLocale, string> = {
  de: 'de-DE',
  en: 'en-US',
};

function intlLocale(locale: SupportedLocale) {
  return intlLocales[locale];
}

export function formatCurrency(amount: number, currency: string, locale: SupportedLocale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    currency,
    style: 'currency',
  }).format(amount);
}

export function formatDate(value: Date | number | string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Berlin',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatTime(value: Date | number | string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
    hour12: false,
  }).format(new Date(value));
}

export function formatDistance(distanceMetres: number, locale: SupportedLocale) {
  if (distanceMetres < 1000) {
    return new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits: 0,
      style: 'unit',
      unit: 'meter',
      unitDisplay: 'short',
    }).format(distanceMetres);
  }

  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 1,
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
  }).format(distanceMetres / 1000);
}
