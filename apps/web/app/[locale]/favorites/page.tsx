import { getTranslations } from 'next-intl/server';

import { PlaceholderScreen } from '../../../src/components/placeholder-screen';

export default async function FavoritesPage() {
  const translate = await getTranslations('screens.favorites');

  return (
    <PlaceholderScreen
      description={translate('description')}
      eyebrow={translate('eyebrow')}
      title={translate('title')}
    />
  );
}
