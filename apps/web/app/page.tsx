'use client';

import { useEffect } from 'react';

type SupportedLocale = 'de' | 'en';

function isSupportedLocale(value: string | null): value is SupportedLocale {
  return value === 'de' || value === 'en';
}

export default function HomePage() {
  useEffect(() => {
    const storedLocale = window.localStorage.getItem('bodensee-locale');
    const locale = isSupportedLocale(storedLocale)
      ? storedLocale
      : window.navigator.language.toLowerCase().startsWith('de')
        ? 'de'
        : 'en';

    window.location.replace(`/${locale}`);
  }, []);

  return null;
}