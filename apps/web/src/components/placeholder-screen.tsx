import type { ReactNode } from 'react';

type PlaceholderScreenProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}>;

export function PlaceholderScreen({ eyebrow, title, description, children }: PlaceholderScreenProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-start px-5 py-12 sm:px-6 md:py-16">
      <section className="max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">{eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="text-lg leading-8 text-slate-300">{description}</p>
        {children}
      </section>
    </main>
  );
}
