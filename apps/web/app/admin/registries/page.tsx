import { notFound } from 'next/navigation';

import { requireRole } from '../../../src/auth/admin-guard';
import { listLicences, listSources } from '../../../src/registries/repository';
import { RegistryManager } from '../_components/registries';

export const runtime = 'nodejs';

export default async function AdminRegistriesPage() {
  const session = await requireRole('EDITOR');
  if (!session) notFound();
  const [licences, sources] = await Promise.all([listLicences(), listSources()]);
  return (
    <RegistryManager
      canApproveSources={session.role === 'ADMIN'}
      initialLicences={licences}
      initialSources={sources}
    />
  );
}
