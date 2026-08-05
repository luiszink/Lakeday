import type { Metadata } from 'next';

import { SharedPlanExperience } from '../../../../src/components/plan/shared-plan-experience';
import { getMapProviderSettings } from '../../../../src/providers/map/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default async function SharedPlanPage({
  params,
}: Readonly<{ params: Promise<{ locale: 'de' | 'en'; shareToken: string }> }>) {
  const { locale, shareToken } = await params;
  const providerSettings = getMapProviderSettings(process.env);

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-5 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <SharedPlanExperience
          locale={locale}
          mapProviderConfig={providerSettings.config}
          mapProviderKind={providerSettings.kind}
          shareToken={shareToken}
        />
      </div>
    </main>
  );
}
