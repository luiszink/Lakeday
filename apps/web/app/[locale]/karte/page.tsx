import { redirect } from 'next/navigation';

export default async function GermanMapAlias({
  params,
}: Readonly<{ params: Promise<{ locale: 'de' | 'en' }> }>) {
  const { locale } = await params;
  redirect(`/${locale}/map`);
}
