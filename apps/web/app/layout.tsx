import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  description: 'Lake Constance discovery and day planning.',
  title: 'BodenseeGuide'
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get('x-locale') === 'de' ? 'de' : 'en';

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}