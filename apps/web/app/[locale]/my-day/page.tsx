import { getTranslations } from 'next-intl/server';

import { PlaceholderScreen } from '../../../src/components/placeholder-screen';

export default async function MyDayPage() {
  const translate = await getTranslations('screens.myDay');

  return (
    <PlaceholderScreen
      description={translate('description')}
      eyebrow={translate('eyebrow')}
      title={translate('title')}
    />
  );
}
