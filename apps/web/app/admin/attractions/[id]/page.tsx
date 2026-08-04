import { notFound } from 'next/navigation';

import { requireRole } from '../../../../src/auth/admin-guard';
import { getAttractionEditor } from '../../../../src/admin/attractions/repository';
import { AttractionEditor } from '../../_components/attraction-editor';

export const runtime = 'nodejs';

type PageContext = { params: Promise<{ id: string }> };

export default async function EditAttractionPage({ params }: PageContext) {
  if (!(await requireRole('EDITOR'))) notFound();
  try {
    return (
      <AttractionEditor
        initialPayload={await getAttractionEditor((await params).id)}
        isNew={false}
      />
    );
  } catch {
    notFound();
  }
}
