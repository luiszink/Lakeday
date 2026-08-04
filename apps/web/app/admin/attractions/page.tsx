import { notFound } from 'next/navigation';

import { requireRole } from '../../../src/auth/admin-guard';
import { listAttractions } from '../../../src/admin/attractions/repository';
import { AttractionList } from '../_components/attraction-list';

export const runtime = 'nodejs';

export default async function AdminAttractionsPage() {
  if (!(await requireRole('EDITOR'))) notFound();
  const items = await listAttractions({});
  return (
    <AttractionList
      initialItems={items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))}
    />
  );
}
