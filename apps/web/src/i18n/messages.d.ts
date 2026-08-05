import type de from '../../messages/de.json';

type Messages = typeof de;

declare global {
  interface IntlMessages extends Messages {}
}

export {};
