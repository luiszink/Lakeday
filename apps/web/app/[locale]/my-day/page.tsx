import { getTranslations } from 'next-intl/server';

import { PlanExperience } from '../../../src/components/plan/plan-experience';

export default async function MyDayPage() {
  const translate = await getTranslations('screens.myDay');

  return (
    <main className="min-h-[calc(100vh-73px)] bg-slate-950 px-5 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">{translate('eyebrow')}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{translate('title')}</h1>
        <p className="mt-3 max-w-2xl text-slate-400">{translate('description')}</p>
        <div className="mt-10"><PlanExperience /></div>
      </div>
    </main>
  );
}
