import { notFound } from 'next/navigation';

import { AttractionDetailPage } from '../../../../src/components/detail/attraction-detail-page';
import { loadAttractionDetail } from '../../../../src/components/detail/load-attraction-detail';

type PageProps = Readonly<{
  params: Promise<{ locale: 'de' | 'en'; slug: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}>;

export const revalidate = 60;

export default async function EnglishAttractionPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  const { date } = await searchParams;
  const selectedDate = Array.isArray(date) ? date[0] : date;
  const detail = await loadAttractionDetail(locale, slug, selectedDate);
  if (!detail) notFound();
  return <AttractionDetailPage detail={detail} locale={locale} />;
}
