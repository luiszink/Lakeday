import { getTranslations } from 'next-intl/server';

import { Link } from '../../../src/i18n/navigation';
import { PlaceholderScreen } from '../../../src/components/placeholder-screen';

export default async function MorePage() {
  const translate = await getTranslations('screens.more');

  return (
    <PlaceholderScreen
      description={translate('description')}
      eyebrow={translate('eyebrow')}
      title={translate('title')}
    >
      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-md border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          href="/licences"
        >
          {translate('licences')}
        </Link>
      </div>
    </PlaceholderScreen>
  );
}
