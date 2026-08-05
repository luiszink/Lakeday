import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  defaultLocale: 'de',
  localePrefix: 'always',
  locales: ['de', 'en'],
});
