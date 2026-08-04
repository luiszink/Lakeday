import { requireRole } from '../../../../src/auth/admin-guard';
import { AttractionEditor } from '../../_components/attraction-editor';
import { createEmptyAttractionEditorPayload } from '../../../../src/admin/attractions/defaults';

export const runtime = 'nodejs';

export default async function NewAttractionPage() {
  await requireRole('EDITOR');
  return <AttractionEditor initialPayload={createEmptyAttractionEditorPayload()} isNew />;
}
