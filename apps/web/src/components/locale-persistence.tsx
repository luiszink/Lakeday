'use client';

import { useEffect } from 'react';

type LocalePersistenceProps = {
  locale: 'de' | 'en';
};

export function LocalePersistence({ locale }: LocalePersistenceProps) {
  useEffect(() => {
    window.localStorage.setItem('bodensee-locale', locale);
  }, [locale]);

  return null;
}
