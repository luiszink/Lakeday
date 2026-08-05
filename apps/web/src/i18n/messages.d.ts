import type de from '../../messages/de.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof de;
  }
}
