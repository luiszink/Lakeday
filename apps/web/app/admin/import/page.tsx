import { notFound } from 'next/navigation';

import { requireRole } from '../../../src/auth/admin-guard';
import { ImportManager } from './_components/import-manager';

export const runtime = 'nodejs';

export default async function AdminImportPage() {
  if (!(await requireRole('REVIEWER'))) notFound();
  return <ImportManager />;
}
