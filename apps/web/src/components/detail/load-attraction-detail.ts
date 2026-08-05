import { attractionDetailResponseSchema, type AttractionDetailResponse } from '@lake/domain';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function loadAttractionDetail(
  locale: 'de' | 'en',
  slug: string,
  date?: string,
): Promise<AttractionDetailResponse | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000');
  const endpoint = new URL(`/api/attractions/${encodeURIComponent(slug)}`, baseUrl);
  endpoint.searchParams.set('locale', locale);
  if (date) endpoint.searchParams.set('date', date);
  const response = await fetch(endpoint, {
    next: { revalidate: 60 },
    redirect: 'manual',
  });
  if (response.status === 301) {
    const location = response.headers.get('location');
    if (location) redirect(location);
  }
  if (!response.ok) return null;
  const parsed = attractionDetailResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}
